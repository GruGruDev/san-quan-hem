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
  passwordAuthEnabled: { type: Boolean, default: true },
  displayName: { type: String, required: true },
  freeNameChangeAvailable: { type: Boolean, default: true },
  bio: { type: String, default: "", maxlength: 280 },
  profileTheme: {
    type: String,
    enum: ["alley", "night", "market"],
    default: "alley",
  },
  avatarId: {
    type: String,
    enum: ["scooter", "tea", "noodles"],
    default: "scooter",
  },
  equippedDecoration: { type: String, default: "", maxlength: 64 },
  equippedCosmetics: [
    {
      slot: {
        type: String,
        enum: [
          "avatar_frame",
          "profile_background",
          "nameplate",
          "hit_effect",
          "miss_effect",
          "sunk_effect",
          "shop_skin",
          "victory_effect",
        ],
      },
      itemId: { type: String, required: true },
    },
  ],
  googleId: { type: String, unique: true, sparse: true },
  facebookId: { type: String, unique: true, sparse: true },
  tokenVersion: { type: Number, default: 0 },
  passwordResetOtpHash: { type: String, select: false },
  passwordResetOtpExpiresAt: { type: Date, select: false },
  passwordResetOtpAttempts: { type: Number, default: 0, select: false },
  passwordResetRequestedAt: { type: Date, select: false },
  wins: { type: Number, default: 0 },
  matches: { type: Number, default: 0 },
  xuBalance: { type: Number, default: 300, min: 0 },
  hemCoinBalance: { type: Number, default: 0, min: 0 },
  achievementClaims: [{ type: String }],
  weeklyWins: { type: Number, default: 0 },
  weeklyMatches: { type: Number, default: 0 },
  weeklyWeekStart: { type: Date, default: Date.now },
  isDonor: { type: Boolean, default: false },
  donorSince: { type: Date, default: null },
  isBanned: { type: Boolean, default: false },
  inventory: [
    {
      itemId: { type: String, required: true },
      quantity: { type: Number, default: 1, min: 1 },
      grantedAt: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
