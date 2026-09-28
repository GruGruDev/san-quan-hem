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

// Cấu hình CORS cho Express API
app.use(
  cors({
    origin: [
      "https://san-quan-hem.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    credentials: true,
  }),
);

const JWT_SECRET = "san_quan_hem_secret_key_2026";

// --- KẾT NỐI MONGODB ATLAS CLOUD ---
const MONGO_URI =
  "mongodb+srv://nguyentritai210804_db_user:d4zu1sedq4QrFzPS@cluster0.dsgcdd4.mongodb.net/san_quan_hem?retryWrites=true&w=majority";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Đã kết nối MongoDB Atlas Cloud thành công!"))
  .catch((err) => console.error("❌ Lỗi kết nối MongoDB Atlas:", err.message));

// --- API AUTHENTICATION ---
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

app.post("/api/forgot-password", async (req, res) => {
  try {
    const { username, displayName, newPassword } = req.body;
    if (!username || !displayName || !newPassword) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập đầy đủ thông tin!" });
    }

    const user = await User.findOne({ username, displayName });
    if (!user) {
      return res
        .status(400)
        .json({
          message:
            "Thông tin xác nhận không chính xác! Vui lòng kiểm tra lại Tên tài khoản và Biệt danh.",
        });
    }

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

app.get("/api/leaderboard", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
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
  cors: {
    origin: [
      "https://san-quan-hem.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST"],
  },
});

let waitingPlayer = null;
let searchTimer = null;
const activeRooms = {};

// HÀM 1: Random chọn 3 quán cho mỗi trận
const selectRandomShops = () => {
  const pool = [
    {
      id: "cavien",
      name: "Xe Cá Viên Chiên",
      size: 2,
      icon: "/cavienchien.png",
    },
    { id: "trasua", name: "Tiệm Trà Sữa", size: 3, icon: "/trasua.png" },
    { id: "bunrieu", name: "Gánh Bún Riêu", size: 3, icon: "/bunrieu.png" },
    { id: "quanoc", name: "Quán Ốc Quen", size: 4, icon: "/donuong.png" },
    { id: "quannhau", name: "Khu Nhậu Vỉa Hè", size: 5, icon: "/quannhau.png" },
  ];
  return pool.sort(() => 0.5 - Math.random()).slice(0, 3);
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

  const isHit = targetCell && targetCell.shopId !== undefined;
  let sunkShopId = null;

  if (isHit) {
    targetCell.shot = "HIT";
    const shopId = targetCell.shopId;
    const sameShopCells = playerBoard.filter((c) => c && c.shopId === shopId);
    if (sameShopCells.every((c) => c.shot === "HIT")) sunkShopId = shopId;
  } else {
    if (playerBoard[targetIndex]) playerBoard[targetIndex].shot = "MISS";
    else playerBoard[targetIndex] = { shot: "MISS" };
  }

  const nextTurn = isHit ? room.botSocketId : playerSocketId;
  room.turn = nextTurn;

  io.to(roomId).emit("shot_result", {
    shooter: room.botSocketId,
    targetIndex,
    isHit,
    sunkShopId,
    nextTurn,
  });

  if (
    playerBoard.every((cell) => !cell || !cell.shopId || cell.shot === "HIT")
  ) {
    room.gameState = "FINISHED";
    io.to(roomId).emit("game_over", { winner: room.botSocketId });
  } else if (isHit && nextTurn === room.botSocketId) {
    setTimeout(() => triggerBotShot(roomId), 2500);
  }
};

io.on("connection", (socket) => {
  console.log(`🔌 Người chơi kết nối: ${socket.id}`);

  socket.on("tim_doi_thu", (data) => {
    const playerName = data.name || "Phượt Thủ";
    const userId = data.userId || null;

    if (waitingPlayer && waitingPlayer.socketId !== socket.id) {
      if (searchTimer) clearTimeout(searchTimer);

      const roomId = `room_${Date.now()}`;
      const player1 = waitingPlayer;
      const player2 = { socketId: socket.id, name: playerName, userId };
      const roomShops = selectRandomShops(); // Lấy 3 quán ngẫu nhiên

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
          const roomShops = selectRandomShops(); // Lấy 3 quán ngẫu nhiên cho trận đấu với BOT

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
  });

  socket.on("ready_place_shops", ({ roomId, playerBoard }) => {
    const room = activeRooms[roomId];
    if (!room) return;

    room.players[socket.id].board = playerBoard;
    room.players[socket.id].ready = true;

    if (Object.values(room.players).every((p) => p.ready)) {
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
      if (sameShopCells.every((c) => c.shot === "HIT")) sunkShopId = shopId;
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

          if (winnerUserId)
            await User.findByIdAndUpdate(winnerUserId, {
              $inc: { wins: 1, matches: 1 },
            });
          if (loserUserId)
            await User.findByIdAndUpdate(loserUserId, { $inc: { matches: 1 } });
        }
      } catch (err) {
        console.error("Lỗi cập nhật kết quả:", err);
      }
    } else if (room.isBotRoom && nextTurn === room.botSocketId) {
      setTimeout(() => triggerBotShot(roomId), 2500);
    }
  });

  socket.on("send_chat", ({ roomId, text }) => {
    const room = activeRooms[roomId];
    if (room && room.players[socket.id]) {
      io.to(roomId).emit("receive_chat", {
        sender: room.players[socket.id].name,
        text,
      });
    }
  });

  socket.on("disconnect", async () => {
    if (waitingPlayer && waitingPlayer.socketId === socket.id) {
      if (searchTimer) clearTimeout(searchTimer);
      waitingPlayer = null;
    }

    for (const [roomId, room] of Object.entries(activeRooms)) {
      if (room.players[socket.id]) {
        // Áp dụng CƠ CHẾ XỬ PHẠT SỦI TRẬN (Trừ khi đã FINISHED thì không phạt)
        if (room.gameState === "SETUP" || room.gameState === "PLAYING") {
          const leaverUserId = room.players[socket.id].userId;
          if (leaverUserId && !room.isBotRoom) {
            try {
              // Cộng 1 vào số trận (matches) nhưng không cộng số thắng (wins), gián tiếp làm giảm % tỉ lệ thắng.
              await User.findByIdAndUpdate(leaverUserId, {
                $inc: { matches: 1 },
              });
            } catch (err) {
              console.error("Lỗi cập nhật hình phạt sủi trận:", err);
            }
          }
        }

        io.to(roomId).emit("opponent_left", "Đối thủ đã sủi khỏi hẻm!");
        delete activeRooms[roomId];
      }
    }
  });
});

server.listen(3001, () => {
  console.log("🚀 Server running on port 3001");
});
