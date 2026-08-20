const ApiError = require("../utils/ApiError");

/**
 * Splits totalPaise equally among participantIds.
 * Uses the largest-remainder method so shares always sum
 * back to exactly totalPaise, even when it doesn't divide evenly.
 *
 * Example: 10000 paise (₹100) among 3 people
 *   base = 3333, remainder = 1
 *   -> shares: [3334, 3333, 3333]  (sum = 10000, not 9999)
 */
const splitEqually = (totalPaise, participantIds) => {
  if (!participantIds || participantIds.length === 0) {
    throw new ApiError(400, "At least one participant is required");
  }

  const n = participantIds.length;
  const base = Math.floor(totalPaise / n);
  const remainder = totalPaise - base * n;

  return participantIds.map((userId, index) => ({
    user: userId,
    // first `remainder` participants get 1 extra paisa each
    share: index < remainder ? base + 1 : base,
    percentage: null,
  }));
};

module.exports = { splitEqually };
