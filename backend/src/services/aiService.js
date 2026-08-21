const { GoogleGenerativeAI } = require("@google/generative-ai");
const { aiExpenseSchema } = require("../validators/aiValidator");

/**
 * Helper to extract a concise, clean summary description (e.g. "Dinner", "WiFi Bill", "Groceries")
 * from natural language expressions in English, Hindi, and Hinglish.
 */
const extractCleanDescription = (cleanText, category, memberNames = []) => {
  const text = cleanText;

  // 1. Topic Recognition: Check for specific domain keywords first
  const topicPatterns = [
    {
      regex: /\b(dinner|lunch|breakfast|nashta|khana|biryani|pizza|burger|coffee|tea|chai|snacks?|meal|sweets?|mithai)\b/i,
      title: (m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase(),
    },
    {
      regex: /\b(groceries|grocery|rashan|ration|supermarket|vegetables|sabzi|sabji|fruits|phal|milk|doodh|bread|eggs|ande)\b/i,
      title: () => "Groceries",
    },
    {
      regex: /\b(wifi(?:\s*bill)?|internet(?:\s*bill)?|broadband)\b/i,
      title: () => "WiFi Bill",
    },
    {
      regex: /\b(electricity(?:\s*bill)?|bijli(?:\s*bill)?|light\s*bill|power\s*bill)\b/i,
      title: () => "Electricity Bill",
    },
    {
      regex: /\b(gas(?:\s*cylinder)?|cylinder|water(?:\s*bill)?|paani\s*bill)\b/i,
      title: (m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase(),
    },
    {
      regex: /\b(flat\s*rent|room\s*rent|rent|kiraya)\b/i,
      title: () => "Rent",
    },
    {
      regex: /\b(uber(?:\s*cab)?|ola(?:\s*cab)?|cab(?:\s*to\s*airport)?|taxi|auto(?:\s*fare)?|metro(?:\s*fare)?|flight|train\s*ticket|petrol|fuel|diesel)\b/i,
      title: (m) =>
        m
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" "),
    },
  ];

  for (const item of topicPatterns) {
    const match = text.match(item.regex);
    if (match) {
      return item.title(match[0]);
    }
  }

  // 2. Generic Cleaning: Strip trailing clauses (split, between, sharing, etc.)
  let cleaned = text.replace(
    /(?:,|;|\.)?\s*\b(?:split(?:\s+equally)?|split\s+with|split\s+between|\bwith\b|\bbetween\b|\bamong\b|\bdivided\b|\bshared\b|\bfor\s+(?:everyone|all|flatmates|the\s+flat)|\bke\s*saath\b|\bke\s*beech\b|\bmein\s*barabar\b|\bbaant\s*do\b|\bbaant\s*lo\b|\bbaantna\b)\b.*$/i,
    ""
  );

  // 3. Extract clause after "for", "on", "par", "ka", "ki"
  const forMatch = cleaned.match(
    /(?:paid|spent|bought|got|added|kharch\s*kiye|kharch\s*kiya|diye|diya)\s+(?:for|on|par|ka|ki|ke\s*liye)\s+([a-zA-Z\s-]+)/i
  );
  if (forMatch && forMatch[1] && forMatch[1].trim().length > 1) {
    cleaned = forMatch[1];
  }

  // 4. Strip leading action verbs/pronouns in English and Hindi
  cleaned = cleaned.replace(
    /^(?:i|we|he|she|they|maine|humne|hum|apne)?\s*(?:paid|spent|bought|got|ordered|added|kharch\s*kiye|kharch\s*kiya|diye|diya)\s*(?:for|on|par|ka|ki|ke\s*liye)?\s*/i,
    ""
  );

  // 5. Strip numbers, currency words
  cleaned = cleaned.replace(
    /(?:₹|rs\.?|inr)?\s*\b\d+(?:\.\d{1,2})?\b\s*(?:rupaye|rupayee|rupees|rs|inr|bucks)?/gi,
    ""
  );

  // 6. Strip member names
  memberNames.forEach((name) => {
    if (name && name.trim().length > 0) {
      const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      cleaned = cleaned.replace(new RegExp(`\\b${escaped}\\b`, "gi"), "");
    }
  });

  // 7. Strip leftover prepositions & grammatical particles (English & Hindi)
  cleaned = cleaned.replace(
    /\b(for|on|with|and|of|the|a|an|split|equally|between|among|par|ka|ke|ki|mein|ko|se|aur|liye|saath|beech|ne)\b/gi,
    " "
  );

  // 8. Clean punctuation and whitespace
  cleaned = cleaned.replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim();

  // 9. Capitalize or fallback to category
  if (!cleaned || cleaned.length < 2) {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

/**
 * Intelligent local rule-based NLP parser.
 * Runs 100% offline with zero API keys or external costs, extracting
 * amounts, categories, clean descriptions, payers, and participant matching.
 */
const parseExpenseLocally = (text, memberNames = [], currentUserName = "") => {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return { success: false, reason: "Text is empty", rawText: text };
  }

  const cleanText = text.trim();
  const lower = cleanText.toLowerCase();

  // 1. Validate Expense Intent / Context
  const spendingVerbsRegex =
    /\b(paid|pay|spent|spend|kharch|diye|diya|de\s*diye|kharida|bought|buy|bhara|bhar\s*diya|bill|cost|price|rupaye|rupayee|rupees|rs|inr|₹|amount|expense|split|baant|baanto|baat|dono\s*mein|sabke\s*beech)\b/i;
  const explicitExpenseItemsRegex =
    /\b(dinner|lunch|breakfast|khana|nashta|food|groceries|grocery|rashan|ration|supermarket|blinkit|zepto|instamart|bigbasket|wifi|internet|broadband|electricity|bijli|light\s*bill|power\s*bill|water\s*bill|paani\s*bill|gas\s*cylinder|cylinder|rent|kiraya|flat\s*rent|room\s*rent|cab|uber|ola|auto|taxi|metro|bus\s*fare|train\s*ticket|flight|petrol|fuel|diesel|snacks|chai|tea|coffee|pizza|burger|biryani|party|recharge)\b/i;

  const hasExpenseContext =
    spendingVerbsRegex.test(lower) || explicitExpenseItemsRegex.test(lower);

  if (!hasExpenseContext) {
    return {
      success: false,
      reason: "Text does not appear to describe an expense",
      rawText: cleanText,
    };
  }

  // 2. Amount Extraction & Conflict Detection
  const explicitCurrencyMatches = [];
  const currencyRegex = /(?:₹|rs\.?|inr)\s*(\d+(?:\.\d{1,2})?)/gi;
  let m;
  while ((m = currencyRegex.exec(cleanText)) !== null) {
    explicitCurrencyMatches.push(parseFloat(m[1]));
  }

  const hindiCurrencyRegex = /(\d+(?:\.\d{1,2})?)\s*(?:rupaye|rupayee|rupees|rs|bucks|inr|₹)/gi;
  while ((m = hindiCurrencyRegex.exec(cleanText)) !== null) {
    explicitCurrencyMatches.push(parseFloat(m[1]));
  }

  // Find all numbers in text
  const allNumbersWithIndex = [];
  const numberRegex = /\b(\d+(?:\.\d{1,2})?)\b/g;
  while ((m = numberRegex.exec(cleanText)) !== null) {
    allNumbersWithIndex.push({ val: parseFloat(m[1]), index: m.index, match: m[0] });
  }

  if (allNumbersWithIndex.length === 0) {
    return {
      success: false,
      reason: "Could not identify an expense amount from text",
      rawText: cleanText,
    };
  }

  // Filter out non-amount numbers:
  // - Quantities before nouns (e.g. "2 pizzas", "3 people", "4 tickets")
  // - Unit / Identifier tags (e.g. "room 404", "flat 102", "table 5")
  // - Phone numbers (>= 10 digits)
  const potentialAmountCandidates = [];

  for (const num of allNumbersWithIndex) {
    if (num.val >= 1000000000) {
      continue;
    }

    const beforeSlice = cleanText.slice(Math.max(0, num.index - 15), num.index);
    const afterSlice = cleanText.slice(num.index + num.match.length, num.index + num.match.length + 20);

    const isQuantity = /^\s*(?:pizzas?|burgers?|people|persons?|members?|items?|tickets?|bottles?|plates?|beers?|cups?)\b/i.test(
      afterSlice
    );
    const isIdentifier = /\b(?:flat|room|table|apt|packet|shop)\s*#?\s*$/i.test(beforeSlice);

    if (!isQuantity && !isIdentifier) {
      potentialAmountCandidates.push(num.val);
    }
  }

  const uniqueCandidates = Array.from(
    new Set(
      explicitCurrencyMatches.length > 0
        ? explicitCurrencyMatches
        : potentialAmountCandidates
    )
  );

  // Check for ambiguous / conflicting amounts
  if (uniqueCandidates.length > 1) {
    return {
      success: false,
      reason: `Ambiguous or conflicting amounts found in text (${uniqueCandidates.join(", ")})`,
      rawText: cleanText,
    };
  }

  if (uniqueCandidates.length === 0 || uniqueCandidates[0] <= 0) {
    return {
      success: false,
      reason: "Could not identify an expense amount from text",
      rawText: cleanText,
    };
  }

  const amount = uniqueCandidates[0];

  // 3. Category Classification
  let category = "other";
  if (
    /\b(rent|kiraya|flat\s*rent|room\s*rent|apartment|brokerage|deposit|lease|maintenance)\b/i.test(
      lower
    )
  ) {
    category = "rent";
  } else if (
    /\b(grocery|groceries|rashan|ration|supermarket|mart|kirana|milk|doodh|veggies|vegetables|sabzi|sabji|fruits|phal|bread|eggs|ande|blinkit|zepto|instamart|bigbasket|dmart)\b/i.test(
      lower
    )
  ) {
    category = "groceries";
  } else if (
    /\b(wifi|internet|broadband|electricity|bijli|light\s*bill|power|water|paani|gas|cylinder|utility|utilities|recharge)\b/i.test(
      lower
    )
  ) {
    category = "utilities";
  } else if (
    /\b(food|dinner|lunch|breakfast|khana|nashta|snacks|snack|coffee|tea|chai|pizza|burger|swiggy|zomato|restaurant|cafe|bar|drinks|biryani|meal|sweets|mithai)\b/i.test(
      lower
    )
  ) {
    category = "food";
  } else if (
    /\b(cab|uber|ola|auto|taxi|metro|bus|train|flight|petrol|fuel|diesel|toll|travel|trip|safar|airport|fare)\b/i.test(
      lower
    )
  ) {
    category = "travel";
  }

  // 4. Description Extraction
  const desc = extractCleanDescription(cleanText, category, memberNames);

  // 5. Payer Identification
  // Sort member names by length descending so longer matching names (e.g. "Rohan Pandey") match before shorter substrings ("Rohan")
  const sortedMembers = [...memberNames].sort((a, b) => b.length - a.length);

  let paidByName = "";

  // Check for explicit member payer patterns: "<Member> paid", "<Member> ne", "paid by <Member>", "by <Member>"
  for (const name of sortedMembers) {
    if (!name || name.trim().length === 0) continue;
    const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Pattern A: "<Name> paid / spent / bought / gave / covered / ne ... / kharch ..."
    const memberPaidRegex = new RegExp(
      `\\b${escaped}\\s+(?:paid|pay|spent|spend|bought|buy|gave|give|covered|cover|ne\\b|kharch\\s*kiye|kharch\\s*kiya|diye|diya|bhare|bhara)\\b`,
      "i"
    );
    // Pattern B: "paid by <Name>", "covered by <Name>", "by <Name>"
    const paidByMemberRegex = new RegExp(
      `(?:paid\\s+by|covered\\s+by|by|diye|bhare|de\\s*diye)\\s+${escaped}\\b`,
      "i"
    );

    if (memberPaidRegex.test(cleanText) || paidByMemberRegex.test(cleanText)) {
      paidByName = name;
      break;
    }
  }

  // Check for self-paying indicators if no group member was explicitly identified as paying
  if (!paidByName) {
    const isSelfPaid =
      /\b(maine|humne|i\s+paid|i\s+spent|i\s+bought|i\s+gave|i\s+covered|paid\s+by\s+me|my\s+treat|spent\s+by\s+me)\b/i.test(
        cleanText
      );
    if (isSelfPaid && currentUserName) {
      paidByName = currentUserName;
    }
  }

  // Check if an external / non-member name is explicitly marked as paying:
  // e.g. "Rahul paid 500", "John ne 1200 diye"
  if (!paidByName) {
    const externalPayerMatch = cleanText.match(
      /^\s*([a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+(?:paid|spent|bought|covered|ne\b|kharch\s*kiye|diye|bhare)\b/i
    );
    if (externalPayerMatch) {
      const candidateName = externalPayerMatch[1].trim();
      const lowerCand = candidateName.toLowerCase();
      const ignoredPronouns = [
        "i", "we", "he", "she", "they", "it", "maine", "humne", "hum", "someone", "who",
        "monthly", "daily", "flat", "room", "total", "today", "yesterday"
      ];
      if (!ignoredPronouns.includes(lowerCand)) {
        paidByName = candidateName;
      }
    }
  }

  // If still not identified, default to current logged in user (or first member)
  if (!paidByName) {
    paidByName = currentUserName || (memberNames.length > 0 ? memberNames[0] : "Me");
  }

  // 6. Participant Resolution (English & Hindi/Hinglish)
  // Universal group references: "sabke beech", "sab log", "everyone", "all", "hum teenon", "hum charon"
  const isEveryone =
    /\b(sabke\s*beech|sab\s*log|sab\s*mein|sabko|sab\s*ke|everyone|all|everybody|flatmates|whole\s*group|all\s*of\s*us|hum\s*teenon|hum\s*charon|hum\s*panchon|teenon\s*mein|charon\s*mein)\b/i.test(
      lower
    );

  // Self-referential phrases / relational prepositions:
  // "maine", "hum dono", "mere saath", "with X", "X ke saath", "me and X", "between us"
  const isSelfIncluded =
    /\b(maine|mere|mera|meri|hum|hum\s*dono|hum\s*sab|me|i|myself|us|both\s*of\s*us|the\s*two\s*of\s*us|we\s*two|\bwith\b|\bke\s*saath\b|\bsaath\b|\bbetween\s*us\b)\b/i.test(
      lower
    );

  // Check which members are explicitly named in the text (longest first, avoiding overlapping sub-matches)
  const explicitlyMentionedMembers = [];
  let remainingTextForNames = cleanText;

  for (const name of sortedMembers) {
    if (!name || name.trim().length === 0) continue;
    const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nameRegex = new RegExp(`\\b${escaped}\\b`, "i");
    if (nameRegex.test(remainingTextForNames)) {
      explicitlyMentionedMembers.push(name);
      remainingTextForNames = remainingTextForNames.replace(nameRegex, " ___ ");
    }
  }

  const hasExplicitSplitClause =
    /\b(split|between|with|sharing|ke\s*saath|ke\s*beech|mein\s*baant|baant\s*do|baant\s*lo|dono\s*mein|teenon\s*mein|sabke\s*beech|everyone|all)\b/i.test(
      lower
    );

  let participantNames = [];

  if (isEveryone) {
    // Select all members
    participantNames =
      memberNames.length > 0 ? memberNames : [currentUserName || "Member"];
  } else if (
    explicitlyMentionedMembers.length === 1 &&
    explicitlyMentionedMembers[0].toLowerCase() === paidByName.toLowerCase() &&
    !hasExplicitSplitClause
  ) {
    // If only the payer's name is mentioned in the text without an explicit split clause (e.g. "Rohan Pandey paid 1200 for dinner")
    // the expense splits across the entire household
    participantNames =
      memberNames.length > 0 ? memberNames : [paidByName];
  } else if (explicitlyMentionedMembers.length > 0) {
    participantNames = [...explicitlyMentionedMembers];
    // If self reference or relational preposition ("with X", "X ke saath", "hum dono") is present, ensure current user is included
    if (isSelfIncluded && currentUserName) {
      if (
        !participantNames.some(
          (p) => p.toLowerCase() === currentUserName.toLowerCase()
        )
      ) {
        participantNames.push(currentUserName);
      }
    }
  } else if (isSelfIncluded) {
    // Self reference without other explicit names -> default to all members
    participantNames =
      memberNames.length > 0 ? memberNames : [currentUserName || "Member"];
  } else {
    // No specific names found -> default to all members
    participantNames =
      memberNames.length > 0 ? memberNames : ["Member"];
  }

  // Ensure unique list of participant names
  participantNames = Array.from(new Set(participantNames));

  const draftCandidate = {
    amount,
    description: desc,
    category,
    splitType: "equal",
    paidByName,
    participantNames,
  };

  const validation = aiExpenseSchema.safeParse(draftCandidate);
  if (!validation.success) {
    return {
      success: false,
      reason: `Local parse failed validation: ${validation.error.errors[0]?.message}`,
      rawText: cleanText,
    };
  }

  return { success: true, draft: validation.data };
};

const stripMarkdownFences = (text) => {
  return text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
};

const buildSystemPrompt = (memberNames, currentUserName) => `
You are a strict JSON parser for an expense-splitting app. Given a user's
free-text description of an expense (in English, Hindi, or Hinglish), output ONLY a single JSON object —
no prose, no markdown code fences, no explanation.

The logged-in user entering this request is: ${currentUserName || "the logged-in user"}.
The group's members are: ${memberNames.join(", ")}.

Output schema:
{
  "amount": <number, the total amount in rupees>,
  "description": <string, a concise label for the expense, e.g. "Dinner", "Groceries", "WiFi Bill">,
  "category": <one of: "rent","groceries","utilities","food","travel","other">,
  "splitType": "equal",
  "paidByName": <string, EXACT name of who paid from the group members list. If the text mentions another member paid (e.g. "Amit paid 500" or "Rohan Pandey ne 1200 diye"), set paidByName to that member. If the user says "I paid" or "Maine diye", set paidByName to "${currentUserName}". If unspecified, default to "${currentUserName}">,
  "participantNames": [<array of member names involved, using EXACT names from the member list above. If the user says "hum dono", "mere saath", "with X", include BOTH the current user and X. If the user says "everyone", "sabke beech", or only mentions the payer without a split clause, include ALL members.>]
}
`.trim();

/**
 * Main parse entry point:
 * 1. If GEMINI_API_KEY (or AI_API_KEY) is available, queries Google Gemini API.
 * 2. If no key is set OR if Gemini API fails/times out, seamlessly runs
 *    the smart local NLP rule-based parser.
 */
const parseExpenseText = async (text, memberNames = [], currentUserName = "") => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const modelName = process.env.AI_MODEL || "gemini-1.5-flash";
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      });

      const prompt = `${buildSystemPrompt(memberNames, currentUserName)}\n\nUser expense text: "${text}"`;
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const cleaned = stripMarkdownFences(responseText);
      const parsedJson = JSON.parse(cleaned);

      const validation = aiExpenseSchema.safeParse(parsedJson);
      if (validation.success) {
        return { success: true, draft: validation.data };
      }
    } catch (err) {
      console.warn(
        `[aiService] Gemini API call unsuccessful (${err.message || err}). Falling back to local NLP parser.`
      );
    }
  }

  // Local rule-based NLP parser fallback
  return parseExpenseLocally(text, memberNames, currentUserName);
};

module.exports = { parseExpenseText, parseExpenseLocally, extractCleanDescription };
