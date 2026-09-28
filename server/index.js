require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const User = require("./models/User");

// --- BÍ MẬT LẤY TỪ BIẾN MÔI TRƯỜNG (.env / Render Dashboard) ---
const { MONGO_URI, JWT_SECRET } = process.env;
if (!MONGO_URI || !JWT_SECRET) {
  console.error(
    "❌ Thiếu MONGO_URI hoặc JWT_SECRET trong .env / biến môi trường!",
  );
  process.exit(1);
}

const ALLOWED_ORIGINS = [
  "https://san-quan-hem.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

const app = express();
app.use(express.json());
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));

// --- KẾT NỐI MONGODB ATLAS CLOUD ---
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
      return res.status(400).json({
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
  cors: { origin: ALLOWED_ORIGINS, methods: ["GET", "POST"] },
});

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
  console.log(`🔌 Người chơi kết nối: ${socket.id}`);

  // Tìm đối thủ ghép ngẫu nhiên
  socket.on("tim_doi_thu", (data = {}) => {
    const playerName = data.name || "Phượt Thủ";
    const userId = data.userId || null;

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
    const playerName = data.name || "Phượt Thủ";
    const userId = data.userId || null;

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
    const playerName = data.name || "Phượt Thủ";
    const userId = data.userId || null;

    const roomCode = (data.roomCode || "").trim().toUpperCase();
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
  socket.on("ready_place_shops", ({ roomId, playerBoard } = {}) => {
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
  socket.on("fire_shot", async ({ roomId, targetIndex } = {}) => {
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

  // Truyền tín hiệu ghim vị trí ngắm bắn cho đối thủ
  socket.on("aim_shot", ({ roomId, targetIndex } = {}) => {
    const room = activeRooms[roomId];
    if (!room || room.gameState !== "PLAYING" || room.turn !== socket.id)
      return;

    // Gửi vị trí ngắm cho người còn lại trong phòng
    socket.to(roomId).emit("opponent_aiming", targetIndex);
  });

  // Tái đấu
  socket.on("request_rematch", ({ roomId } = {}) => {
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
  socket.on("leave_room", ({ roomId } = {}) => {
    const room = activeRooms[roomId];
    if (!room || !room.players[socket.id]) return;

    socket.leave(roomId);
    socket.to(roomId).emit("opponent_left", "Đối thủ đã rời hẻm!");
    delete activeRooms[roomId];
  });

  // Chat
  socket.on("send_chat", ({ roomId, text } = {}) => {
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
              await User.findByIdAndUpdate(leaverUserId, {
                $inc: { matches: 1 },
              });
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
