const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema(
  {
    gameId: { type: String, required: true, unique: true },
    roomId: { type: String, required: true, index: true },
    mode: { type: String, enum: ["1v1", "2v2"], required: true },
    gridSize: { type: Number, required: true },
    winnerTeam: { type: String, enum: ["red", "blue"], required: true },
    players: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        name: { type: String, required: true },
        team: { type: String, enum: ["red", "blue"], required: true },
        board: [
          {
            index: { type: Number, required: true },
            shopId: { type: String, default: null },
            shot: { type: String, enum: ["HIT", "MISS", null], default: null },
          },
        ],
      },
    ],
    shops: [{ id: String, name: String, size: Number, icon: String }],
    shots: [
      {
        sequence: { type: Number, required: true },
        shooterId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        shooterName: { type: String, required: true },
        targetId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        targetName: { type: String, required: true },
        targetIndex: { type: Number, required: true },
        result: { type: String, enum: ["MISS", "HIT", "SUNK"], required: true },
        shopId: { type: String, default: null },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

matchSchema.index({ finishedAt: -1 });

module.exports = mongoose.model("GameMatch", matchSchema);
