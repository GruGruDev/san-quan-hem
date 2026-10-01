const crypto = require("crypto");
const express = require("express");
const { rateLimit } = require("express-rate-limit");

const TOPUP_PACKAGES = [
  { id: "hem-100", label: "Gói Khởi Đầu", amountVnd: 10_000, coinAmount: 100 },
  { id: "hem-550", label: "Gói Rủ Bạn", amountVnd: 50_000, coinAmount: 550 },
  {
    id: "hem-1200",
    label: "Gói Đại Hẻm",
    amountVnd: 100_000,
    coinAmount: 1200,
  },
];

const DEFAULT_STORE_ITEMS = [
  {
    itemId: "frame_brass",
    name: "Khung Đồng Hẻm",
    description: "Viền kim loại ấm, phong cách bảng hiệu phố.",
    category: "avatar_frame",
    currency: "xu",
    price: 250,
    style: "brass",
    sortOrder: 10,
  },
  {
    itemId: "background_market",
    name: "Chợ Khuya",
    description: "Ánh đèn vàng của khu ăn vặt lúc lên đèn.",
    category: "profile_background",
    currency: "xu",
    price: 350,
    style: "market",
    sortOrder: 20,
  },
  {
    itemId: "title_regular",
    name: "Dân Hẻm Chính Hiệu",
    description: "Danh hiệu đầu tiên cho khách quen.",
    category: "nameplate",
    currency: "xu",
    price: 500,
    style: "regular",
    sortOrder: 30,
  },
  {
    itemId: "hit_spark",
    name: "Tia Lửa Trúng Đích",
    description: "Hiệu ứng trúng quán.",
    category: "hit_effect",
    currency: "xu",
    price: 450,
    style: "spark",
    sortOrder: 40,
  },
  {
    itemId: "frame_neon",
    name: "Neon Hẻm",
    description: "Khung phát sáng dành cho tay săn quán.",
    category: "avatar_frame",
    currency: "hemCoin",
    price: 100,
    style: "neon",
    sortOrder: 50,
  },
  {
    itemId: "background_river",
    name: "Bến Nước Đêm",
    description: "Phông nền bờ kè thành phố về đêm.",
    category: "profile_background",
    currency: "hemCoin",
    price: 120,
    style: "river",
    sortOrder: 60,
  },
  {
    itemId: "title_hem_chua",
    name: "Chúa Hẻm",
    description: "Danh hiệu premium, chỉ để trang trí.",
    category: "nameplate",
    currency: "hemCoin",
    price: 80,
    style: "hem_chua",
    sortOrder: 70,
  },
  {
    itemId: "miss_ripple",
    name: "Gợn Nước",
    description: "Hiệu ứng trượt mục tiêu.",
    category: "miss_effect",
    currency: "hemCoin",
    price: 80,
    style: "ripple",
    sortOrder: 80,
  },
  {
    itemId: "sunk_fireworks",
    name: "Pháo Hoa Sập Quán",
    description: "Hiệu ứng khi hạ quán đối phương.",
    category: "sunk_effect",
    currency: "hemCoin",
    price: 180,
    style: "fireworks",
    sortOrder: 90,
  },
  {
    itemId: "shop_cavien_neon",
    name: "Cá Viên Neon",
    description: "Skin xe cá viên chiên.",
    category: "shop_skin",
    currency: "hemCoin",
    price: 220,
    style: "cavien_neon",
    sortOrder: 100,
  },
  {
    itemId: "shop_trasua_mint",
    name: "Trà Sữa Bạc Hà",
    description: "Skin tiệm trà sữa.",
    category: "shop_skin",
    currency: "hemCoin",
    price: 220,
    style: "trasua_mint",
    sortOrder: 110,
  },
  {
    itemId: "victory_confetti",
    name: "Ăn Mừng Rực Rỡ",
    description: "Hiệu ứng chiến thắng.",
    category: "victory_effect",
    currency: "hemCoin",
    price: 150,
    style: "confetti",
    sortOrder: 120,
  },
];

