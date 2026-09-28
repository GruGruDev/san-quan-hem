require("dotenv").config();

const express = require("express");
const crypto = require("crypto");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");
const nodemailer = require("nodemailer");
const User = require("./models/User");

// --- BÍ MẬT LẤY TỪ BIẾN MÔI TRƯỜNG (.env / Render Dashboard) ---
const { MONGO_URI, JWT_SECRET } = process.env;
if (!MONGO_URI || !JWT_SECRET || JWT_SECRET.length < 32) {
  console.error(
    "❌ Cần MONGO_URI và JWT_SECRET dài ít nhất 32 ký tự trong .env / biến môi trường!",
  );
  process.exit(1);
}

const SMTP_PORT = Number.parseInt(process.env.SMTP_PORT || "587", 10);
const mailTransport =
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS &&
  process.env.SMTP_FROM &&
  Number.isInteger(SMTP_PORT) &&
  SMTP_PORT > 0 &&
  SMTP_PORT <= 65_535
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: SMTP_PORT,
        secure: process.env.SMTP_SECURE === "true" || SMTP_PORT === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    : null;

const getUtcWeekStart = (date = new Date()) => {
  const weekStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  weekStart.setUTCDate(
    weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7),
  );
  return weekStart;
};

const updatePlayerStats = (userId, isWinner) => {
  const weekStart = getUtcWeekStart();
  const weeklyMatches = {
    $cond: [
      { $eq: ["$weeklyWeekStart", weekStart] },
      { $add: [{ $ifNull: ["$weeklyMatches", 0] }, 1] },
      1,
    ],
  };
  const weeklyWins = {
    $cond: [
      { $eq: ["$weeklyWeekStart", weekStart] },
      { $add: [{ $ifNull: ["$weeklyWins", 0] }, isWinner ? 1 : 0] },
      isWinner ? 1 : 0,
    ],
  };

  return User.findByIdAndUpdate(userId, [
    {
      $set: {
        matches: { $add: [{ $ifNull: ["$matches", 0] }, 1] },
        wins: { $add: [{ $ifNull: ["$wins", 0] }, isWinner ? 1 : 0] },
        weeklyMatches,
        weeklyWins,
        weeklyWeekStart: weekStart,
      },
    },
  ]);
};

const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const isValidEmail = (value) =>
  value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const getRecoveryEmail = (user) => {
  const email = normalizeEmail(user.email);
  if (isValidEmail(email)) return email;
  const username = normalizeEmail(user.username);
  return isValidEmail(username) ? username : null;
};

