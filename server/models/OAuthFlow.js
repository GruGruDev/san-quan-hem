const mongoose = require("mongoose");

const oauthFlowSchema = new mongoose.Schema({
  stateHash: { type: String, unique: true, sparse: true },
  codeHash: { type: String, unique: true, sparse: true },
  provider: { type: String, enum: ["google", "facebook"], required: true },
  purpose: {
    type: String,
    enum: ["login", "link", "exchange"],
    required: true,
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  tokenVersion: Number,
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

oauthFlowSchema.index({ stateHash: 1, purpose: 1 });
oauthFlowSchema.index({ codeHash: 1, purpose: 1 });

module.exports = mongoose.model("OAuthFlow", oauthFlowSchema);
