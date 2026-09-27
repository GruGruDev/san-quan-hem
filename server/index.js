const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const User = require("./models/User");

const app = express();
app.use(express.json());
app.use(cors());

const JWT_SECRET = "san_quan_hem_secret_key_2026";

// --- KẾT NỐI MONGODB ATLAS CLOUD ---
const MONGO_URI =
  "mongodb+srv://nguyentritai210804_db_user:d4zu1sedq4QrFzPS@cluster0.dsgcdd4.mongodb.net/san_quan_hem?retryWrites=true&w=majority";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Đã kết nối MongoDB Atlas Cloud thành công!"))
  .catch((err) => console.error("❌ Lỗi kết nối MongoDB Atlas:", err.message));

// --- API AUTHENTICATION ---

// API Đăng ký
app.post("/api/register", async (req, res) => {
  try {
    const { username, password, displayName } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập đầy đủ thông tin!" });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Tên tài khoản đã tồn tại!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      password: hashedPassword,
      displayName: displayName || username,
    });
    await newUser.save();

    const token = jwt.sign({ userId: newUser._id, username }, JWT_SECRET, {
      expiresIn: "7d",
    });
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
    res.status(500).json({ message: "Lỗi máy chủ!" });
  }
});

// API Đăng nhập
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
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

    const token = jwt.sign({ userId: user._id, username }, JWT_SECRET, {
      expiresIn: "7d",
    });
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

// API Lấy Bảng Xếp Hạng Realtime (Có bọc an toàn Fallback)
app.get("/api/leaderboard", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }

    const topUsers = await User.find()
      .select("displayName wins matches")
      .sort({ wins: -1, matches: 1 })
      .limit(10);
    res.json(topUsers);
  } catch (err) {
    console.error("Leaderboard Error:", err.message);
    res.json([]);
  }
});

// --- GAME SOCKET.IO LOGIC ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

let waitingPlayer = null;
const activeRooms = {};

