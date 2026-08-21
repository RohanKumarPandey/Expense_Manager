const mockGenerateContent = jest.fn();

jest.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    })),
  };
});

const { parseExpenseText, parseExpenseLocally } = require("../src/services/aiService");

describe("aiService — Google Gemini Integration", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  test("valid Gemini JSON response parses successfully", async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            amount: 1200,
            description: "Dinner",
            category: "food",
            splitType: "equal",
            participantNames: ["Raj", "Priya"],
          }),
      },
    });

    const result = await parseExpenseText(
      "dinner for 1200 with Raj and Priya",
      ["Raj", "Priya", "Amit"],
      "Raj"
    );
    expect(result.success).toBe(true);
    expect(result.draft.amount).toBe(1200);
    expect(result.draft.description).toBe("Dinner");
    expect(result.draft.category).toBe("food");
    expect(result.draft.participantNames).toEqual(["Raj", "Priya"]);
  });

  test("Gemini response wrapped in markdown fences is parsed correctly", async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () =>
          '```json\n{"amount":500,"description":"Snacks","category":"food","splitType":"equal","participantNames":["Raj"]}\n```',
      },
    });

    const result = await parseExpenseText("snacks 500 raj", ["Raj"], "Raj");
    expect(result.success).toBe(true);
    expect(result.draft.amount).toBe(500);
    expect(result.draft.description).toBe("Snacks");
  });

  test("Gemini API error falls back cleanly to local rule-based parser", async () => {
    mockGenerateContent.mockRejectedValue(new Error("API Quota exceeded"));

    const result = await parseExpenseText("Dinner 1500 with Priya", ["Raj", "Priya"], "Raj");
    expect(result.success).toBe(true);
    expect(result.draft.amount).toBe(1500);
    expect(result.draft.category).toBe("food");
    expect(result.draft.participantNames).toEqual(expect.arrayContaining(["Priya", "Raj"]));
  });
});

