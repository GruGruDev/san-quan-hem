const mongoose = require("mongoose");

const gameChallengeSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "scheduled",
        "accepted",
        "started",
        "declined",
        "expired",
      ],
      default: "pending",
      index: true,
    },
    mode: { type: String, enum: ["1v1", "2v2"], default: "1v1" },
    expiresAt: { type: Date, required: true, index: true },
    roomId: { type: String, default: null },
  },
  { timestamps: true },
);

gameChallengeSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });

module.exports = mongoose.model("GameChallenge", gameChallengeSchema);