io.on("connection", (socket) => {
  console.log(`🔌 Người chơi kết nối: ${socket.id}`);

  // Tìm đối thủ
  socket.on("tim_doi_thu", (data) => {
    const playerName = data.name || "Phượt Thủ";
    const userId = data.userId || null;

    if (waitingPlayer && waitingPlayer.socketId !== socket.id) {
      const roomId = `room_${Date.now()}`;
      const player1 = waitingPlayer;
      const player2 = { socketId: socket.id, name: playerName, userId };

      activeRooms[roomId] = {
        players: {
          [player1.socketId]: {
            ...player1,
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
        gameState: "SETUP",
        turn: null,
      };

      player1.socket.join(roomId);
      socket.join(roomId);

      player1.socket.emit("match_found", {
        roomId,
        team: "red",
        message: "Đã tìm thấy đối thủ!",
      });
      socket.emit("match_found", {
        roomId,
        team: "blue",
        message: "Đã tìm thấy đối thủ!",
      });

      waitingPlayer = null;
    } else {
      waitingPlayer = { socket, socketId: socket.id, name: playerName, userId };
      socket.emit("waiting_for_opponent", "Đang chờ phượt thủ khác vào hẻm...");
    }
  });

  // Hủy tìm trận
  socket.on("cancel_search", () => {
    if (waitingPlayer && waitingPlayer.socketId === socket.id) {
      waitingPlayer = null;
      console.log(`🚫 ${socket.id} đã hủy tìm trận.`);
    }
  });

  // Chốt sơ đồ quán
  socket.on("ready_place_shops", ({ roomId, playerBoard }) => {
    const room = activeRooms[roomId];
    if (!room) return;

    room.players[socket.id].board = playerBoard;
    room.players[socket.id].ready = true;

    const allReady = Object.values(room.players).every((p) => p.ready);
    if (allReady) {
      room.gameState = "PLAYING";
      const playerIds = Object.keys(room.players);
      const firstTurnId =
        playerIds[Math.floor(Math.random() * playerIds.length)];
      room.turn = firstTurnId;

      io.to(roomId).emit("start_coin_flip", { firstTurnId });
    }
  });

  // Thực hiện bắn
  socket.on("fire_shot", async ({ roomId, targetIndex }) => {
    const room = activeRooms[roomId];
    if (!room || room.gameState !== "PLAYING" || room.turn !== socket.id)
      return;

    const opponentId = Object.keys(room.players).find((id) => id !== socket.id);
    const opponentBoard = room.players[opponentId].board;
    const targetCell = opponentBoard[targetIndex];

    const isHit = targetCell && targetCell.shopId !== undefined;
    let sunkShopId = null;

    if (isHit) {
      targetCell.shot = "HIT";
      const shopId = targetCell.shopId;
      const sameShopCells = opponentBoard.filter(
        (c) => c && c.shopId === shopId,
      );
      const allSunk = sameShopCells.every((c) => c.shot === "HIT");
      if (allSunk) sunkShopId = shopId;
    }

    // --- SỬA CƠ CHẾ ĐỔI LƯỢT TẠI ĐÂY ---
    // Nếu bắn TRÚNG (isHit = true) -> Giữ nguyên lượt của người bắn (socket.id)
    // Nếu bắn TRƯỢT (isHit = false) -> Chuyển lượt cho đối thủ (opponentId)
    const nextTurn = isHit ? socket.id : opponentId;
    room.turn = nextTurn;

    io.to(roomId).emit("shot_result", {
      shooter: socket.id,
      targetIndex,
      isHit,
      sunkShopId,
      nextTurn,
    });

    // Kiểm tra kết thúc trận đấu
    const allOpponentCellsSunk = opponentBoard.every(
      (cell) => !cell || !cell.shopId || cell.shot === "HIT",
    );
    if (allOpponentCellsSunk) {
      room.gameState = "FINISHED";
      const winnerId = socket.id;
      const loserId = opponentId;

      io.to(roomId).emit("game_over", { winner: winnerId });

      // Cập nhật thành tích vào MongoDB Atlas nếu người chơi đã đăng nhập
      try {
        const winnerUserId = room.players[winnerId].userId;
        const loserUserId = room.players[loserId].userId;

        if (winnerUserId) {
          await User.findByIdAndUpdate(winnerUserId, {
            $inc: { wins: 1, matches: 1 },
          });
        }
        if (loserUserId) {
          await User.findByIdAndUpdate(loserUserId, { $inc: { matches: 1 } });
        }
      } catch (err) {
        console.error("Lỗi cập nhật kết quả trận đấu:", err);
      }
    }
  });
  // --- API QUÊN MẬT KHẨU / ĐẶT LẠI MẬT KHẨU ---
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { username, displayName, newPassword } = req.body;

      if (!username || !displayName || !newPassword) {
        return res
          .status(400)
          .json({ message: "Vui lòng nhập đầy đủ thông tin!" });
      }

      // Tìm tài khoản khớp cả Tên tài khoản và Tên hiển thị
      const user = await User.findOne({ username, displayName });
      if (!user) {
        return res.status(400).json({
          message:
            "Thông tin xác nhận không chính xác! Vui lòng kiểm tra lại Tên tài khoản và Biệt danh.",
        });
      }

      // Mã hóa mật khẩu mới và lưu vào DB
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      await user.save();

      res.json({
        message: "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.",
      });
    } catch (err) {
      console.error("Forgot Password Error:", err);
      res.status(500).json({ message: "Lỗi máy chủ!" });
    }
  });
  // Chat
  socket.on("send_chat", ({ roomId, text }) => {
    const room = activeRooms[roomId];
    if (room && room.players[socket.id]) {
      io.to(roomId).emit("receive_chat", {
        sender: room.players[socket.id].name,
        text,
      });
    }
  });

  // Ngắt kết nối
  socket.on("disconnect", () => {
    if (waitingPlayer && waitingPlayer.socketId === socket.id) {
      waitingPlayer = null;
    }

    for (const [roomId, room] of Object.entries(activeRooms)) {
      if (room.players[socket.id]) {
        io.to(roomId).emit("opponent_left", "Đối thủ đã rời hẻm!");
        delete activeRooms[roomId];
      }
    }
  });
});

server.listen(3001, () => {
  console.log("🚀 Server running on port 3001");
});
