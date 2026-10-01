const mongoose = require("mongoose");

const profileReactionSchema = new mongoose.Schema(
  {
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reaction: {
      type: String,
      enum: ["heart", "respect", "spicy", "gg"],
      required: true,
    },
  },
  { timestamps: true },
);

profileReactionSchema.index({ profileId: 1, actorId: 1 }, { unique: true });

module.exports = mongoose.model("ProfileReaction", profileReactionSchema);
