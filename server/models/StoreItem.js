const mongoose = require("mongoose");

const storeItemSchema = new mongoose.Schema(
  {
    itemId: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, required: true, maxlength: 64 },
    description: { type: String, default: "", maxlength: 240 },
    category: {
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
      required: true,
    },
    currency: { type: String, enum: ["xu", "hemCoin"], required: true },
    price: { type: Number, min: 0, required: true },
    style: { type: String, default: "", maxlength: 64 },
    active: { type: Boolean, default: true },
    limited: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

storeItemSchema.index({ active: 1, category: 1, sortOrder: 1 });

module.exports = mongoose.model("StoreItem", storeItemSchema);
