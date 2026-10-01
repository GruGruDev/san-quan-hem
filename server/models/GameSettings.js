const mongoose = require("mongoose");

const gameSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "global", unique: true },
    matchmakingEnabled: { type: Boolean, default: true },
    announcement: { type: String, default: "", maxlength: 500 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("GameSettings", gameSettingsSchema);
