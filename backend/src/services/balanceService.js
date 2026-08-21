const Expense = require("../models/Expense");
const Settlement = require("../models/Settlement");

/**
 * Computes each group member's net balance in paise.
 * Positive netBalance  -> this user is OWED money (they overpaid their share)
 * Negative netBalance  -> this user OWES money (they underpaid their share)
 *
 * Formula per user:
 *   netBalance = (total they PAID across all expenses)
 *              - (total of their SHARE across all expenses' participants)
 *              + (total settlements they SENT)
 *              - (total settlements they RECEIVED)
 */
const getNetBalances = async (groupId, memberIds = []) => {
  const expenses = await Expense.find({ group: groupId });
  const settlements = await Settlement.find({ group: groupId });

  // start every known member at 0 — this matters so a member with
  // zero activity still shows up with a balance of 0, not "missing"
  const balances = {};
  memberIds.forEach((id) => {
    balances[id.toString()] = 0;
  });

  for (const expense of expenses) {
    const payerId = expense.paidBy.toString();
    balances[payerId] = (balances[payerId] || 0) + expense.amount;

    for (const participant of expense.participants) {
      const userId = participant.user.toString();
      balances[userId] = (balances[userId] || 0) - participant.share;
    }
  }

  // Fold settlements into the balances object.
  // If X paid Y ₹500 (X = from, Y = to):
  //   X's debt shrinks -> X's balance moves toward positive -> ADD to X
  //   Y is owed less now -> Y's balance moves toward negative -> SUBTRACT from Y
  for (const settlement of settlements) {
    const fromId = settlement.from.toString();
    const toId = settlement.to.toString();
    balances[fromId] = (balances[fromId] || 0) + settlement.amount;
    balances[toId] = (balances[toId] || 0) - settlement.amount;
  }

  // Safety check: total of all net balances in a closed group must be
  // exactly zero (every rupee paid is owed by someone). If this ever
  // fails, it means a bug in split math let money "leak." Cheap and
  // valuable to assert.
  const total = Object.values(balances).reduce((acc, v) => acc + v, 0);
  if (total !== 0) {
    throw new Error(
      `Balance integrity check failed: balances sum to ${total}, expected 0`
    );
  }

  return balances; // { userId: netBalancePaise, ... }
};

/**
 * Given net balances (from getNetBalances), produces a minimal-ish list
 * of suggested transactions to settle all debts in the group.
 *
 * Algorithm: greedy largest-creditor-meets-largest-debtor matching.
 * NOT guaranteed to be the global minimum number of transactions —
 * that variant of the problem is NP-hard. This is the standard
 * practical heuristic (same approach real expense-splitting apps use).
 *
 * Returns: [{ from: userId, to: userId, amount: paise }]
 */
const getSuggestedSettlements = (netBalances) => {
  // build working copies so we don't mutate the caller's balance object
  const creditors = [];
  const debtors = [];

  for (const [userId, amount] of Object.entries(netBalances)) {
    if (amount > 0) creditors.push({ user: userId, amount });
    else if (amount < 0) debtors.push({ user: userId, amount: Math.abs(amount) });
    // amount === 0 -> already settled, excluded from both lists
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions = [];
  let i = 0; // pointer into creditors
  let j = 0; // pointer into debtors

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    const settleAmount = Math.min(creditor.amount, debtor.amount);

    if (settleAmount > 0) {
      transactions.push({
        from: debtor.user,
        to: creditor.user,
        amount: settleAmount,
      });
    }

    creditor.amount -= settleAmount;
    debtor.amount -= settleAmount;

    if (creditor.amount === 0) i++;
    if (debtor.amount === 0) j++;
  }

  // Safety check: every transaction's amount must be positive, and no
  // creditor/debtor should be left with a nonzero amount at the end.
  // If getNetBalances' zero-sum invariant held (Milestone 5), this loop
  // mathematically cannot exit early with leftovers — asserting it here
  // catches the case where that invariant was somehow violated upstream.
  const leftoverCreditor = creditors.find((c) => c.amount !== 0);
  const leftoverDebtor = debtors.find((d) => d.amount !== 0);
  if (leftoverCreditor || leftoverDebtor) {
    throw new Error(
      "Debt simplification failed to fully settle balances — check upstream balance integrity"
    );
  }

  return transactions;
};

module.exports = { getNetBalances, getSuggestedSettlements };