describe("aiService — Local Rule-Based NLP Parser", () => {
  const memberNames = ["Rohan", "Rohan Kumar Pandey", "Amit", "Priya"];
  const currentUserName = "Rohan Kumar Pandey";

  describe("Hinglish and Roman Hindi Parsing", () => {
    test("User Test 1: Maine Rohan ke saath dinner par 600 rupaye kharch kiye, hum dono mein barabar baant do", () => {
      const result = parseExpenseLocally(
        "Maine Rohan ke saath dinner par 600 rupaye kharch kiye, hum dono mein barabar baant do.",
        ["Rohan", "Rohan Kumar Pandey"],
        "Rohan Kumar Pandey"
      );
      expect(result.success).toBe(true);
      expect(result.draft.amount).toBe(600);
      expect(result.draft.category).toBe("food");
      expect(result.draft.description).toBe("Dinner");
      expect(result.draft.splitType).toBe("equal");
      expect(result.draft.participantNames).toEqual(
        expect.arrayContaining(["Rohan", "Rohan Kumar Pandey"])
      );
      expect(result.draft.participantNames.length).toBe(2);
    });

    test("Participant reference: Rohan ke saath", () => {
      const result = parseExpenseLocally(
        "Rohan ke saath 400 rupaye ka lunch kiya",
        memberNames,
        currentUserName
      );
      expect(result.success).toBe(true);
      expect(result.draft.amount).toBe(400);
      expect(result.draft.category).toBe("food");
      expect(result.draft.description).toBe("Lunch");
      expect(result.draft.participantNames).toEqual(
        expect.arrayContaining(["Rohan", currentUserName])
      );
    });

    test("Participant reference: mere aur Rohan ke beech", () => {
      const result = parseExpenseLocally(
        "Mere aur Rohan ke beech 3000 ka wifi bill barabar split karo",
        memberNames,
        currentUserName
      );
      expect(result.success).toBe(true);
      expect(result.draft.amount).toBe(3000);
      expect(result.draft.category).toBe("utilities");
      expect(result.draft.description).toBe("WiFi Bill");
      expect(result.draft.participantNames).toEqual(
        expect.arrayContaining(["Rohan", currentUserName])
      );
      expect(result.draft.participantNames.length).toBe(2);
    });

    test("Participant reference: Rohan aur mere beech", () => {
      const result = parseExpenseLocally(
        "Rohan aur mere beech groceries ka 850 rupaye baant do",
        memberNames,
        currentUserName
      );
      expect(result.success).toBe(true);
      expect(result.draft.amount).toBe(850);
      expect(result.draft.category).toBe("groceries");
      expect(result.draft.description).toBe("Groceries");
      expect(result.draft.participantNames).toEqual(
        expect.arrayContaining(["Rohan", currentUserName])
      );
      expect(result.draft.participantNames.length).toBe(2);
    });

    test("Participant reference: sabke beech / sab log", () => {
      const result = parseExpenseLocally(
        "Bijli ka bill 2400 rupaye sabke beech barabar divide karo",
        memberNames,
        currentUserName
      );
      expect(result.success).toBe(true);
      expect(result.draft.amount).toBe(2400);
      expect(result.draft.category).toBe("utilities");
      expect(result.draft.description).toBe("Electricity Bill");
      expect(result.draft.participantNames).toEqual(expect.arrayContaining(memberNames));
    });
  });

  describe("English Natural Language Parsing", () => {
    test("I paid 1200 for dinner, split equally between Rohan and Rohan Kumar Pandey", () => {
      const result = parseExpenseLocally(
        "I paid 1200 for dinner, split equally between Rohan and Rohan Kumar Pandey",
        ["Rohan", "Rohan Kumar Pandey"],
        "Rohan Kumar Pandey"
      );
      expect(result.success).toBe(true);
      expect(result.draft.amount).toBe(1200);
      expect(result.draft.description).toBe("Dinner");
      expect(result.draft.category).toBe("food");
      expect(result.draft.participantNames).toEqual(
        expect.arrayContaining(["Rohan", "Rohan Kumar Pandey"])
      );
    });

    test("Paid ₹850 for groceries for everyone", () => {
      const result = parseExpenseLocally(
        "Paid ₹850 for groceries for everyone",
        memberNames,
        currentUserName
      );
      expect(result.success).toBe(true);
      expect(result.draft.amount).toBe(850);
      expect(result.draft.category).toBe("groceries");
      expect(result.draft.description).toBe("Groceries");
      expect(result.draft.participantNames).toEqual(memberNames);
    });

    test("Uber cab to airport 450 with Amit", () => {
      const result = parseExpenseLocally(
        "Uber cab to airport 450 with Amit",
        memberNames,
        currentUserName
      );
      expect(result.success).toBe(true);
      expect(result.draft.amount).toBe(450);
      expect(result.draft.category).toBe("travel");
      expect(result.draft.participantNames).toEqual(
        expect.arrayContaining(["Amit", currentUserName])
      );
      expect(result.draft.participantNames.length).toBe(2);
    });

    test("Flat rent 30000", () => {
      const result = parseExpenseLocally(
        "Flat rent 30000",
        memberNames,
        currentUserName
      );
      expect(result.success).toBe(true);
      expect(result.draft.amount).toBe(30000);
      expect(result.draft.category).toBe("rent");
      expect(result.draft.description).toBe("Rent");
    });
  });

  describe("Validation, Ambiguity & Gibberish Rejection", () => {
    test("Rejects gibberish containing numbers (meeting room 404)", () => {
      const result = parseExpenseLocally("Meeting room 404", memberNames, currentUserName);
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/not appear to describe an expense/i);
    });

    test("Rejects random text with phone number", () => {
      const result = parseExpenseLocally("Call me at 9876543210 tomorrow", memberNames, currentUserName);
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/not appear to describe an expense/i);
    });

    test("Rejects conflicting amounts (paid 500 or 1000)", () => {
      const result = parseExpenseLocally(
        "Paid 500 or 1000 for dinner",
        memberNames,
        currentUserName
      );
      expect(result.success).toBe(false);
      expect(result.reason).toMatch(/ambiguous or conflicting amounts/i);
    });

    test("Does not silently select unrelated members when specific subsets are named", () => {
      const result = parseExpenseLocally(
        "Dinner with Amit 600",
        memberNames,
        currentUserName
      );
      expect(result.success).toBe(true);
      expect(result.draft.participantNames).toContain("Amit");
      expect(result.draft.participantNames).toContain(currentUserName);
      expect(result.draft.participantNames).not.toContain("Priya");
    });
  });
});
