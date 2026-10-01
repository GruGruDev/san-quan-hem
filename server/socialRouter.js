const express = require("express");
const crypto = require("crypto");
const { rateLimit } = require("express-rate-limit");

const REACTIONS = ["heart", "respect", "spicy", "gg"];
const THEMES = ["alley", "night", "market"];
const AVATARS = ["scooter", "tea", "noodles"];
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createSocialRouter = ({
  User,
  WalletLedger,
  GameMatch,
  Friendship,
  DirectMessage,
  ProfileReaction,
  GameChallenge,
  activeRooms,
  io,
  requireAuthenticatedUser,
  startChallengeRoom,
}) => {
  const router = express.Router();
  const requireDatabase = (res) => {
    if (User.db.readyState === 1) return true;
    res.status(503).json({ message: "Cơ sở dữ liệu chưa sẵn sàng." });
    return false;
  };
  const sendLimiter = rateLimit({
    windowMs: 60_000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Bạn gửi quá nhanh. Hãy thử lại sau một phút." },
  });
  const areFriends = (firstId, secondId) =>
    Friendship.exists({
      status: "accepted",
      $or: [
        { requesterId: firstId, recipientId: secondId },
        { requesterId: secondId, recipientId: firstId },
      ],
    });
  const userIsInMatch = (userId) =>
    Object.values(activeRooms).some(
      (room) =>
        ["SETUP", "PLAYING"].includes(room.gameState) &&
        Object.values(room.players).some(
          (player) => player.userId && String(player.userId) === String(userId),
        ),
    );

  router.get("/profiles/:username", async (req, res) => {
    if (!requireDatabase(res)) return;
    const username = String(req.params.username || "")
      .trim()
      .slice(0, 32);
    const user = await User.findOne({
      username: { $regex: `^${escapeRegex(username)}$`, $options: "i" },
    })
      .select(
        "username displayName bio profileTheme avatarId equippedDecoration equippedCosmetics wins matches isDonor donorSince createdAt",
      )
      .lean();
    if (!user)
      return res.status(404).json({ message: "Không tìm thấy hồ sơ." });

    const [friendCount, reactionGroups] = await Promise.all([
      Friendship.countDocuments({
        status: "accepted",
        $or: [{ requesterId: user._id }, { recipientId: user._id }],
      }),
      ProfileReaction.aggregate([
        { $match: { profileId: user._id } },
        { $group: { _id: "$reaction", count: { $sum: 1 } } },
      ]),
    ]);
    res.json({
      profile: user,
      friendCount,
      reactions: Object.fromEntries(
        reactionGroups.map(({ _id, count }) => [_id, count]),
      ),
      myReaction: null,
    });
  });

  router.use(requireAuthenticatedUser);

  router.get("/me", (req, res) => {
    const user = req.authenticatedUser;
    res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      profileTheme: user.profileTheme,
      avatarId: user.avatarId,
      equippedDecoration: user.equippedDecoration,
      wins: user.wins,
      matches: user.matches,
      isDonor: user.isDonor,
      xuBalance: user.xuBalance || 0,
      hemCoinBalance: user.hemCoinBalance || 0,
      freeNameChangeAvailable: user.freeNameChangeAvailable !== false,
      equippedCosmetics: user.equippedCosmetics || [],
      inventory: user.inventory.map((item) => ({
        itemId: item.itemId,
        quantity: item.quantity,
      })),
    });
  });

  router.get("/profiles/:profileId/reactions", async (req, res) => {
    if (!requireDatabase(res)) return;
    const profile = await User.findById(req.params.profileId).select("_id");
    if (!profile)
      return res.status(404).json({ message: "Không tìm thấy hồ sơ." });
    const [groups, ownReaction] = await Promise.all([
      ProfileReaction.aggregate([
        { $match: { profileId: profile._id } },
        { $group: { _id: "$reaction", count: { $sum: 1 } } },
      ]),
      ProfileReaction.findOne({
        profileId: profile._id,
        actorId: req.authenticatedUser._id,
      }).select("reaction"),
    ]);
    res.json({
      reactions: Object.fromEntries(
        groups.map(({ _id, count }) => [_id, count]),
      ),
      myReaction: ownReaction?.reaction || null,
    });
  });

  router.put("/profile", async (req, res) => {
    if (!requireDatabase(res)) return;
    let user = req.authenticatedUser;
    const { displayName, bio, profileTheme, avatarId, equippedDecoration } =
      req.body || {};
    if (typeof displayName === "string") {
      const cleanName = displayName.trim();
      if (!cleanName || cleanName.length > 32) {
        return res
          .status(400)
          .json({ message: "Tên hiển thị phải từ 1 đến 32 ký tự." });
      }
      if (cleanName !== user.displayName) {
        const renameFee = 500;
        const session = await User.startSession();
        try {
          await session.withTransaction(async () => {
            const updatedUser = await User.findById(user._id).session(session);
            if (!updatedUser) {
              throw new Error("Không tìm thấy tài khoản.");
            }
            if (updatedUser.displayName === cleanName) {
              user = updatedUser;
              return;
            }
            const freeRename = updatedUser.freeNameChangeAvailable !== false;
            if (!freeRename && (updatedUser.xuBalance || 0) < renameFee) {
              throw Object.assign(
                new Error("Đổi tên lần tiếp theo cần 500 Xu Hẻm."),
                { code: "INSUFFICIENT_XU" },
              );
            }
            updatedUser.displayName = cleanName;
            updatedUser.freeNameChangeAvailable = false;
            if (!freeRename) updatedUser.xuBalance -= renameFee;
            await updatedUser.save({ session });
            user = updatedUser;
            if (!freeRename) {
              await WalletLedger.create(
                [
                  {
                    userId: user._id,
                    currency: "xu",
                    delta: -renameFee,
                    balanceAfter: user.xuBalance,
                    type: "name_change",
                    reference: `rename:${user._id}:${crypto.randomUUID()}`,
                    description: "Đổi tên hiển thị",
                  },
                ],
                { session },
              );
            }
          });
        } catch (error) {
          if (error.code === "INSUFFICIENT_XU") {
            return res.status(402).json({ message: error.message });
          }
          throw error;
        } finally {
          await session.endSession();
        }
        user.$session(null);
      }
    }
    if (typeof bio === "string") {
      if (bio.length > 280)
        return res
          .status(400)
          .json({ message: "Giới thiệu tối đa 280 ký tự." });
      user.bio = bio.trim();
    }
    if (profileTheme !== undefined) {
      if (!THEMES.includes(profileTheme))
        return res
          .status(400)
          .json({ message: "Giao diện hồ sơ không hợp lệ." });
      user.profileTheme = profileTheme;
    }
    if (avatarId !== undefined) {
      if (!AVATARS.includes(avatarId))
        return res.status(400).json({ message: "Ảnh đại diện không hợp lệ." });
      user.avatarId = avatarId;
    }
    if (equippedDecoration !== undefined) {
      if (
        typeof equippedDecoration !== "string" ||
        equippedDecoration.length > 64
      ) {
        return res
          .status(400)
          .json({ message: "Vật phẩm trang trí không hợp lệ." });
      }
      if (
        equippedDecoration &&
        !user.inventory.some(
          (item) => item.itemId === equippedDecoration && item.quantity > 0,
        )
      ) {
        return res
          .status(403)
          .json({ message: "Bạn chưa sở hữu vật phẩm này." });
      }
      user.equippedDecoration = equippedDecoration;
    }
    await user.save();
    res.json({
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      profileTheme: user.profileTheme,
      avatarId: user.avatarId,
      equippedDecoration: user.equippedDecoration,
      wins: user.wins,
      matches: user.matches,
      isDonor: user.isDonor,
      xuBalance: user.xuBalance || 0,
      hemCoinBalance: user.hemCoinBalance || 0,
      freeNameChangeAvailable: user.freeNameChangeAvailable !== false,
      equippedCosmetics: user.equippedCosmetics || [],
    });
  });

  router.post("/profiles/:profileId/reactions", async (req, res) => {
    if (!requireDatabase(res)) return;
    const { profileId } = req.params;
    const reaction = req.body?.reaction;
    if (!REACTIONS.includes(reaction))
      return res.status(400).json({ message: "Reaction không hợp lệ." });
    if (String(req.authenticatedUser._id) === profileId) {
      return res
        .status(400)
        .json({ message: "Bạn không thể tự thả reaction cho mình." });
    }
    const profile = await User.findById(profileId).select("_id");
    if (!profile)
      return res.status(404).json({ message: "Không tìm thấy hồ sơ." });

    const existing = await ProfileReaction.findOne({
      profileId: profile._id,
      actorId: req.authenticatedUser._id,
    });
    if (existing?.reaction === reaction) {
      await existing.deleteOne();
    } else {
      await ProfileReaction.findOneAndUpdate(
        { profileId: profile._id, actorId: req.authenticatedUser._id },
        { reaction },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      );
    }
    const counts = await ProfileReaction.aggregate([
      { $match: { profileId: profile._id } },
      { $group: { _id: "$reaction", count: { $sum: 1 } } },
    ]);
    const myReaction = existing?.reaction === reaction ? null : reaction;
    res.json({
      reactions: Object.fromEntries(
        counts.map(({ _id, count }) => [_id, count]),
      ),
      myReaction,
    });
  });

  router.get("/history", async (req, res) => {
    if (!requireDatabase(res)) return;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const matches = await GameMatch.find({
      "players.userId": req.authenticatedUser._id,
    })
      .sort({ finishedAt: -1 })
      .skip((page - 1) * 20)
      .limit(20)
      .select(
        "gameId roomId mode gridSize winnerTeam players shops shots startedAt finishedAt",
      )
      .lean();
    res.json({ matches, page });
  });

  router.get("/history/:gameId", async (req, res) => {
    if (!requireDatabase(res)) return;
    const match = await GameMatch.findOne({ gameId: req.params.gameId }).lean();
    if (!match)
      return res.status(404).json({ message: "Không tìm thấy trận đấu." });
    if (
      !match.players.some(
        (player) => String(player.userId) === String(req.authenticatedUser._id),
      )
    ) {
      return res
        .status(403)
        .json({ message: "Bạn không tham gia trận đấu này." });
    }
    res.json(match);
  });

  router.get("/directory", async (req, res) => {
    if (!requireDatabase(res)) return;
    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim().slice(0, 32)
        : "";
    if (search.length < 2) return res.json([]);
    const expression = new RegExp(escapeRegex(search), "i");
    const users = await User.find({
      _id: { $ne: req.authenticatedUser._id },
      isBanned: { $ne: true },
      $or: [{ username: expression }, { displayName: expression }],
    })
      .select("username displayName wins isDonor profileTheme avatarId")
      .limit(10)
      .lean();
    res.json(users);
  });

  router.get("/friends", async (req, res) => {
    if (!requireDatabase(res)) return;
    const userId = req.authenticatedUser._id;
    const friendships = await Friendship.find({
      $or: [{ requesterId: userId }, { recipientId: userId }],
    })
      .sort({ updatedAt: -1 })
      .limit(100)
      .populate(
        "requesterId",
        "username displayName wins isDonor profileTheme avatarId",
      )
      .populate(
        "recipientId",
        "username displayName wins isDonor profileTheme avatarId",
      )
      .lean();
    const onlineIds = new Set(
      [...io.sockets.sockets.values()]
        .map((socket) => socket.data.userId)
        .filter(Boolean),
    );
    res.json(
      friendships.map((entry) => {
        const friend =
          String(entry.requesterId?._id) === String(userId)
            ? entry.recipientId
            : entry.requesterId;
        const friendId = String(friend?._id || "");
        return {
          ...entry,
          direction:
            String(entry.recipientId?._id) === String(userId)
              ? "incoming"
              : "outgoing",
          friend: {
            ...friend,
            isOnline: onlineIds.has(friendId),
            inMatch: userIsInMatch(friendId),
          },
        };
      }),
    );
  });

  router.post("/friends", sendLimiter, async (req, res) => {
    if (!requireDatabase(res)) return;
    const username =
      typeof req.body?.username === "string"
        ? req.body.username.trim().slice(0, 32)
        : "";
    const recipient = await User.findOne({
      username: { $regex: `^${escapeRegex(username)}$`, $options: "i" },
      isBanned: { $ne: true },
    });
    if (!recipient)
      return res.status(404).json({ message: "Không tìm thấy người chơi." });
    const requesterId = req.authenticatedUser._id;
    if (String(recipient._id) === String(requesterId))
      return res
        .status(400)
        .json({ message: "Bạn không thể kết bạn với chính mình." });

    const existing = await Friendship.findOne({
      $or: [
        { requesterId, recipientId: recipient._id },
        { requesterId: recipient._id, recipientId: requesterId },
      ],
    });
    if (existing) {
      if (
        existing.status === "pending" &&
        String(existing.requesterId) !== String(requesterId)
      ) {
        existing.status = "accepted";
        await existing.save();
        return res.json({ friendship: existing, accepted: true });
      }
      return res.status(409).json({ message: "Lời mời kết bạn đã tồn tại." });
    }
    const friendship = await Friendship.create({
      requesterId,
      recipientId: recipient._id,
    });
    io.to(`user:${recipient._id}`).emit("friend_request", {
      username: req.authenticatedUser.username,
      displayName: req.authenticatedUser.displayName,
    });
    res.status(201).json({ friendship });
  });

  router.patch("/friends/:friendshipId", async (req, res) => {
    if (!requireDatabase(res)) return;
    const status = req.body?.status;
    if (!["accepted", "declined"].includes(status))
      return res.status(400).json({ message: "Trạng thái không hợp lệ." });
    const friendship = await Friendship.findOne({
      _id: req.params.friendshipId,
      recipientId: req.authenticatedUser._id,
      status: "pending",
    });
    if (!friendship)
      return res
        .status(404)
        .json({ message: "Không tìm thấy lời mời đang chờ." });
    friendship.status = status;
    await friendship.save();
    io.to(`user:${friendship.requesterId}`).emit("friend_request_updated", {
      status,
    });
    res.json({ friendship });
  });

  router.get("/messages/:friendId", async (req, res) => {
    if (!requireDatabase(res)) return;
    if (!(await areFriends(req.authenticatedUser._id, req.params.friendId))) {
      return res
        .status(403)
        .json({ message: "Chỉ nhắn tin với bạn bè đã kết nối." });
    }
    const userId = req.authenticatedUser._id;
    const friendId = req.params.friendId;
    const messages = await DirectMessage.find({
      $or: [
        { senderId: userId, recipientId: friendId },
        { senderId: friendId, recipientId: userId },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    await DirectMessage.updateMany(
      { senderId: friendId, recipientId: userId, readAt: null },
      { $set: { readAt: new Date() } },
    );
    res.json(messages.reverse());
  });

  router.post("/messages/:friendId", sendLimiter, async (req, res) => {
    if (!requireDatabase(res)) return;
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    if (!text || text.length > 1000)
      return res
        .status(400)
        .json({ message: "Tin nhắn phải từ 1 đến 1000 ký tự." });
    if (!(await areFriends(req.authenticatedUser._id, req.params.friendId))) {
      return res
        .status(403)
        .json({ message: "Chỉ nhắn tin với bạn bè đã kết nối." });
    }
    const message = await DirectMessage.create({
      senderId: req.authenticatedUser._id,
      recipientId: req.params.friendId,
      text,
    });
    const payload = {
      id: message.id,
      senderId: String(message.senderId),
      recipientId: String(message.recipientId),
      text: message.text,
      createdAt: message.createdAt,
    };
    io.to(`user:${req.params.friendId}`).emit(
      "receive_direct_message",
      payload,
    );
    res.status(201).json(payload);
  });

  router.get("/challenges", async (req, res) => {
    if (!requireDatabase(res)) return;
    const userId = req.authenticatedUser._id;
    const challenges = await GameChallenge.find({
      $or: [{ senderId: userId }, { recipientId: userId }],
      expiresAt: { $gt: new Date() },
      status: { $in: ["pending", "scheduled", "accepted"] },
    })
      .sort({ updatedAt: -1 })
      .limit(50)
      .populate("senderId", "username displayName")
      .populate("recipientId", "username displayName")
      .lean();
    res.json(
      challenges.map((challenge) => ({
        ...challenge,
        direction:
          String(challenge.recipientId?._id) === String(userId)
            ? "incoming"
            : "outgoing",
      })),
    );
  });

  router.post("/challenges/:friendId", sendLimiter, async (req, res) => {
    if (!requireDatabase(res)) return;
    const senderId = req.authenticatedUser._id;
    const recipientId = req.params.friendId;
    if (
      String(senderId) === String(recipientId) ||
      !(await areFriends(senderId, recipientId))
    ) {
      return res
        .status(403)
        .json({ message: "Chỉ hẹn đấu với bạn bè đã kết nối." });
    }
    const busy = userIsInMatch(recipientId);
    const challenge = await GameChallenge.create({
      senderId,
      recipientId,
      mode: "1v1",
      status: busy ? "scheduled" : "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    io.to(`user:${recipientId}`).emit("friend_challenge", {
      id: challenge.id,
      senderName: req.authenticatedUser.displayName,
      scheduledForAfterMatch: busy,
    });
    res.status(201).json({ challenge, scheduledForAfterMatch: busy });
  });

  router.patch("/challenges/:challengeId", async (req, res) => {
    if (!requireDatabase(res)) return;
    const challenge = await GameChallenge.findOne({
      _id: req.params.challengeId,
      recipientId: req.authenticatedUser._id,
      status: { $in: ["pending", "scheduled"] },
      expiresAt: { $gt: new Date() },
    });
    if (!challenge)
      return res.status(404).json({ message: "Lời hẹn không còn hiệu lực." });
    const action = req.body?.action;
    if (!["accept", "decline"].includes(action))
      return res.status(400).json({ message: "Lựa chọn không hợp lệ." });
    challenge.status =
      action === "decline"
        ? "declined"
        : userIsInMatch(challenge.recipientId)
          ? "scheduled"
          : "accepted";
    await challenge.save();
    io.to(`user:${challenge.senderId}`).emit("friend_challenge_updated", {
      id: challenge.id,
      status: challenge.status,
    });
    res.json({
      challenge,
      waitingForCurrentMatch: challenge.status === "scheduled",
    });
  });

  router.post("/challenges/:challengeId/start", async (req, res) => {
    if (!requireDatabase(res)) return;
    const userId = req.authenticatedUser._id;
    const challenge = await GameChallenge.findOne({
      _id: req.params.challengeId,
      $or: [{ senderId: userId }, { recipientId: userId }],
      status: { $in: ["accepted", "scheduled"] },
      expiresAt: { $gt: new Date() },
    })
      .populate("senderId", "username displayName")
      .populate("recipientId", "username displayName");
    if (!challenge)
      return res
        .status(404)
        .json({ message: "Lời hẹn chưa được chấp nhận hoặc đã hết hạn." });
    if (
      userIsInMatch(challenge.senderId._id) ||
      userIsInMatch(challenge.recipientId._id)
    ) {
      challenge.status = "scheduled";
      await challenge.save();
      return res.status(409).json({
        message: "Một người đang trong trận. Lời hẹn đã được giữ lại.",
      });
    }
    const result = await startChallengeRoom(challenge);
    if (!result)
      return res
        .status(409)
        .json({ message: "Cả hai người cần online để bắt đầu hẹn đấu." });
    challenge.status = "started";
    challenge.roomId = result.roomId;
    await challenge.save();
    res.json(result);
  });

  return router;
};

module.exports = createSocialRouter;
