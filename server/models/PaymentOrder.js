const mongoose = require("mongoose");

const paymentOrderSchema = new mongoose.Schema(
  {
    orderCode: { type: String, required: true, unique: true, index: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    packageId: { type: String, required: true },
    amountVnd: { type: Number, required: true, min: 1 },
    coinAmount: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["pending", "credited", "expired", "rejected"],
      default: "pending",
      index: true,
    },
    provider: { type: String, enum: ["sepay", "manual"], default: "sepay" },
    providerTransactionId: { type: String, unique: true, sparse: true },
    paidAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true },
);

paymentOrderSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("PaymentOrder", paymentOrderSchema);
