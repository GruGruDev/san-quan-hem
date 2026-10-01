const mongoose = require("mongoose");

const directMessageSchema = new mongoose.Schema(
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
    text: { type: String, required: true, maxlength: 1000 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

directMessageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });
directMessageSchema.index({ recipientId: 1, createdAt: -1 });

module.exports = mongoose.model("DirectMessage", directMessageSchema);