const PAYMENT_SETTINGS = {
  bankCode: process.env.PAYMENT_BANK_CODE || "timo",
  accountNumber: process.env.PAYMENT_ACCOUNT_NUMBER || "9021299047706",
  accountName: process.env.PAYMENT_ACCOUNT_NAME || "NGUYEN TRI TAI",
};
const ACHIEVEMENTS = [
  {
    id: "first-match",
    title: "Lần đầu xuống hẻm",
    description: "Hoàn thành trận đầu tiên.",
    reward: 100,
    eligible: (user) => user.matches >= 1,
  },
  {
    id: "five-wins",
    title: "Khách quen có số",
    description: "Thắng 5 trận.",
    reward: 250,
    eligible: (user) => user.wins >= 5,
  },
  {
    id: "ten-matches",
    title: "Dân hẻm kỳ cựu",
    description: "Hoàn thành 10 trận.",
    reward: 200,
    eligible: (user) => user.matches >= 10,
  },
];

const seedStoreCatalog = async (StoreItem) => {
  await StoreItem.bulkWrite(
    DEFAULT_STORE_ITEMS.map((item) => ({
      updateOne: {
        filter: { itemId: item.itemId },
        update: { $setOnInsert: item },
        upsert: true,
      },
    })),
  );
};

const createEconomyRouter = ({
  User,
  StoreItem,
  WalletLedger,
  PaymentOrder,
  DailyRewardClaim,
  requireAuthenticatedUser,
  webhookApiKey,
}) => {
  const router = express.Router();
  const writeLimiter = rateLimit({
    windowMs: 60_000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau." },
  });
  const requireDatabase = (res) => {
    if (User.db.readyState === 1) return true;
    res.status(503).json({ message: "Cơ sở dữ liệu chưa sẵn sàng." });
    return false;
  };

  router.get("/config", (req, res) => {
    res.json({
      packages: TOPUP_PACKAGES,
      bank: PAYMENT_SETTINGS,
      topupsEnabled: Boolean(PAYMENT_SETTINGS.accountNumber),
      autoConfirmationEnabled: Boolean(webhookApiKey),
    });
  });

  router.post("/webhook/sepay", async (req, res) => {
    if (!webhookApiKey) {
      return res
        .status(503)
        .json({ message: "Chưa cấu hình xác nhận giao dịch tự động." });
    }
    const authorization = req.get("authorization") || "";
    const expected = `Apikey ${webhookApiKey}`;
    const providedBuffer = Buffer.from(authorization);
    const expectedBuffer = Buffer.from(expected);
    if (
      providedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      return res.status(401).json({ message: "Webhook không được xác thực." });
    }
    if (!requireDatabase(res)) return;

    const payload = req.body || {};
    const providerTransactionId = String(
      payload.id || payload.transactionId || "",
    ).trim();
    const transferType = String(
      payload.transferType || payload.type || "",
    ).toLowerCase();
    const amountVnd = Number(payload.transferAmount ?? payload.amount);
    const content = String(
      payload.content || payload.description || "",
    ).toUpperCase();
    if (
      !providerTransactionId ||
      transferType !== "in" ||
      !Number.isSafeInteger(amountVnd) ||
      amountVnd < 1
    ) {
      return res
        .status(400)
        .json({ message: "Dữ liệu giao dịch không hợp lệ." });
    }
    if (await PaymentOrder.exists({ providerTransactionId })) {
      return res.json({ received: true, duplicate: true });
    }

    const normalizedContent = content.replace(/[^A-Z0-9]/g, "");
    const pendingOrders = await PaymentOrder.find({
      status: "pending",
      amountVnd,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const order = pendingOrders.find((candidate) =>
      normalizedContent.includes(candidate.orderCode),
    );
    if (!order) return res.json({ received: true, matched: false });

    const session = await User.startSession();
    try {
      await session.withTransaction(async () => {
        const claimed = await PaymentOrder.updateOne(
          { _id: order._id, status: "pending", expiresAt: { $gt: new Date() } },
          {
            $set: {
              status: "credited",
              provider: "sepay",
              providerTransactionId,
              paidAt: new Date(),
            },
          },
          { session },
        );
        if (claimed.modifiedCount !== 1) return;

        const user = await User.findByIdAndUpdate(
          order.userId,
          { $inc: { hemCoinBalance: order.coinAmount } },
          { new: true, session },
        );
        if (!user) throw new Error("Tài khoản nhận tiền không tồn tại.");
        await WalletLedger.create(
          [
            {
              userId: user._id,
              currency: "hemCoin",
              delta: order.coinAmount,
              balanceAfter: user.hemCoinBalance,
              type: "topup",
              reference: `topup:${providerTransactionId}`,
              description: `Nạp ${order.coinAmount} Hẻm Coin`,
            },
          ],
          { session },
        );
      });
    } catch (error) {
      if (error.code === 11000)
        return res.json({ received: true, duplicate: true });
      console.error("SePay webhook settlement failed:", error.message);
      return res.status(500).json({ message: "Chưa thể đối soát giao dịch." });
    } finally {
      await session.endSession();
    }
    res.json({ received: true, matched: true });
  });

  router.use(requireAuthenticatedUser);

  router.get("/me", async (req, res) => {
    if (!requireDatabase(res)) return;
    const day = new Date().toISOString().slice(0, 10);
    const [user, transactions, dailyClaim] = await Promise.all([
      User.findById(req.authenticatedUser._id)
        .select(
          "xuBalance hemCoinBalance freeNameChangeAvailable inventory equippedCosmetics",
        )
        .lean(),
      WalletLedger.find({ userId: req.authenticatedUser._id })
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
      DailyRewardClaim.exists({ userId: req.authenticatedUser._id, day }),
    ]);
    res.json({
      xuBalance: user.xuBalance || 0,
      hemCoinBalance: user.hemCoinBalance || 0,
      freeNameChangeAvailable: user.freeNameChangeAvailable !== false,
      inventory: user.inventory || [],
      equippedCosmetics: user.equippedCosmetics || [],
      transactions,
      dailyRewardAvailable: !dailyClaim,
    });
  });

  router.get("/achievements", async (req, res) => {
    if (!requireDatabase(res)) return;
    const user = await User.findById(req.authenticatedUser._id)
      .select("wins matches achievementClaims")
      .lean();
    const claimed = new Set(user?.achievementClaims || []);
    res.json(
      ACHIEVEMENTS.map((achievement) => ({
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        reward: achievement.reward,
        unlocked: achievement.eligible(user || { wins: 0, matches: 0 }),
        claimed: claimed.has(achievement.id),
      })),
    );
  });

  router.post(
    "/achievements/:achievementId/claim",
    writeLimiter,
    async (req, res) => {
      if (!requireDatabase(res)) return;
      const achievement = ACHIEVEMENTS.find(
        (entry) => entry.id === req.params.achievementId,
      );
      if (!achievement)
        return res.status(404).json({ message: "Không tìm thấy thành tích." });
      const session = await User.startSession();
      let wallet;
      try {
        await session.withTransaction(async () => {
          const user = await User.findById(req.authenticatedUser._id).session(
            session,
          );
          if (!user || !achievement.eligible(user)) {
            throw Object.assign(new Error("Bạn chưa đạt mốc thành tích này."), {
              status: 403,
            });
          }
          if (user.achievementClaims.includes(achievement.id)) {
            throw Object.assign(new Error("Thành tích này đã nhận thưởng."), {
              status: 409,
            });
          }
          user.achievementClaims.push(achievement.id);
          user.xuBalance = (user.xuBalance || 0) + achievement.reward;
          await user.save({ session });
          await WalletLedger.create(
            [
              {
                userId: user._id,
                currency: "xu",
                delta: achievement.reward,
                balanceAfter: user.xuBalance,
                type: "achievement",
                reference: `achievement:${user._id}:${achievement.id}`,
                description: `Thành tích: ${achievement.title}`,
              },
            ],
            { session },
          );
          wallet = {
            xuBalance: user.xuBalance,
            hemCoinBalance: user.hemCoinBalance || 0,
          };
        });
      } catch (error) {
        if (error.status)
          return res.status(error.status).json({ message: error.message });
        if (error.code === 11000)
          return res.status(409).json({ message: "Thành tích đã được nhận." });
        console.error("Achievement reward failed:", error.message);
        return res
          .status(500)
          .json({ message: "Không thể nhận thưởng thành tích." });
      } finally {
        await session.endSession();
      }
      res.json({
        achievementId: achievement.id,
        reward: achievement.reward,
        wallet,
      });
    },
  );

  router.get("/items", async (req, res) => {
    if (!requireDatabase(res)) return;
    const items = await StoreItem.find({ active: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
    const user = await User.findById(req.authenticatedUser._id)
      .select("inventory equippedCosmetics xuBalance hemCoinBalance")
      .lean();
    res.json({
      items,
      inventory: user?.inventory || [],
      equippedCosmetics: user?.equippedCosmetics || [],
      wallet: {
        xuBalance: user?.xuBalance || 0,
        hemCoinBalance: user?.hemCoinBalance || 0,
      },
    });
  });

  router.post("/purchase", writeLimiter, async (req, res) => {
    if (!requireDatabase(res)) return;
    const itemId = typeof req.body?.itemId === "string" ? req.body.itemId : "";
    const session = await User.startSession();
    let response;
    try {
      await session.withTransaction(async () => {
        const [item, user] = await Promise.all([
          StoreItem.findOne({ itemId, active: true }).session(session),
          User.findById(req.authenticatedUser._id).session(session),
        ]);
        if (!item)
          throw Object.assign(new Error("Món này hiện không bán."), {
            status: 404,
          });
        if (!user)
          throw Object.assign(new Error("Không tìm thấy tài khoản."), {
            status: 404,
          });
        if (user.inventory.some((entry) => entry.itemId === item.itemId)) {
          throw Object.assign(new Error("Bạn đã sở hữu món này."), {
            status: 409,
          });
        }
        const balanceField =
          item.currency === "xu" ? "xuBalance" : "hemCoinBalance";
        const balance = user[balanceField] || 0;
        if (balance < item.price) {
          throw Object.assign(new Error("Số dư chưa đủ."), { status: 402 });
        }
        user[balanceField] = balance - item.price;
        user.inventory.push({ itemId: item.itemId, quantity: 1 });
        await user.save({ session });
        await WalletLedger.create(
          [
            {
              userId: user._id,
              currency: item.currency,
              delta: -item.price,
              balanceAfter: user[balanceField],
              type: "purchase",
              reference: `purchase:${user._id}:${item.itemId}`,
              description: `Mua ${item.name}`,
            },
          ],
          { session },
        );
        response = {
          itemId: item.itemId,
          wallet: {
            xuBalance: user.xuBalance,
            hemCoinBalance: user.hemCoinBalance,
          },
          inventory: user.inventory,
        };
      });
    } catch (error) {
      if (error.status)
        return res.status(error.status).json({ message: error.message });
      if (error.code === 11000)
        return res.status(409).json({ message: "Giao dịch đã được xử lý." });
      console.error("Store purchase failed:", error.message);
      return res.status(500).json({ message: "Chưa thể hoàn tất giao dịch." });
    } finally {
      await session.endSession();
    }
    res.json(response);
  });

  router.post("/equip", writeLimiter, async (req, res) => {
    if (!requireDatabase(res)) return;
    const itemId = typeof req.body?.itemId === "string" ? req.body.itemId : "";
    const item = await StoreItem.findOne({ itemId, active: true }).select(
      "itemId category",
    );
    if (!item)
      return res.status(404).json({ message: "Không tìm thấy vật phẩm." });
    const user = await User.findOne({
      _id: req.authenticatedUser._id,
      "inventory.itemId": itemId,
    });
    if (!user)
      return res.status(403).json({ message: "Bạn chưa sở hữu vật phẩm này." });
    user.equippedCosmetics = (user.equippedCosmetics || []).filter(
      (cosmetic) => cosmetic.slot !== item.category,
    );
    user.equippedCosmetics.push({ slot: item.category, itemId });
    await user.save();
    res.json({ equippedCosmetics: user.equippedCosmetics });
  });

  router.post("/unequip", writeLimiter, async (req, res) => {
    if (!requireDatabase(res)) return;
    const slot = req.body?.slot;
    const allowedSlots = [
      "avatar_frame",
      "profile_background",
      "nameplate",
      "hit_effect",
      "miss_effect",
      "sunk_effect",
      "shop_skin",
      "victory_effect",
    ];
    if (!allowedSlots.includes(slot)) {
      return res.status(400).json({ message: "Ô trang bị không hợp lệ." });
    }
    const user = await User.findById(req.authenticatedUser._id);
    if (!user)
      return res.status(404).json({ message: "Không tìm thấy tài khoản." });
    user.equippedCosmetics = (user.equippedCosmetics || []).filter(
      (cosmetic) => cosmetic.slot !== slot,
    );
    await user.save();
    res.json({ equippedCosmetics: user.equippedCosmetics });
  });

  router.post("/daily/claim", writeLimiter, async (req, res) => {
    if (!requireDatabase(res)) return;
    const day = new Date().toISOString().slice(0, 10);
    const reward = 50;
    const session = await User.startSession();
    let wallet;
    try {
      await session.withTransaction(async () => {
        await DailyRewardClaim.create(
          [{ userId: req.authenticatedUser._id, day, reward }],
          { session },
        );
        const user = await User.findByIdAndUpdate(
          req.authenticatedUser._id,
          { $inc: { xuBalance: reward } },
          { new: true, session },
        );
        await WalletLedger.create(
          [
            {
              userId: user._id,
              currency: "xu",
              delta: reward,
              balanceAfter: user.xuBalance,
              type: "daily_reward",
              reference: `daily:${user._id}:${day}`,
              description: "Thưởng điểm danh hằng ngày",
            },
          ],
          { session },
        );
        wallet = {
          xuBalance: user.xuBalance,
          hemCoinBalance: user.hemCoinBalance || 0,
        };
      });
    } catch (error) {
      if (error.code === 11000)
        return res.status(409).json({ message: "Bạn đã nhận Xu Hẻm hôm nay." });
      console.error("Daily reward failed:", error.message);
      return res
        .status(500)
        .json({ message: "Chưa thể nhận thưởng hằng ngày." });
    } finally {
      await session.endSession();
    }
    res.json({ reward, wallet });
  });

  router.post("/topups", writeLimiter, async (req, res) => {
    if (!requireDatabase(res)) return;
    const pack = TOPUP_PACKAGES.find(
      (entry) => entry.id === req.body?.packageId,
    );
    if (!pack)
      return res.status(400).json({ message: "Gói nạp không hợp lệ." });
    const orderCode = `HEM${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
    const order = await PaymentOrder.create({
      orderCode,
      userId: req.authenticatedUser._id,
      packageId: pack.id,
      amountVnd: pack.amountVnd,
      coinAmount: pack.coinAmount,
      provider: webhookApiKey ? "sepay" : "manual",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    const accountName = encodeURIComponent(PAYMENT_SETTINGS.accountName);
    const qrUrl = `https://img.vietqr.io/image/${PAYMENT_SETTINGS.bankCode}-${PAYMENT_SETTINGS.accountNumber}-compact2.png?amount=${pack.amountVnd}&addInfo=${orderCode}&accountName=${accountName}`;
    res.status(201).json({
      orderId: order.id,
      orderCode,
      amountVnd: pack.amountVnd,
      coinAmount: pack.coinAmount,
      expiresAt: order.expiresAt,
      status: order.status,
      bank: PAYMENT_SETTINGS,
      qrUrl,
      autoConfirmationEnabled: Boolean(webhookApiKey),
    });
  });

  router.get("/topups", async (req, res) => {
    if (!requireDatabase(res)) return;
    await PaymentOrder.updateMany(
      {
        userId: req.authenticatedUser._id,
        status: "pending",
        expiresAt: { $lte: new Date() },
      },
      { $set: { status: "expired" } },
    );
    const orders = await PaymentOrder.find({
      userId: req.authenticatedUser._id,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select(
        "orderCode packageId amountVnd coinAmount status expiresAt paidAt createdAt",
      )
      .lean();
    res.json(orders);
  });

  return router;
};

module.exports = {
  createEconomyRouter,
  seedStoreCatalog,
  TOPUP_PACKAGES,
  DEFAULT_STORE_ITEMS,
};
