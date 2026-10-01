const mongoose = require("mongoose");

const dailyRewardClaimSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    day: { type: String, required: true },
    reward: { type: Number, required: true },
  },
  { timestamps: true },
);

dailyRewardClaimSchema.index({ userId: 1, day: 1 }, { unique: true });

module.exports = mongoose.model("DailyRewardClaim", dailyRewardClaimSchema);
