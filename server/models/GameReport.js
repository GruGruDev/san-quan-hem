const mongoose = require("mongoose");

const gameReportSchema = new mongoose.Schema(
  {
    matchId: { type: String, required: true, index: true },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reporterName: { type: String, required: true },
    reportedPlayer: { type: String, default: "" },
    reason: { type: String, required: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ["open", "reviewing", "resolved", "dismissed"],
      default: "open",
      index: true,
    },
    adminNote: { type: String, default: "", maxlength: 1000 },
  },
  { timestamps: true },
);

gameReportSchema.index({ createdAt: -1 });

module.exports = mongoose.model("GameReport", gameReportSchema);
