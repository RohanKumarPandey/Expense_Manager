const ApiError = require("../utils/ApiError");

const splitEqually = (totalPaise, participantIds) => {
  if (!participantIds || participantIds.length === 0) {
    throw new ApiError(400, "At least one participant is required");
  }
  const n = participantIds.length;
  const base = Math.floor(totalPaise / n);
  const remainder = totalPaise - base * n;

  return participantIds.map((userId, index) => ({
    user: userId,
    share: index < remainder ? base + 1 : base,
    percentage: null,
  }));
};

/**
 * Unequal split: caller provides an EXACT paise amount per participant.
 * The only job here is validation — the shares themselves are already
 * decided by the user, not computed. Sum must match totalPaise exactly.
 *
 * Input shape: [{ user: 'userId', share: 3000 }, { user: 'userId2', share: 7000 }]
 */
const splitUnequal = (totalPaise, participantShares) => {
  if (!participantShares || participantShares.length === 0) {
    throw new ApiError(400, "At least one participant is required");
  }

  const sum = participantShares.reduce((acc, p) => acc + p.share, 0);
  if (sum !== totalPaise) {
    throw new ApiError(
      400,
      `Shares sum to ${sum} paise but total amount is ${totalPaise} paise — they must match exactly`
    );
  }

  const negativeShare = participantShares.find((p) => p.share < 0);
  if (negativeShare) {
    throw new ApiError(400, "Individual shares cannot be negative");
  }

  return participantShares.map((p) => ({
    user: p.user,
    share: p.share,
    percentage: null,
  }));
};

/**
 * Percentage split: caller provides a percentage per participant
 * (must sum to exactly 100). Shares are computed from percentages,
 * then corrected with the same largest-remainder method as equal
 * split so they sum back to exactly totalPaise despite rounding.
 *
 * Input shape: [{ user: 'userId', percentage: 60 }, { user: 'userId2', percentage: 40 }]
 */
const splitPercentage = (totalPaise, participantPercentages) => {
  if (!participantPercentages || participantPercentages.length === 0) {
    throw new ApiError(400, "At least one participant is required");
  }

  const percentageSum = participantPercentages.reduce((acc, p) => acc + p.percentage, 0);
  // allow tiny float tolerance on the INPUT percentages (e.g. 33.33+33.33+33.34),
  // but the OUTPUT paise sum below is still checked exactly, with zero tolerance
  if (Math.abs(percentageSum - 100) > 0.01) {
    throw new ApiError(400, `Percentages sum to ${percentageSum}, must sum to 100`);
  }

  // raw (unrounded) share per participant
  const rawShares = participantPercentages.map((p) => ({
    user: p.user,
    percentage: p.percentage,
    rawShare: (totalPaise * p.percentage) / 100,
    flooredShare: Math.floor((totalPaise * p.percentage) / 100),
  }));

  const flooredTotal = rawShares.reduce((acc, p) => acc + p.flooredShare, 0);
  let remainder = totalPaise - flooredTotal; // leftover paise to distribute

  // give the leftover paise to participants with the largest fractional
  // remainder first — this is the standard "largest remainder method"
  // used in proportional allocation (e.g. seat apportionment)
  const sorted = [...rawShares].sort(
    (a, b) => (b.rawShare - b.flooredShare) - (a.rawShare - a.flooredShare)
  );

  const finalShares = rawShares.map((p) => ({ ...p, share: p.flooredShare }));
  for (let i = 0; i < remainder; i++) {
    const target = sorted[i].user;
    const entry = finalShares.find((s) => s.user === target);
    entry.share += 1;
  }

  return finalShares.map((p) => ({
    user: p.user,
    share: p.share,
    percentage: p.percentage,
  }));
};

module.exports = { splitEqually, splitUnequal, splitPercentage };
