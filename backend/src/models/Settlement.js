const mongoose = require("mongoose");

const settlementSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // who paid
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // who received
    },
    amount: {
      type: Number, // paise, same convention as Expense.amount
      required: true,
      min: [1, "Settlement amount must be greater than zero"],
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settlement", settlementSchema);
