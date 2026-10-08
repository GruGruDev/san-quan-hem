const express = require("express");

const SHOP_CATALOG = [
  { id: "cavien", name: "Xe Cá Viên Chiên", size: 2, category: "Quán" },
  { id: "trasua", name: "Tiệm Trà Sữa", size: 3, category: "Quán" },
  { id: "bunrieu", name: "Gánh Bún Riêu", size: 3, category: "Quán" },
  { id: "quanoc", name: "Quán Ốc Quen", size: 4, category: "Quán" },
  { id: "quannhau", name: "Khu Nhậu Vỉa Hè", size: 4, category: "Chiến hạm" },
  {
    id: "quannhau5",
    name: "Khu Nhậu Vỉa Hè Cỡ Lớn",
    size: 5,
    category: "Chiến hạm",
  },
];

const createAdminRouter = ({
  User,
  GameMatch,
  GameReport,
  GameSettings,
  AdminAuditLog,
  StoreItem,
  PaymentOrder,
  WalletLedger,
  activeRooms,
  matchmakingQueues,
  io,
  requireAdmin,
  onSettingsUpdated,
}) => {
  const router = express.Router();
  router.use(requireAdmin);

  const requireDatabase = (res) => {
    if (User.db.readyState === 1) return true;
    res.status(503).json({ message: "Cơ sở dữ liệu chưa sẵn sàng." });
    return false;
  };

  const writeAudit = async (
    req,
    action,
    targetType,
    targetId,
    details = {},
  ) => {
    await AdminAuditLog.create({
      adminId: req.authenticatedUser._id,
      adminName: req.authenticatedUser.displayName,
      action,
      targetType,
      targetId: targetId || null,
      details,
    });
  };

  router.get("/overview", async (req, res) => {
    if (!requireDatabase(res)) return;
    const sockets = [...io.sockets.sockets.values()];
    const onlineUserIds = new Set(
      sockets.map((socket) => socket.data.userId).filter(Boolean),
    );
    const [totalPlayers, totalMatches, openReports, rooms] = await Promise.all([
      User.countDocuments(),
      GameMatch.countDocuments(),
      GameReport.countDocuments({ status: { $in: ["open", "reviewing"] } }),
      Promise.resolve(Object.values(activeRooms)),
    ]);

    res.json({
      players: totalPlayers,
      onlineConnections: sockets.length,
      onlinePlayers: onlineUserIds.size,
      anonymousConnections: sockets.length - onlineUserIds.size,
      queuedPlayers: Object.values(matchmakingQueues).reduce(
        (count, queue) => count + queue.length,
        0,
      ),
      activeRooms: rooms.length,
      activeMatches: rooms.filter((room) => room.gameState === "PLAYING")
        .length,
      completedMatches: totalMatches,
      pendingReports: openReports,
    });
  });

  router.get("/users", async (req, res) => {
    if (!requireDatabase(res)) return;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 25),
    );
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const query = search
      ? {
          $or: [
            { username: { $regex: search.slice(0, 64), $options: "i" } },
            { displayName: { $regex: search.slice(0, 64), $options: "i" } },
          ],
        }
      : {};
    const [users, total] = await Promise.all([
      User.find(query)
        .select(
          "username displayName wins matches isDonor donorSince isBanned inventory createdAt",
        )
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);
    res.json({ users, total, page, limit });
  });

  router.patch("/users/:userId", async (req, res) => {
    if (!requireDatabase(res)) return;
    const updates = {};
    if (typeof req.body?.isDonor === "boolean") {
      updates.isDonor = req.body.isDonor;
      updates.donorSince = req.body.isDonor ? new Date() : null;
    }
    if (typeof req.body?.isBanned === "boolean")
      updates.isBanned = req.body.isBanned;
    if (typeof req.body?.displayName === "string") {
      const displayName = req.body.displayName.trim();
      if (!displayName || displayName.length > 32) {
        return res
          .status(400)
          .json({ message: "Tên hiển thị phải từ 1 đến 32 ký tự." });
      }
      updates.displayName = displayName;
    }
    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: "Không có thay đổi hợp lệ." });
    }

    const user = await User.findByIdAndUpdate(req.params.userId, updates, {
      new: true,
      runValidators: true,
    }).select("username displayName isDonor donorSince isBanned");
    if (!user)
      return res.status(404).json({ message: "Không tìm thấy người chơi." });
    if (updates.isBanned) io.in(`user:${user.id}`).disconnectSockets(true);
    await writeAudit(req, "player.update", "user", user.id, updates);
    res.json(user);
  });

  router.post("/users/:userId/items", async (req, res) => {
    if (!requireDatabase(res)) return;
    const itemId =
      typeof req.body?.itemId === "string" ? req.body.itemId.trim() : "";
    const quantity = Number(req.body?.quantity);
    if (
      !/^[a-z0-9_-]{1,64}$/i.test(itemId) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 100
    ) {
      return res
        .status(400)
        .json({ message: "Mã vật phẩm hoặc số lượng không hợp lệ." });
    }
    const user = await User.findById(req.params.userId);
    if (!user)
      return res.status(404).json({ message: "Không tìm thấy người chơi." });
    const existingItem = user.inventory.find((item) => item.itemId === itemId);
    if (existingItem) existingItem.quantity += quantity;
    else user.inventory.push({ itemId, quantity });
    await user.save();
    await writeAudit(req, "inventory.grant", "user", user.id, {
      itemId,
      quantity,
    });
    res.json({ inventory: user.inventory });
  });

  router.get("/online", (req, res) => {
    const playersBySocketId = new Map();
    for (const room of Object.values(activeRooms)) {
      for (const player of Object.values(room.players)) {
        playersBySocketId.set(player.socketId, { player, roomId: room.roomId });
      }
    }
    const online = [...io.sockets.sockets.values()].map((socket) => {
      const roomEntry = playersBySocketId.get(socket.id);
      const roomPlayer = roomEntry?.player;
      return {
        socketId: socket.id,
        userId: socket.data.userId || null,
        username: socket.data.username || null,
        name: roomPlayer?.name || socket.data.displayName || "Khách",
        roomId: roomEntry?.roomId || null,
        connectedAt: socket.handshake?.time || null,
      };
    });
    res.json({ online, total: online.length });
  });

  router.get("/rooms", (req, res) => {
    const rooms = Object.values(activeRooms).map((room) => ({
      roomId: room.roomId,
      roomCode: room.roomCode || null,
      isPrivate: Boolean(room.isPrivate),
      mode: room.mode,
      gridSize: room.gridSize,
      gameState: room.gameState,
      shops: room.shops,
      startedAt: room.startedAt || null,
      players: Object.values(room.players).map((player) => ({
        socketId: player.socketId,
        userId: player.userId || null,
        name: player.name,
        team: player.team,
        connected:
          player.connected !== false && io.sockets.sockets.has(player.socketId),
        ready: Boolean(player.ready),
        eliminated: Boolean(player.eliminated),
        board: (player.board || []).map((cell, index) => ({
          index,
          shopId: cell?.shopId || null,
          shot: cell?.shot || null,
        })),
      })),
    }));
    res.json({ rooms, total: rooms.length });
  });
  router.delete("/rooms/:roomId", async (req, res) => {
    const { roomId } = req.params;
    const room = activeRooms[roomId];
    if (!room) return res.status(404).json({ message: "Phòng không tồn tại." });

    // Báo tin nhắn hủy phòng cho mọi socket trong phòng và ngắt kết nối
    io.to(roomId).emit("opponent_left", "Quản trị viên đã giải tán phòng này.");
    delete activeRooms[roomId];

    await writeAudit(req, "room.destroy", "room", roomId, { mode: room.mode });
    res.json({ message: "Đã giải tán phòng thành công." });
  });

  router.get("/matches", async (req, res) => {
    if (!requireDatabase(res)) return;
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const query = search
      ? {
          $or: [
            { gameId: { $regex: search.slice(0, 64), $options: "i" } },
            { roomId: { $regex: search.slice(0, 64), $options: "i" } },
            { "players.name": { $regex: search.slice(0, 64), $options: "i" } },
          ],
        }
      : {};
    const matches = await GameMatch.find(query)
      .sort({ finishedAt: -1 })
      .limit(100)
      .lean();
    res.json({ matches, total: matches.length });
  });

  router.get("/catalog", (req, res) => {
    StoreItem.find({})
      .sort({ sortOrder: 1 })
      .lean()
      .then((items) => res.json({ shops: SHOP_CATALOG, items }))
      .catch(() =>
        res.status(500).json({ message: "Không tải được cửa hàng." }),
      );
  });

  router.get("/payments", async (req, res) => {
    if (!requireDatabase(res)) return;
    await PaymentOrder.updateMany(
      { status: "pending", expiresAt: { $lte: new Date() } },
      { $set: { status: "expired" } },
    );
    const orders = await PaymentOrder.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("userId", "username displayName")
      .lean();
    res.json(orders);
  });

  router.post("/payments/:orderId/approve", async (req, res) => {
    if (!requireDatabase(res)) return;
    const session = await User.startSession();
    let approvedOrder;
    try {
      await session.withTransaction(async () => {
        const order = await PaymentOrder.findOne({
          _id: req.params.orderId,
          status: "pending",
          expiresAt: { $gt: new Date() },
        }).session(session);
        if (!order) {
          throw Object.assign(new Error("Đơn không còn chờ duyệt."), {
            status: 404,
          });
        }
        order.status = "credited";
        order.provider = "manual";
        order.providerTransactionId = `manual:${order.orderCode}`;
        order.paidAt = new Date();
        await order.save({ session });

        const user = await User.findByIdAndUpdate(
          order.userId,
          { $inc: { hemCoinBalance: order.coinAmount } },
          { new: true, session },
        );
        if (!user) throw new Error("Không tìm thấy tài khoản nhận coin.");
        await WalletLedger.create(
          [
            {
              userId: user._id,
              currency: "hemCoin",
              delta: order.coinAmount,
              balanceAfter: user.hemCoinBalance,
              type: "topup",
              reference: `topup:${order.providerTransactionId}`,
              description: `Admin duyệt ${order.coinAmount} Hẻm Coin`,
            },
          ],
          { session },
        );
        approvedOrder = order;
      });
    } catch (error) {
      if (error.status)
        return res.status(error.status).json({ message: error.message });
      if (error.code === 11000)
        return res.status(409).json({ message: "Đơn đã được xử lý." });
      console.error("Manual payment approval failed:", error.message);
      return res.status(500).json({ message: "Không thể duyệt đơn nạp." });
    } finally {
      await session.endSession();
    }
    await writeAudit(req, "payment.approve", "payment", approvedOrder.id, {
      orderCode: approvedOrder.orderCode,
      coinAmount: approvedOrder.coinAmount,
    });
    res.json({ order: approvedOrder });
  });

  router.post("/payments/:orderId/reject", async (req, res) => {
    if (!requireDatabase(res)) return;
    const order = await PaymentOrder.findOneAndUpdate(
      { _id: req.params.orderId, status: "pending" },
      { $set: { status: "rejected" } },
      { new: true },
    );
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn đang chờ." });
    await writeAudit(req, "payment.reject", "payment", order.id, {
      orderCode: order.orderCode,
    });
    res.json({ order });
  });

  router.get("/leaderboard", async (req, res) => {
    if (!requireDatabase(res)) return;
    const users = await User.find()
      .select("displayName wins matches isDonor")
      .sort({ wins: -1, matches: 1 })
      .limit(100)
      .lean();
    res.json(users);
  });

  router.get("/reports", async (req, res) => {
    if (!requireDatabase(res)) return;
    const reports = await GameReport.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(reports);
  });

  router.patch("/reports/:reportId", async (req, res) => {
    if (!requireDatabase(res)) return;
    const { status, adminNote = "" } = req.body || {};
    if (!["open", "reviewing", "resolved", "dismissed"].includes(status)) {
      return res
        .status(400)
        .json({ message: "Trạng thái báo cáo không hợp lệ." });
    }
    if (typeof adminNote !== "string" || adminNote.length > 1000) {
      return res.status(400).json({ message: "Ghi chú tối đa 1000 ký tự." });
    }
    const report = await GameReport.findByIdAndUpdate(
      req.params.reportId,
      { status, adminNote: adminNote.trim() },
      { new: true, runValidators: true },
    );
    if (!report)
      return res.status(404).json({ message: "Không tìm thấy báo cáo." });
    await writeAudit(req, "report.review", "report", report.id, { status });
    res.json(report);
  });

  router.get("/settings", async (req, res) => {
    if (!requireDatabase(res)) return;
    const settings = await GameSettings.findOneAndUpdate(
      { key: "global" },
      { $setOnInsert: { matchmakingEnabled: true, announcement: "" } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    res.json(settings);
  });

  router.put("/settings", async (req, res) => {
    if (!requireDatabase(res)) return;
    const updates = {};
    if (typeof req.body?.matchmakingEnabled === "boolean") {
      updates.matchmakingEnabled = req.body.matchmakingEnabled;
    }
    if (typeof req.body?.announcement === "string") {
      if (req.body.announcement.length > 500) {
        return res.status(400).json({ message: "Thông báo tối đa 500 ký tự." });
      }
      updates.announcement = req.body.announcement.trim();
    }
    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: "Không có cấu hình hợp lệ." });
    }
    const settings = await GameSettings.findOneAndUpdate(
      { key: "global" },
      { $set: updates, $setOnInsert: { key: "global" } },
      { new: true, upsert: true, runValidators: true },
    ).lean();
    onSettingsUpdated?.(settings);
    await writeAudit(req, "settings.update", "settings", "global", updates);
    res.json(settings);
  });

  router.get("/analytics", async (req, res) => {
    if (!requireDatabase(res)) return;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [players, matches, recentMatches, donors, bannedPlayers] =
      await Promise.all([
        User.countDocuments(),
        GameMatch.countDocuments(),
        GameMatch.countDocuments({ finishedAt: { $gte: since } }),
        User.countDocuments({ isDonor: true }),
        User.countDocuments({ isBanned: true }),
      ]);
    const dailyMatches = await GameMatch.aggregate([
      { $match: { finishedAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$finishedAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    res.json({
      players,
      matches,
      recentMatches,
      donors,
      bannedPlayers,
      dailyMatches,
    });
  });

  router.get("/audit", async (req, res) => {
    if (!requireDatabase(res)) return;
    const logs = await AdminAuditLog.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(logs);
  });

  return router;
};

module.exports = createAdminRouter;
