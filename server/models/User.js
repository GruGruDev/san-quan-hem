const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    sparse: true,
  },
  password: { type: String, required: true },
  displayName: { type: String, required: true },
  tokenVersion: { type: Number, default: 0 },
  passwordResetOtpHash: { type: String, select: false },
  passwordResetOtpExpiresAt: { type: Date, select: false },
  passwordResetOtpAttempts: { type: Number, default: 0, select: false },
  passwordResetRequestedAt: { type: Date, select: false },
  wins: { type: Number, default: 0 },
  matches: { type: Number, default: 0 },
  weeklyWins: { type: Number, default: 0 },
  weeklyMatches: { type: Number, default: 0 },
  weeklyWeekStart: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
