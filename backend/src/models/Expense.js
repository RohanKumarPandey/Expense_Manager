const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number, // stored in paise (integer)
      required: [true, "Amount is required"],
      min: [1, "Amount must be greater than zero"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    category: {
      type: String,
      enum: ["rent", "groceries", "utilities", "food", "travel", "other"],
      default: "other",
    },
    date: {
      type: Date,
      default: Date.now,
    },
    splitType: {
      type: String,
      enum: ["equal", "unequal", "percentage"],
      default: "equal",
      // only "equal" is actually usable until Milestone 4
    },
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        share: {
          type: Number, // paise this participant owes
          required: true,
        },
        percentage: {
          type: Number, // unused until Milestone 4, kept in schema now
        },
      },
    ],
    source: {
      type: String,
      enum: ["manual", "ai"],
      default: "manual",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);