const hashPasswordResetCode = (userId, code) =>
  crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${userId}:${code}`)
    .digest("hex");

const matchesPasswordResetCode = (userId, code, storedHash) => {
  if (typeof storedHash !== "string") return false;
  const expected = Buffer.from(storedHash, "hex");
  const actual = Buffer.from(hashPasswordResetCode(userId, code), "hex");
  return (
    expected.length === actual.length &&
    crypto.timingSafeEqual(expected, actual)
  );
};

const ALLOWED_ORIGINS = (
  process.env.CLIENT_ORIGINS ||
  "https://san-quan-hem.vercel.app,http://localhost:5173,http://localhost:3000"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();
app.set("trust proxy", 1);
app.use(express.json());
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Quá nhiều lần thử. Vui lòng đợi 15 phút rồi thử lại." },
});

const passwordResetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Quá nhiều yêu cầu gửi mã. Vui lòng thử lại sau." },
});

const passwordResetVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Quá nhiều lần nhập mã. Vui lòng thử lại sau." },
});

// --- KẾT NỐI MONGODB ATLAS CLOUD ---
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Đã kết nối MongoDB Atlas Cloud thành công!"))
  .catch((err) => console.error("❌ Lỗi kết nối MongoDB Atlas:", err.message));

// --- API AUTHENTICATION ---
app.post("/api/register", authLimiter, async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body || {};
    const normalizedEmail = normalizeEmail(email);
    if (
      typeof username !== "string" ||
      username.trim().length < 3 ||
      username.trim().length > 32 ||
      !isValidEmail(normalizedEmail) ||
      typeof password !== "string" ||
      password.length < 8 ||
      Buffer.byteLength(password, "utf8") > 72 ||
      (displayName !== undefined &&
        (typeof displayName !== "string" || displayName.trim().length > 32))
    ) {
      return res
        .status(400)
        .json({ message: "Thông tin đăng ký không hợp lệ." });
    }

    const normalizedUsername = username.trim();
    const normalizedDisplayName = displayName?.trim() || normalizedUsername;

    const existingUser = await User.findOne({
      $or: [{ username: normalizedUsername }, { email: normalizedEmail }],
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Tên tài khoản hoặc email đã được sử dụng!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      displayName: normalizedDisplayName,
    });
    await newUser.save();

    const token = jwt.sign(
      {
        userId: newUser._id.toString(),
        username: normalizedUsername,
        tokenVersion: newUser.tokenVersion,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );
    res.json({
      token,
      user: {
        id: newUser._id,
        displayName: newUser.displayName,
        wins: newUser.wins,
        matches: newUser.matches,
      },
    });
  } catch (err) {
    console.error("Register Error:", err);
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ message: "Tên tài khoản hoặc email đã được sử dụng!" });
    }
    res.status(500).json({ message: "Lỗi máy chủ!" });
  }
});

app.post("/api/login", authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (
      typeof username !== "string" ||
      !username.trim() ||
      username.length > 32 ||
      typeof password !== "string" ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res
        .status(400)
        .json({ message: "Tài khoản hoặc mật khẩu không đúng!" });
    }

    const normalizedUsername = username.trim();
    const user = await User.findOne({ username: normalizedUsername });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Tài khoản hoặc mật khẩu không đúng!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Tài khoản hoặc mật khẩu không đúng!" });
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        username: normalizedUsername,
        tokenVersion: user.tokenVersion || 0,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );
    res.json({
      token,
      user: {
        id: user._id,
        displayName: user.displayName,
        wins: user.wins,
        matches: user.matches,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Lỗi máy chủ!" });
  }
});

app.post("/api/forgot-password", async (req, res) => {
  res.status(410).json({
    message:
      "Endpoint cũ đã ngừng hoạt động. Hãy dùng luồng gửi mã OTP qua email.",
  });
});

app.post(
  "/api/password-reset/request",
  passwordResetRequestLimiter,
  async (req, res) => {
    if (!mailTransport) {
      return res.status(503).json({
        message: "Dịch vụ email khôi phục chưa được cấu hình trên máy chủ.",
      });
    }

    const { username } = req.body || {};
    if (
      typeof username !== "string" ||
      !username.trim() ||
      username.length > 254
    ) {
      return res.status(400).json({ message: "Tên tài khoản không hợp lệ." });
    }

    const genericMessage =
      "Nếu tài khoản có email khôi phục, mã xác minh sẽ được gửi đến địa chỉ đó.";

    try {
      const user = await User.findOne({ username: username.trim() });
      if (!user) return res.json({ message: genericMessage });

      const email = getRecoveryEmail(user);
      if (!email) return res.json({ message: genericMessage });

      const now = new Date();
      const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
      const updatedUser = await User.findOneAndUpdate(
        {
          _id: user._id,
          $or: [
            { passwordResetRequestedAt: { $exists: false } },
            {
              passwordResetRequestedAt: {
                $lte: new Date(now.getTime() - 60_000),
              },
            },
          ],
        },
        {
          $set: {
            passwordResetOtpHash: hashPasswordResetCode(user._id, code),
            passwordResetOtpExpiresAt: new Date(now.getTime() + 10 * 60_000),
            passwordResetOtpAttempts: 0,
            passwordResetRequestedAt: now,
          },
        },
        { new: true },
      );
      if (!updatedUser) return res.json({ message: genericMessage });

      try {
        await mailTransport.sendMail({
          from: process.env.SMTP_FROM,
          to: email,
          subject: "Mã xác minh đặt lại mật khẩu",
          text: `Mã xác minh của bạn là ${code}. Mã hết hạn sau 10 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.`,
        });
      } catch (err) {
        await User.updateOne(
          { _id: user._id },
          {
            $unset: {
              passwordResetOtpHash: 1,
              passwordResetOtpExpiresAt: 1,
              passwordResetOtpAttempts: 1,
              passwordResetRequestedAt: 1,
            },
          },
        );
        console.error("Password reset email delivery failed.");
        return res.status(503).json({
          message: "Không gửi được email lúc này. Vui lòng thử lại sau.",
        });
      }

      res.json({ message: genericMessage });
    } catch (err) {
      console.error("Password reset request failed:", err.message);
      res.status(500).json({ message: "Lỗi máy chủ!" });
    }
  },
);

app.post(
  "/api/password-reset/verify",
  passwordResetVerifyLimiter,
  async (req, res) => {
    const { username, code, newPassword } = req.body || {};
    if (
      typeof username !== "string" ||
      !username.trim() ||
      username.length > 254 ||
      typeof code !== "string" ||
      !/^\d{6}$/.test(code) ||
      typeof newPassword !== "string" ||
      newPassword.length < 8 ||
      Buffer.byteLength(newPassword, "utf8") > 72
    ) {
      return res
        .status(400)
        .json({ message: "Thông tin xác minh không hợp lệ." });
    }

    try {
      const user = await User.findOne({ username: username.trim() }).select(
        "+passwordResetOtpHash +passwordResetOtpExpiresAt +passwordResetOtpAttempts",
      );
      const now = new Date();
      if (
        !user ||
        !user.passwordResetOtpHash ||
        !user.passwordResetOtpExpiresAt ||
        user.passwordResetOtpExpiresAt <= now ||
        (user.passwordResetOtpAttempts || 0) >= 5
      ) {
        return res.status(400).json({
          message: "Mã không hợp lệ hoặc đã hết hạn. Hãy yêu cầu mã mới.",
        });
      }

      const otpMatches = matchesPasswordResetCode(
        user._id,
        code,
        user.passwordResetOtpHash,
      );
      if (!otpMatches) {
        const updatedUser = await User.findOneAndUpdate(
          {
            _id: user._id,
            passwordResetOtpHash: user.passwordResetOtpHash,
            passwordResetOtpExpiresAt: { $gt: now },
            passwordResetOtpAttempts: { $lt: 5 },
          },
          { $inc: { passwordResetOtpAttempts: 1 } },
          { new: true },
        ).select("+passwordResetOtpAttempts");

        if (updatedUser?.passwordResetOtpAttempts >= 5) {
          await User.updateOne(
            { _id: user._id },
            {
              $unset: {
                passwordResetOtpHash: 1,
                passwordResetOtpExpiresAt: 1,
                passwordResetOtpAttempts: 1,
                passwordResetRequestedAt: 1,
              },
            },
          );
        }

        return res.status(400).json({
          message: "Mã không hợp lệ hoặc đã hết hạn. Hãy yêu cầu mã mới.",
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updatedUser = await User.findOneAndUpdate(
        {
          _id: user._id,
          passwordResetOtpHash: user.passwordResetOtpHash,
          passwordResetOtpExpiresAt: { $gt: now },
          passwordResetOtpAttempts: { $lt: 5 },
        },
        {
          $set: { password: hashedPassword },
          $inc: { tokenVersion: 1 },
          $unset: {
            passwordResetOtpHash: 1,
            passwordResetOtpExpiresAt: 1,
            passwordResetOtpAttempts: 1,
            passwordResetRequestedAt: 1,
          },
        },
        { new: true },
      );

      if (!updatedUser) {
        return res.status(400).json({
          message: "Mã không hợp lệ hoặc đã hết hạn. Hãy yêu cầu mã mới.",
        });
      }

      io.in(`user:${user._id}`).disconnectSockets(true);
      res.json({ message: "Đặt lại mật khẩu thành công. Hãy đăng nhập lại." });
    } catch (err) {
      console.error("Password reset verification failed:", err.message);
      res.status(500).json({ message: "Lỗi máy chủ!" });
    }
  },
);

app.get("/api/leaderboard", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const weekly = req.query.period === "week";
    const topUsers = await User.find(
      weekly ? { weeklyWeekStart: getUtcWeekStart() } : {},
    )
      .select("displayName wins matches weeklyWins weeklyMatches")
      .sort(
        weekly
          ? { weeklyWins: -1, weeklyMatches: 1 }
          : { wins: -1, matches: 1 },
      )
      .limit(10);
    res.json(
      topUsers.map((user) => {
        const result = user.toObject();
        if (weekly) {
          result.wins = result.weeklyWins || 0;
          result.matches = result.weeklyMatches || 0;
        }
        return result;
      }),
    );
  } catch (err) {
    console.error("Leaderboard Error:", err.message);
    res.json([]);
  }
});

// --- GAME SOCKET.IO LOGIC ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGINS, methods: ["GET", "POST"] },
});

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    socket.data.userId = null;
    return next();
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (typeof payload.userId !== "string") {
      return next(new Error("Token tài khoản không hợp lệ."));
    }

    const user = await User.findById(payload.userId).select("tokenVersion");
    if (!user || (payload.tokenVersion || 0) !== (user.tokenVersion || 0)) {
      return next(
        new Error("Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại."),
      );
    }

    socket.data.userId = user._id.toString();
    next();
  } catch {
    next(new Error("Phiên đăng nhập không hợp lệ hoặc đã hết hạn."));
  }
});

const getPlayerName = (value) =>
  typeof value === "string" && value.trim()
    ? value.trim().slice(0, 32)
    : "Phượt Thủ";

const isSocketPayload = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

let waitingPlayer = null;
let searchTimer = null;
const activeRooms = {};

// HÀM 1: Random chọn 3 quán cho mỗi trận (chỉ 2ô, 3ô, 4ô)
const selectRandomShops = () => {
  const pool2 = [
    {
      id: "cavien",
      name: "Xe Cá Viên Chiên",
      size: 2,
      icon: "/cavienchien.png",
    },
  ];
  const pool3 = [
    { id: "trasua", name: "Tiệm Trà Sữa", size: 3, icon: "/trasua.png" },
    { id: "bunrieu", name: "Gánh Bún Riêu", size: 3, icon: "/bunrieu.png" },
  ];
  const pool4 = [
    { id: "quanoc", name: "Quán Ốc Quen", size: 4, icon: "/donuong.png" },
    { id: "quannhau", name: "Khu Nhậu Vỉa Hè", size: 4, icon: "/quannhau.png" },
  ];

  const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
  return [pickRandom(pool2), pickRandom(pool3), pickRandom(pool4)];
};

// HÀM 2: Bot đặt quán dựa trên 3 quán đã chọn
const generateBotBoard = (shops) => {
  const board = Array(64).fill(null);
  shops.forEach((shop) => {
    let placed = false;
    while (!placed) {
      const isHorizontal = Math.random() < 0.5;
      const startIndex = Math.floor(Math.random() * 64);
      let row = Math.floor(startIndex / 8);
      let col = startIndex % 8;

      if (isHorizontal && col + shop.size > 8) col = 8 - shop.size;
      if (!isHorizontal && row + shop.size > 8) row = 8 - shop.size;

      const adjustedIndex = row * 8 + col;
      const indices = [];
      for (let i = 0; i < shop.size; i++) {
        indices.push(isHorizontal ? adjustedIndex + i : adjustedIndex + i * 8);
      }

      const isOverlap = indices.some((idx) => board[idx] !== null);
      if (!isOverlap) {
        indices.forEach((idx) => {
          board[idx] = { shopId: shop.id, icon: shop.icon, name: shop.name };
        });
        placed = true;
      }
    }
  });
  return board;
};

// HÀM 3: Kiểm tra & làm sạch sơ đồ do client gửi lên.
// - Đúng 3 quán của phòng, đúng số ô, nằm thẳng hàng liền nhau (ngang hoặc dọc)
// - Xây lại bàn cờ từ đầu để loại bỏ mọi cờ "shot" do client tự gắn
const sanitizeBoard = (board, shops) => {
  if (!Array.isArray(board) || board.length !== 64) return null;

  const clean = Array(64).fill(null);
  const indicesByShop = {};

  for (let i = 0; i < 64; i++) {
    const cell = board[i];
    if (cell === null || cell === undefined) continue;

    const shop = shops.find((s) => s.id === cell.shopId);
    if (!shop) return null;

    if (!indicesByShop[shop.id]) indicesByShop[shop.id] = [];
    indicesByShop[shop.id].push(i);
    clean[i] = { shopId: shop.id, icon: shop.icon, name: shop.name };
  }

  for (const shop of shops) {
    const idxs = indicesByShop[shop.id];
    if (!idxs || idxs.length !== shop.size) return null;

    const first = idxs[0];
    const last = idxs[idxs.length - 1];
    const isHorizontal =
      Math.floor(first / 8) === Math.floor(last / 8) &&
      idxs.every((v, k) => k === 0 || v === idxs[k - 1] + 1);
    const isVertical = idxs.every((v, k) => k === 0 || v === idxs[k - 1] + 8);

    if (!isHorizontal && !isVertical) return null;
  }

  return clean;
};

const triggerBotShot = (roomId) => {
  const room = activeRooms[roomId];
  if (!room || room.gameState !== "PLAYING" || room.turn !== room.botSocketId)
    return;

  const playerSocketId = Object.keys(room.players).find(
    (id) => id !== room.botSocketId,
  );
  const playerBoard = room.players[playerSocketId].board;

  const availableIndices = playerBoard
    .map((cell, idx) => (cell && cell.shot ? null : idx))
    .filter((idx) => idx !== null);
  if (availableIndices.length === 0) return;

  const targetIndex =
    availableIndices[Math.floor(Math.random() * availableIndices.length)];
  const targetCell = playerBoard[targetIndex];

  // 🎯 PHÁT TÍN HIỆU KÍNH NGẮM CHO NGƯỜI CHƠI THẤY
  io.to(playerSocketId).emit("opponent_aiming", targetIndex);

  // ⏳ Đợi 1 giây (1000ms) để tạo áp lực tâm lý rồi mới bóp cò
  setTimeout(() => {
    // Kéo dữ liệu room lại một lần nữa để tránh lỗi nếu người chơi thoát game trong lúc Bot đang ngắm
    const currentRoom = activeRooms[roomId];
    if (!currentRoom || currentRoom.gameState !== "PLAYING") return;

    const isHit = !!(targetCell && targetCell.shopId !== undefined);
    let sunkShopId = null;

    if (isHit) {
      targetCell.shot = "HIT";
      const shopId = targetCell.shopId;
      const sameShopCells = playerBoard.filter((c) => c && c.shopId === shopId);
      if (sameShopCells.every((c) => c.shot === "HIT")) sunkShopId = shopId;
    } else {
      playerBoard[targetIndex] = { shot: "MISS" };
    }

    const nextTurn = isHit ? currentRoom.botSocketId : playerSocketId;
    currentRoom.turn = nextTurn;

    io.to(roomId).emit("shot_result", {
      shooter: currentRoom.botSocketId,
      targetIndex,
      isHit,
      sunkShopId,
      nextTurn,
    });

    // Kiểm tra xem Bot đã thắng chưa
    if (
      playerBoard.every((cell) => !cell || !cell.shopId || cell.shot === "HIT")
    ) {
      currentRoom.gameState = "FINISHED";
      io.to(roomId).emit("game_over", { winner: currentRoom.botSocketId });
    } else if (isHit && nextTurn === currentRoom.botSocketId) {
      // Nếu bắn trúng, Bot được bắn tiếp sau 2.5 giây
      setTimeout(() => triggerBotShot(roomId), 2500);
    }
  }, 1000);
};

// Đưa phòng về trạng thái xếp quán cho ván tái đấu (bốc lại 3 quán mới)
const resetRoomForRematch = (room) => {
  room.shops = selectRandomShops();
  room.gameState = "SETUP";
  room.turn = null;

  Object.values(room.players).forEach((p) => {
    p.rematch = false;
    if (room.isBotRoom && p.socketId === room.botSocketId) {
      p.board = generateBotBoard(room.shops);
      p.ready = true;
    } else {
      p.board = [];
      p.ready = false;
    }
  });
};

// --- CHÍNH TẮC SOCKET CONNECTION SCOPE ---
io.on("connection", (socket) => {
  if (socket.data.userId) socket.join(`user:${socket.data.userId}`);
  console.log(`🔌 Người chơi kết nối: ${socket.id}`);

  // Tìm đối thủ ghép ngẫu nhiên
  socket.on("tim_doi_thu", (data = {}) => {
    if (!isSocketPayload(data)) return;
    const playerName = getPlayerName(data.name);
    const userId = socket.data.userId;

    // Đang chờ rồi thì bỏ qua, tránh tạo thêm timer thừa
    if (waitingPlayer && waitingPlayer.socketId === socket.id) return;

    if (waitingPlayer && waitingPlayer.socketId !== socket.id) {
      if (userId && waitingPlayer.userId === userId) {
        socket.emit(
          "waiting_for_opponent",
          "Phát hiện trùng tài khoản! Đang chờ phượt thủ khác...",
        );
        return;
      }

      if (searchTimer) clearTimeout(searchTimer);

      const roomId = `room_${Date.now()}`;
      const player1 = waitingPlayer;
      const player2 = { socketId: socket.id, name: playerName, userId };

      const roomShops = selectRandomShops();

      activeRooms[roomId] = {
        players: {
          [player1.socketId]: {
            socketId: player1.socketId,
            name: player1.name,
            userId: player1.userId,
            team: "red",
            board: [],
            ready: false,
          },
          [player2.socketId]: {
            ...player2,
            team: "blue",
            board: [],
            ready: false,
          },
        },
        shops: roomShops,
        gameState: "SETUP",
        turn: null,
        isBotRoom: false,
      };

      player1.socket.join(roomId);
      socket.join(roomId);

      player1.socket.emit("match_found", {
        roomId,
        team: "red",
        shops: roomShops,
        message: "Đã tìm thấy đối thủ!",
      });
      socket.emit("match_found", {
        roomId,
        team: "blue",
        shops: roomShops,
        message: "Đã tìm thấy đối thủ!",
      });

      waitingPlayer = null;
    } else {
      waitingPlayer = { socket, socketId: socket.id, name: playerName, userId };
      socket.emit("waiting_for_opponent", "Đang chờ phượt thủ khác vào hẻm...");

      searchTimer = setTimeout(() => {
        if (waitingPlayer && waitingPlayer.socketId === socket.id) {
          const roomId = `room_bot_${Date.now()}`;
          const botSocketId = `bot_${Date.now()}`;
          const roomShops = selectRandomShops();

          activeRooms[roomId] = {
            players: {
              [socket.id]: {
                socketId: socket.id,
                name: playerName,
                userId,
                team: "red",
                board: [],
                ready: false,
              },
              [botSocketId]: {
                socketId: botSocketId,
                name: "Bot Sếp Gọi 🤖",
                userId: null,
                team: "blue",
                board: generateBotBoard(roomShops),
                ready: true,
              },
            },
            shops: roomShops,
            gameState: "SETUP",
            turn: null,
            isBotRoom: true,
            botSocketId,
          };

          socket.join(roomId);
          socket.emit("match_found", {
            roomId,
            team: "red",
            shops: roomShops,
            message: "Đã ghép trận cùng Cao Thủ AI!",
          });
          waitingPlayer = null;
        }
      }, 8000);
    }
  });

  socket.on("cancel_search", () => {
    if (waitingPlayer && waitingPlayer.socketId === socket.id) {
      if (searchTimer) clearTimeout(searchTimer);
      waitingPlayer = null;
    }

    // Hủy luôn Hẻm Kín đang chờ bạn bè (nếu có) để không ai vào nhầm phòng đã hủy
    for (const [rid, r] of Object.entries(activeRooms)) {
      if (
        r.isPrivate &&
        r.gameState === "WAITING_FRIEND" &&
        r.players[socket.id]
      ) {
        socket.leave(rid);
        delete activeRooms[rid];
      }
    }
  });

  // --- CHẾ ĐỘ PHÒNG KÍN (MÃ HẺM) ---
  socket.on("create_private_room", (data = {}) => {
    if (!isSocketPayload(data)) return;
    const playerName = getPlayerName(data.name);
    const userId = socket.data.userId;

    const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    const roomId = `private_${roomCode}`;
    const roomShops = selectRandomShops();

    activeRooms[roomId] = {
      roomCode,
      roomId,
      isPrivate: true,
      players: {
        [socket.id]: {
          socketId: socket.id,
          name: playerName,
          userId,
          team: "red",
          board: [],
          ready: false,
        },
      },
      shops: roomShops,
      gameState: "WAITING_FRIEND",
      turn: null,
      isBotRoom: false,
    };

    socket.join(roomId);
    socket.emit("private_room_created", {
      roomId,
      roomCode,
      message: `Đã tạo Hẻm Kín [${roomCode}]! Hãy gửi mã cho bạn bè.`,
    });
  });

  socket.on("join_private_room", (data = {}) => {
    if (!isSocketPayload(data)) return;

    const now = Date.now();
    const recentJoinAttempts = (
      socket.data.privateRoomJoinAttempts || []
    ).filter((timestamp) => now - timestamp < 60_000);
    if (recentJoinAttempts.length >= 10) {
      socket.emit(
        "join_private_error",
        "Bạn thử quá nhiều mã. Vui lòng chờ một phút.",
      );
      return;
    }
    recentJoinAttempts.push(now);
    socket.data.privateRoomJoinAttempts = recentJoinAttempts;

    const playerName = getPlayerName(data.name);
    const userId = socket.data.userId;

    if (typeof data.roomCode !== "string") {
      socket.emit("join_private_error", "Mã Hẻm không hợp lệ!");
      return;
    }
    const roomCode = data.roomCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{5}$/.test(roomCode)) {
      socket.emit("join_private_error", "Mã Hẻm không hợp lệ!");
      return;
    }
    const roomId = `private_${roomCode}`;

    const room = activeRooms[roomId];

    if (!room) {
      socket.emit(
        "join_private_error",
        "Mã Hẻm không tồn tại hoặc đã giải tán!",
      );
      return;
    }

    if (Object.keys(room.players).length >= 2) {
      socket.emit("join_private_error", "Hẻm này đã đủ 2 phượt thủ!");
      return;
    }

    const hostSocketId = Object.keys(room.players)[0];
    if (userId && room.players[hostSocketId].userId === userId) {
      socket.emit(
        "join_private_error",
        "Bạn không thể tự vào phòng kín của chính mình!",
      );
      return;
    }

    room.players[socket.id] = {
      socketId: socket.id,
      name: playerName,
      userId,
      team: "blue",
      board: [],
      ready: false,
    };
    room.gameState = "SETUP";

    socket.join(roomId);

    io.to(hostSocketId).emit("match_found", {
      roomId,
      team: "red",
      shops: room.shops,
      message: "Bạn bè đã vào Hẻm! Sẵn sàng giăng bẫy!",
    });

    socket.emit("match_found", {
      roomId,
      team: "blue",
      shops: room.shops,
      message: "Đã vào Hẻm thành công! Bắt đầu xếp quán!",
    });
  });

  // Chốt vị trí quán (Sẵn sàng)
  socket.on("ready_place_shops", (data = {}) => {
    if (!isSocketPayload(data)) return;
    const { roomId: requestedRoomId, playerBoard } = data;
    let roomId = requestedRoomId;
    let room = activeRooms[roomId];

    // Tự động tìm lại room nếu roomId bị sai lệch / nhầm lẫn
    if (!room) {
      for (const [rId, rData] of Object.entries(activeRooms)) {
        if (rData.players && rData.players[socket.id]) {
          room = rData;
          roomId = rId;
          break;
        }
      }
    }

    if (!room || !room.players[socket.id]) {
      socket.emit(
        "opponent_left",
        "Lỗi đồng bộ phòng! Vui lòng bấm Tìm Trận để vào lại hẻm mới.",
      );
      return;
    }

    // Chỉ được chốt sơ đồ ở giai đoạn xếp quán — không đổi bàn cờ giữa trận
    if (room.gameState !== "SETUP") return;

    const cleanBoard = sanitizeBoard(playerBoard, room.shops);
    if (!cleanBoard) {
      socket.emit(
        "board_rejected",
        "Sơ đồ quán không hợp lệ! Hãy xếp đủ các quán rồi chốt lại.",
      );
      return;
    }

    room.players[socket.id].board = cleanBoard;
    room.players[socket.id].ready = true;

    // Kiểm tra tất cả người chơi trong phòng đã bấm ready chưa
    const playerList = Object.values(room.players);
    if (playerList.length >= 2 && playerList.every((p) => p.ready)) {
      room.gameState = "PLAYING";
      const playerIds = Object.keys(room.players);
      const firstTurnId =
        playerIds[Math.floor(Math.random() * playerIds.length)];
      room.turn = firstTurnId;

      io.to(roomId).emit("start_coin_flip", { firstTurnId });

      if (room.isBotRoom && firstTurnId === room.botSocketId) {
        setTimeout(() => triggerBotShot(roomId), 4000);
      }
    }
  });

  // Bắn đạn
  socket.on("fire_shot", async (data = {}) => {
    if (!isSocketPayload(data)) return;
    const { roomId, targetIndex } = data;
    const room = activeRooms[roomId];
    if (!room || room.gameState !== "PLAYING" || room.turn !== socket.id)
      return;
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex > 63)
      return;

    const opponentId = Object.keys(room.players).find((id) => id !== socket.id);
    const opponentBoard = room.players[opponentId].board;
    const targetCell = opponentBoard[targetIndex];

    // Ô đã bắn rồi thì bỏ qua (chặn spam ô trúng để ăn thêm lượt vô hạn)
    if (targetCell && targetCell.shot) return;

    const isHit = !!(targetCell && targetCell.shopId !== undefined);
    let sunkShopId = null;

    if (isHit) {
      targetCell.shot = "HIT";
      const shopId = targetCell.shopId;
      const sameShopCells = opponentBoard.filter(
        (c) => c && c.shopId === shopId,
      );
      if (sameShopCells.every((c) => c.shot === "HIT")) sunkShopId = shopId;
    } else {
      opponentBoard[targetIndex] = { shot: "MISS" };
    }

    const nextTurn = isHit ? socket.id : opponentId;
    room.turn = nextTurn;

    io.to(roomId).emit("shot_result", {
      shooter: socket.id,
      targetIndex,
      isHit,
      sunkShopId,
      nextTurn,
    });

    if (
      opponentBoard.every(
        (cell) => !cell || !cell.shopId || cell.shot === "HIT",
      )
    ) {
      room.gameState = "FINISHED";
      io.to(roomId).emit("game_over", { winner: socket.id });

      try {
        if (!room.isBotRoom) {
          const winnerUserId = room.players[socket.id]?.userId;
          const loserUserId = room.players[opponentId]?.userId;

          if (winnerUserId) await updatePlayerStats(winnerUserId, true);
          if (loserUserId) await updatePlayerStats(loserUserId, false);
        }
      } catch (err) {
        console.error("Lỗi cập nhật kết quả:", err);
      }
    } else if (room.isBotRoom && nextTurn === room.botSocketId) {
      setTimeout(() => triggerBotShot(roomId), 2500);
    }
  });

  // Truyền tín hiệu ghim vị trí ngắm bắn cho đối thủ
  socket.on("aim_shot", (data = {}) => {
    if (!isSocketPayload(data)) return;
    const { roomId, targetIndex } = data;
    const room = activeRooms[roomId];
    if (!room || room.gameState !== "PLAYING" || room.turn !== socket.id)
      return;
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex > 63)
      return;

    // Gửi vị trí ngắm cho người còn lại trong phòng
    socket.to(roomId).emit("opponent_aiming", targetIndex);
  });

  // Tái đấu
  socket.on("request_rematch", (data = {}) => {
    if (!isSocketPayload(data)) return;
    const { roomId } = data;
    const room = activeRooms[roomId];
    if (!room || !room.players[socket.id] || room.gameState !== "FINISHED")
      return;

    room.players[socket.id].rematch = true;

    const humans = Object.values(room.players).filter(
      (p) => !(room.isBotRoom && p.socketId === room.botSocketId),
    );

    // Phòng đấu Bot: Bot luôn đồng ý. Phòng người: cần cả hai bấm.
    if (humans.every((p) => p.rematch)) {
      resetRoomForRematch(room);
      io.to(roomId).emit("rematch_accepted", {
        message: "Cả hai cùng chọn chơi lại! Hãy đặt lại quán ăn!",
        shops: room.shops,
      });
    } else {
      socket
        .to(roomId)
        .emit(
          "opponent_requested_rematch",
          "Đối thủ muốn tái đấu! Nhấn Chơi Lại để tham gia.",
        );
    }
  });

  // Rời phòng chủ động (về sảnh) — báo đối thủ và giải tán phòng
  socket.on("leave_room", (data = {}) => {
    if (!isSocketPayload(data)) return;
    const { roomId } = data;
    const room = activeRooms[roomId];
    if (!room || !room.players[socket.id]) return;

    socket.leave(roomId);
    socket.to(roomId).emit("opponent_left", "Đối thủ đã rời hẻm!");
    delete activeRooms[roomId];
  });

  // Chat
  socket.on("send_chat", (data = {}) => {
    if (!isSocketPayload(data)) return;
    const { roomId, text } = data;
    const room = activeRooms[roomId];
    if (room && room.players[socket.id] && typeof text === "string") {
      io.to(roomId).emit("receive_chat", {
        sender: room.players[socket.id].name,
        text: text.slice(0, 200),
      });
    }
  });

  // Xử lý Ngắt kết nối
  socket.on("disconnect", async () => {
    if (waitingPlayer && waitingPlayer.socketId === socket.id) {
      if (searchTimer) clearTimeout(searchTimer);
      waitingPlayer = null;
    }

    for (const [roomId, room] of Object.entries(activeRooms)) {
      if (room.players[socket.id]) {
        if (room.gameState === "SETUP" || room.gameState === "PLAYING") {
          const leaverUserId = room.players[socket.id].userId;
          if (leaverUserId && !room.isBotRoom) {
            try {
              await updatePlayerStats(leaverUserId, false);
            } catch (err) {
              console.error("Lỗi cập nhật hình phạt sủi trận:", err);
            }
          }
        }

        io.to(roomId).emit("opponent_left", "Đối thủ đã rời hẻm!");
        delete activeRooms[roomId];
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
