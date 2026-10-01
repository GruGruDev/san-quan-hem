const mongoose = require("mongoose");

const walletLedgerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    currency: { type: String, enum: ["xu", "hemCoin"], required: true },
    delta: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    type: {
      type: String,
      enum: [
        "match_reward",
        "daily_reward",
        "achievement",
        "purchase",
        "topup",
        "name_change",
        "admin_adjust",
      ],
      required: true,
    },
    reference: { type: String, unique: true, sparse: true, maxlength: 128 },
    description: { type: String, default: "", maxlength: 160 },
  },
  { timestamps: true },
);

walletLedgerSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("WalletLedger", walletLedgerSchema);
