import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

// Import Constants
import { BOARD_SIZES, rotateShape, SHOPS, TAUNT_TEXTS } from "./constants/game";

// Import Audio Utilities
import { apiUrl, SERVER_URL } from "./utils/api";
import { playBGM, playSFX, stopBGM } from "./utils/sound";

// Import Components
import BottomPanel from "./components/BottomPanel";
import CoinFlipOverlay from "./components/CoinFlipOverlay";
import GameBoard from "./components/GameBoard";
import Header from "./components/Header";
import InteractiveTutorial from "./components/InteractiveTutorial";
import LoadingScreen from "./components/LoadingScreen";
import LobbyScreen from "./components/LobbyScreen";
import ResultScreen from "./components/ResultScreen";
import RoomRoster from "./components/RoomRoster";
import SearchingScreen from "./components/SearchingScreen";
import SocialHub from "./components/SocialHub";

// Import Modals
import AuthModal from "./components/Modals/AuthModal";
import DonateModal from "./components/Modals/DonateModal";
import GuideModal from "./components/Modals/GuideModal";
import LeaderboardModal from "./components/Modals/LeaderboardModal";
import PrivateRoomModal from "./components/Modals/PrivateRoomModal";
import SettingsModal from "./components/Modals/SettingsModal";
import SurrenderVoteModal from "./components/Modals/SurrenderVoteModal";

// Kết nối Socket.IO
const socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
  tryAllTransports: true,
});

const getOAuthCallbackAlert = () => {
  const params = new URLSearchParams(window.location.search);
  const linkedProvider = params.get("oauth_linked");
  const oauthError = params.get("oauth_error");
  const providerName = linkedProvider === "google" ? "Google" : "Facebook";
  const errorMessages = {
    google_not_configured: "Đăng nhập Google chưa được cấu hình.",
    facebook_not_configured: "Đăng nhập Facebook chưa được cấu hình.",
    account_requires_link:
      "Tài khoản này đã tồn tại. Hãy đăng nhập bằng mật khẩu rồi liên kết Google/Facebook trong Cài đặt.",
    provider_already_linked:
      "Tài khoản Google/Facebook này đã liên kết với một tài khoản khác.",
    session_expired: "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.",
    oauth_cancelled: "Bạn đã hủy đăng nhập bằng mạng xã hội.",
  };

  if (linkedProvider)
    return {
      show: true,
      title: "Đã liên kết",
      message: `Đã liên kết ${providerName} thành công.`,
      type: "success",
    };
  if (oauthError)
    return {
      show: true,
      title: "Đăng nhập thất bại",
      message: errorMessages[oauthError] || "Không thể xác thực.",
      type: "error",
    };
  return { show: false, title: "", message: "", type: "info" };
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) return null;
    try {
      return JSON.parse(savedUser);
    } catch {
      localStorage.removeItem("user");
      return null;
    }
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(
    () => !localStorage.getItem("hasSeenTutorial"),
  );

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [bgmVolume, setBgmVolume] = useState(0.4);
  const [sfxVolume, setSfxVolume] = useState(0.8);
  const [showTaunt, setShowTaunt] = useState(true);
  const [vibrate, setVibrate] = useState(true);

  const soundRef = useRef({ soundEnabled, sfxVolume });
  useEffect(() => {
    soundRef.current = { soundEnabled, sfxVolume };
  }, [soundEnabled, sfxVolume]);

  const [customAlert, setCustomAlert] = useState(getOAuthCallbackAlert);
  const showAlert = (title, message, type = "info") =>
    setCustomAlert({ show: true, title, message, type });

  const [appLoading, setAppLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const [gameState, setGameState] = useState("LOBBY");
  const [playerName, setPlayerName] = useState("");
  const [team, setTeam] = useState("red");
  const [mode, setMode] = useState("1v1");
  const [gridSize, setGridSize] = useState(BOARD_SIZES["1v1"]);
  const [roomPlayers, setRoomPlayers] = useState([]);
  const [roomHostSocketId, setRoomHostSocketId] = useState(null);
  const [roomLobbyStatus, setRoomLobbyStatus] = useState(null);
  const [connectionError, setConnectionError] = useState("");
  const gameConfigRef = useRef({ gridSize, team, mode });
  useEffect(() => {
    gameConfigRef.current = { gridSize, team, mode };
  }, [gridSize, team, mode]);

  const [roomId, setRoomId] = useState(null);
  const roomIdRef = useRef(roomId);
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  const [activeShops, setActiveShops] = useState(SHOPS);
  const [selectedShop, setSelectedShop] = useState(SHOPS[0]?.id || "cavien");
  const [rotation, setRotation] = useState(0);
  const [previewIndex, setPreviewIndex] = useState(null);
  const [myBoard, setMyBoard] = useState(
    Array(BOARD_SIZES["1v1"] ** 2).fill(null),
  );

  const [opponentHits, setOpponentHits] = useState(
    Array(BOARD_SIZES["1v1"] ** 2).fill(null),
  );
  const [opponentSunkShops, setOpponentSunkShops] = useState([]);

  const [isMyTurn, setIsMyTurn] = useState(false);
  const [shotPending, setShotPending] = useState(false);
  const shotPendingRef = useRef(false);
  const [currentTurnId, setCurrentTurnId] = useState(null);
  const [coinFlipResult, setCoinFlipResult] = useState(null);
  const [recentShot, setRecentShot] = useState(null);
  const [aimingData, setAimingData] = useState(null);
  const [winner, setWinner] = useState(null);
  const [winnerBoards, setWinnerBoards] = useState([]);
  const [gameId, setGameId] = useState(null);
  const [turnTimeLeft, setTurnTimeLeft] = useState(25);
  const [surrenderVote, setSurrenderVote] = useState(null);

  const [messages, setMessages] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [showPrivateModal, setShowPrivateModal] = useState(false);
  const [showSocialHub, setShowSocialHub] = useState(false);
  const [createdRoomCode, setCreatedRoomCode] = useState(null);

  const getToken = () => localStorage.getItem("token");
  const isMyTeamTurn =
    roomPlayers.find((p) => p.socketId === currentTurnId)?.team === team;

  const refreshSocketAuth = () => {
    socket.auth = { token: getToken() };
    socket.disconnect();
    socket.connect();
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    const oauthCode = url.searchParams.get("oauth_code");
    if (
      !oauthCode &&
      !url.searchParams.has("oauth_linked") &&
      !url.searchParams.has("oauth_error")
    )
      return;
    url.searchParams.delete("oauth_code");
    url.searchParams.delete("oauth_linked");
    url.searchParams.delete("oauth_error");
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );

    if (oauthCode) {
      const controller = new AbortController();
      fetch(apiUrl("/api/auth/exchange"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: oauthCode }),
        signal: controller.signal,
      })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok)
            throw new Error(data.message || "Không thể hoàn tất đăng nhập.");
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          setCurrentUser(data.user);
          setShowAuthModal(false);
          socket.auth = { token: data.token };
          socket.disconnect();
          socket.connect();
        })
        .catch((error) => {
          if (error.name === "AbortError") return;
          setCustomAlert({
            show: true,
            title: "Đăng nhập thất bại",
            message: error.message,
            type: "error",
          });
        });
      return () => controller.abort();
    }
  }, []);

  useEffect(() => {
    if (vibrate && recentShot && window.navigator.vibrate)
      window.navigator.vibrate([100, 50, 100]);
  }, [recentShot, vibrate]);

  useEffect(() => {
    if (!soundEnabled) {
      stopBGM();
      return;
    }
    if (gameState === "LOBBY") playBGM("lofi.mp3", soundEnabled, bgmVolume);
    else if (gameState === "SETUP" || gameState === "PLAYING")
      playBGM("soundstreet.mp3", soundEnabled, bgmVolume);
    else if (gameState === "FINISHED") stopBGM();
  }, [gameState, soundEnabled, bgmVolume]);

  useEffect(() => {
    if (gameState === "PLAYING" && turnTimeLeft === 5)
      playSFX("TurnTimer.mp3", soundEnabled, sfxVolume);
  }, [gameState, turnTimeLeft, soundEnabled, sfxVolume]);

  useEffect(() => {
    let timer = null;
    if (gameState === "PLAYING" && turnTimeLeft > 0)
      timer = setInterval(
        () => setTurnTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1)),
        1000,
      );
    return () => clearInterval(timer);
  }, [gameState, turnTimeLeft]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setCurrentUser(null);
    refreshSocketAuth();
  };

  const resetGameData = (newShops = activeShops, newGridSize = gridSize) => {
    setGridSize(newGridSize);
    setMyBoard(Array(newGridSize * newGridSize).fill(null));
    setOpponentHits(Array(newGridSize * newGridSize).fill(null));
    setOpponentSunkShops([]);
    setSelectedShop(newShops[0]?.id || "cavien");
    setRotation(0);
    setPreviewIndex(null);
    setIsMyTurn(false);
    shotPendingRef.current = false;
    setShotPending(false);
    setCurrentTurnId(null);
    setCoinFlipResult(null);
    setRecentShot(null);
    setAimingData(null);
    setWinner(null);
    setWinnerBoards([]);
    setGameId(null);
    setTurnTimeLeft(25);
    setSurrenderVote(null);
  };

  useEffect(() => {
    socket.auth = { token: getToken() };
    socket.on("connect", () => setConnectionError(""));
    socket.on("connect_error", () =>
      setConnectionError("Mất kết nối máy chủ. Đang thử kết nối lại..."),
    );
    socket.connect();

    socket.on("match_found", (data) => {
      const roomShops = data.shops || SHOPS;
      const roomMode = data.mode === "2v2" ? "2v2" : "1v1";
      const roomGridSize = data.gridSize || BOARD_SIZES[roomMode];
      setMode(roomMode);
      setRoomPlayers(data.players || []);
      setRoomHostSocketId(data.hostSocketId || null);
      setRoomLobbyStatus(null);
      setActiveShops(roomShops);
      resetGameData(roomShops, roomGridSize);
      setRoomId(data.roomId);
      setTeam(data.team);
      setGameState("SETUP");
      setSearching(false);
      setShowSocialHub(false);
      setShowPrivateModal(false);
      setCreatedRoomCode(null);
      setMessages([{ sender: "Hệ thống", text: data.message, type: "ALL" }]);
      setConnectionError("");
      setCustomAlert((prev) => ({ ...prev, show: false }));
    });

    socket.on("waiting_for_opponent", (msg) =>
      setMessages((prev) => [
        ...prev,
        { sender: "Hệ thống", text: msg, type: "ALL" },
      ]),
    );

    socket.on("private_room_created", (data) => {
      setCreatedRoomCode(data.roomCode);
      setRoomId(data.roomId);
      setMode(data.mode || "1v1");
      setGridSize(data.gridSize || BOARD_SIZES[data.mode] || 8);
      setRoomPlayers(data.players || []);
      setRoomHostSocketId(data.hostSocketId || socket.id);
      setRoomLobbyStatus(data.gameState || "WAITING_FRIEND");
    });

    socket.on("room_lobby_update", (data) => {
      setRoomId(data.roomId || null);
      setMode(data.mode || "1v1");
      setGridSize(data.gridSize || BOARD_SIZES[data.mode] || 8);
      setActiveShops(data.shops || SHOPS);
      setRoomPlayers(data.players || []);
      setRoomHostSocketId(data.hostSocketId || null);
      setRoomLobbyStatus(data.gameState || null);
      if (data.gameState === "WAITING_FRIEND") {
        setShowPrivateModal(true);
        setCreatedRoomCode(data.roomCode || null);
      }
      const currentPlayer = data.players?.find(
        (player) => player.socketId === socket.id,
      );
      if (currentPlayer) setTeam(currentPlayer.team);
    });

    socket.on("teams_updated", (data) => {
      setRoomPlayers(data.players || []);
      setRoomLobbyStatus(data.gameState || null);
      const currentPlayer = data.players?.find(
        (player) => player.socketId === socket.id,
      );
      if (currentPlayer) setTeam(currentPlayer.team);
    });

    socket.on("room_player_left", (data) => {
      setRoomPlayers(data.players || []);
      setCurrentTurnId(data.nextTurnId);
      setIsMyTurn(data.nextTurnId === socket.id);
    });

    socket.on("team_board_synced", (data) => setMyBoard(data.board));
    socket.on("surrender_vote_started", (data) => setSurrenderVote(data));
    socket.on("surrender_vote_failed", (data) => {
      setSurrenderVote(null);
      showAlert("Bỏ phiếu thất bại", data.message, "info");
    });
    socket.on("join_private_error", (msg) =>
      showAlert("Lỗi Hẻm Kín", msg, "error"),
    );
    socket.on("board_rejected", (msg) =>
      showAlert("Sơ đồ bị từ chối", msg, "warning"),
    );

    socket.on("start_coin_flip", (data) => {
      const { soundEnabled: sEnabled, sfxVolume: sVol } = soundRef.current;
      playSFX("coin-flip.mp3", sEnabled, sVol);
      setGameId(data.gameId || null);
      const first = data.firstTeam === gameConfigRef.current.team;
      setCoinFlipResult(first ? "FIRST" : "SECOND");
      setCurrentTurnId(data.firstTurnId);
      setIsMyTurn(data.firstTurnId === socket.id);
      setTurnTimeLeft(25);
    });

    socket.on("shot_result", (data) => {
      setAimingData(null);
      const { soundEnabled: sEnabled, sfxVolume: sVol } = soundRef.current;
      const type = data.sunkShopId ? "SUNK" : data.isHit ? "HIT" : "MISS";
      if (data.players) setRoomPlayers(data.players);

      if (data.sunkShopId) playSFX("success jingle.mp3", sEnabled, sVol);
      else if (data.isHit) playSFX("pop.mp3", sEnabled, sVol);
      else playSFX("waterdrop.mp3", sEnabled, sVol * 0.7);

      const textList = TAUNT_TEXTS[type] || TAUNT_TEXTS.MISS;
      const randomText = textList[Math.floor(Math.random() * textList.length)];
      setRecentShot({ index: data.targetIndex, type, text: randomText });
      setCurrentTurnId(data.nextTurnId);

      if (data.targetTeam !== gameConfigRef.current.team) {
        setOpponentHits((prev) => {
          const next = [...prev];
          next[data.targetIndex] = data.isHit ? "HIT" : "MISS";
          return next;
        });
        if (data.sunkShopId)
          setOpponentSunkShops((prev) => [...prev, data.sunkShopId]);
      } else {
        setMyBoard((prev) => {
          const next = [...prev];
          const currentCell = next[data.targetIndex];
          next[data.targetIndex] = {
            ...currentCell,
            shot: data.isHit ? "HIT" : "MISS",
          };
          return next;
        });
      }

      setTimeout(() => {
        setRecentShot(null);
        if (data.shooterId === socket.id) {
          shotPendingRef.current = false;
          setShotPending(false);
        }
        setIsMyTurn(data.nextTurnId === socket.id);
        setTurnTimeLeft(25);
      }, 1500);
    });

    socket.on("receive_chat", (data) => setMessages((prev) => [...prev, data]));
    socket.on("opponent_aiming", (data) => setAimingData(data));

    socket.on("game_over", (data) => {
      const { soundEnabled: sEnabled, sfxVolume: sVol } = soundRef.current;
      shotPendingRef.current = false;
      setShotPending(false);
      setSurrenderVote(null);
      setWinner(data.winnerTeam);
      setWinnerBoards(data.winnerBoards || []);
      setGameState("FINISHED");
      if (data.winnerTeam === gameConfigRef.current.team)
        playSFX("success jingle.mp3", sEnabled, sVol);
    });

    socket.on("opponent_requested_rematch", (msg) => {
      setMessages((prev) => [
        ...prev,
        { sender: "Hệ thống", text: msg, type: "ALL" },
      ]);
      showAlert(
        "Đồng Đội/Đối Thủ Thách Đấu",
        "🔥 MỌI NGƯỜI MUỐN CHƠI LẠI!\n\nHãy nhấn nút 'CHƠI LẠI' để nghênh chiến ngay!",
        "warning",
      );
    });

    socket.on("rematch_accepted", (data) => {
      const newShops = data.shops;
      const roomMode = data.mode === "2v2" ? "2v2" : "1v1";
      setMode(roomMode);
      setRoomPlayers(data.players || []);
      setActiveShops(newShops);
      resetGameData(newShops, data.gridSize || BOARD_SIZES[roomMode]);
      setGameState("SETUP");
      setMessages([{ sender: "Hệ thống", text: data.message, type: "ALL" }]);
      setCustomAlert((prev) => ({ ...prev, show: false }));
    });

    socket.on("opponent_left", (message) => {
      showAlert(
        "Thông báo",
        typeof message === "string"
          ? message
          : "Phòng đã bị giải tán hoặc đối thủ rời đi.",
        "error",
      );
      setGameState("LOBBY");
      setRoomId(null);
      setSearching(false);
      setShowPrivateModal(false);
      setCreatedRoomCode(null);
      setRoomPlayers([]);
      setRoomHostSocketId(null);
      setRoomLobbyStatus(null);
      setMessages([]);
    });

    return () => {
      socket.off("match_found");
      socket.off("connect");
      socket.off("connect_error");
      socket.off("waiting_for_opponent");
      socket.off("private_room_created");
      socket.off("room_lobby_update");
      socket.off("teams_updated");
      socket.off("room_player_left");
      socket.off("team_board_synced");
      socket.off("surrender_vote_started");
      socket.off("surrender_vote_failed");
      socket.off("join_private_error");
      socket.off("board_rejected");
      socket.off("start_coin_flip");
      socket.off("shot_result");
      socket.off("receive_chat");
      socket.off("opponent_aiming");
      socket.off("game_over");
      socket.off("opponent_requested_rematch");
      socket.off("rematch_accepted");
      socket.off("opponent_left");
      socket.disconnect();
    };
  }, []);

  const handleFindMatch = (name, selectedMode) => {
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
    setPlayerName(name);
    setMode(selectedMode);
    setSearching(true);
    socket.emit("tim_doi_thu", { name, mode: selectedMode });
  };
  const handleCancelSearch = () => {
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
    setSearching(false);
    socket.emit("cancel_search");
  };
  const handleCreatePrivateRoom = (selectedMode) => {
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
    socket.emit("create_private_room", {
      name: currentUser?.displayName || playerName || "Phượt Thủ Hẻm",
      mode: selectedMode,
    });
  };
  const handleChangePrivateMode = (selectedMode) =>
    socket.emit("set_private_mode", {
      roomId: roomIdRef.current,
      mode: selectedMode,
    });
  const handleSwapTeams = (targetSocketId) =>
    socket.emit("swap_teams", {
      roomId: roomIdRef.current,
      ...(targetSocketId === "red" || targetSocketId === "blue"
        ? { targetTeam: targetSocketId }
        : { targetSocketId }),
    });
  const handleJoinPrivateRoom = (code) => {
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
    socket.emit("join_private_room", {
      roomCode: code,
      name: currentUser?.displayName || playerName || "Phượt Thủ Hẻm",
    });
  };
  const handleCancelPrivateRoom = () => {
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
    setCreatedRoomCode(null);
    setRoomLobbyStatus(null);
    setRoomPlayers([]);
    setShowPrivateModal(false);
    socket.emit("cancel_search");
  };
  const handleAddBot = (targetTeam) =>
    socket.emit("add_bot", { roomId: roomIdRef.current, team: targetTeam });
  const handleKickPlayer = (targetId) =>
    socket.emit("kick_player", { roomId: roomIdRef.current, targetId });
  const handleHostStartGame = () =>
    socket.emit("host_start_game", { roomId: roomIdRef.current });

  const handleRotate = () => {
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
    setRotation((prev) => (prev + 1) % 4);
  };

  const handleResetBoard = () => {
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
    const emptyBoard = Array(gridSize * gridSize).fill(null);
    setMyBoard(emptyBoard);
    setPreviewIndex(null);
    setRotation(0);
    if (gameConfigRef.current.mode === "2v2")
      socket.emit("sync_team_board", {
        roomId: roomIdRef.current,
        board: emptyBoard,
      });
  };

  // CHỐT ĐẶT QUÁN CỐ ĐỊNH THEO MA TRẬN XOAY 4 HƯỚNG
  const handleConfirmPlaceShop = () => {
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
    if (previewIndex === null) return;

    const currentShopObj =
      activeShops.find((s) => s.id === selectedShop) || activeShops[0];
    const shape = rotateShape(currentShopObj.shape || [[1]], rotation);
    const rows = shape.length;
    const cols = shape[0].length;

    let startRow = Math.floor(previewIndex / gridSize);
    let startCol = previewIndex % gridSize;

    if (startCol + cols > gridSize) startCol = gridSize - cols;
    if (startRow + rows > gridSize) startRow = gridSize - rows;

    const indices = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (shape[r][c] === 1) {
          indices.push((startRow + r) * gridSize + (startCol + c));
        }
      }
    }

    const isOverlap = indices.some(
      (idx) => myBoard[idx] !== null && myBoard[idx].shopId !== selectedShop,
    );

    if (!isOverlap) {
      const newBoard = myBoard.map((cell) =>
        cell && cell.shopId === selectedShop ? null : cell,
      );
      indices.forEach((idx) => {
        newBoard[idx] = {
          shopId: currentShopObj.id,
          icon: currentShopObj.icon,
          name: currentShopObj.name,
        };
      });
      setMyBoard(newBoard);
      setPreviewIndex(null);

      if (gameConfigRef.current.mode === "2v2") {
        socket.emit("sync_team_board", {
          roomId: roomIdRef.current,
          board: newBoard,
        });
      }

      // Tự chuyển sang chọn quán tiếp theo chưa đặt
      const placedShopIds = new Set(
        newBoard.filter(Boolean).map((c) => c.shopId),
      );
      const nextShop = activeShops.find((s) => !placedShopIds.has(s.id));
      if (nextShop) {
        setSelectedShop(nextShop.id);
        setRotation(0);
      }
    }
  };

  const handleReady = () => {
    const currentRoom = roomIdRef.current;
    if (!currentRoom) {
      showAlert(
        "Lỗi Phòng",
        "Không tìm thấy mã phòng! Vui lòng quay lại sảnh.",
        "error",
      );
      setGameState("LOBBY");
      return;
    }
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
    socket.emit("ready_place_shops", {
      roomId: currentRoom,
      playerBoard: myBoard,
    });
    setMessages((prev) => [
      ...prev,
      {
        sender: "Hệ thống",
        text: "Đã chốt sơ đồ! Đang chờ đối thủ...",
        type: "ALL",
      },
    ]);
  };

  const handleFireShot = (targetIndex) => {
    if (
      !isMyTurn ||
      gameState !== "PLAYING" ||
      recentShot !== null ||
      shotPendingRef.current
    )
      return;
    if (opponentHits[targetIndex] !== null) return;
    shotPendingRef.current = true;
    setShotPending(true);
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.5);
    socket.emit("fire_shot", { roomId: roomIdRef.current, targetIndex });
  };

  const handleAimShot = (targetIndex) => {
    if (!isMyTurn || gameState !== "PLAYING" || shotPendingRef.current) return;
    socket.emit("aim_shot", { roomId: roomIdRef.current, targetIndex });
  };

  const handleSendChat = (text, type = "ALL") =>
    socket.emit("send_chat", { roomId: roomIdRef.current, text, type });
  const handleSurrender = () =>
    socket.emit("surrender_request", { roomId: roomIdRef.current });
  const handleSurrenderVote = (agree) => {
    socket.emit("surrender_vote", { roomId: roomIdRef.current, agree });
    setSurrenderVote(null);
  };

  const handleRematch = () => {
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
    socket.emit("request_rematch", { roomId: roomIdRef.current });
    showAlert(
      "Chờ phản hồi",
      "⏳ Đã gửi lời thách đấu!\n\nĐang chờ mọi người đồng ý...",
      "info",
    );
  };

  const handleLeaveRoom = () => {
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
    socket.emit("leave_room", { roomId: roomIdRef.current });
    setGameState("LOBBY");
    setRoomId(null);
    setSearching(false);
    setRoomPlayers([]);
    setRoomLobbyStatus(null);
    setCreatedRoomCode(null);
    setMessages([]);
  };

  const handleReportMatch = async ({ reportedPlayer, reason }) => {
    const response = await fetch(apiUrl("/api/reports"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ gameId, reportedPlayer, reason, matchId: gameId }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(result.message || "Không gửi được báo cáo.");
    showAlert(
      "Đã nhận báo cáo",
      "Báo cáo trận đã được gửi để quản trị viên xem xét.",
      "success",
    );
  };

  const getShopHealth = (shopId) => {
    const shopCells = myBoard.filter((cell) => cell && cell.shopId === shopId);
    const aliveCells = shopCells.filter((cell) => cell.shot !== "HIT");
    return {
      total: shopCells.length,
      alive: aliveCells.length,
      isSunk: shopCells.length > 0 && aliveCells.length === 0,
    };
  };

  if (appLoading)
    return <LoadingScreen onFinish={() => setAppLoading(false)} />;

  return (
    <div className="flex h-dvh w-full flex-col bg-slate-950 font-sans text-white md:p-2 overflow-hidden">
      <div
        className={`relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-slate-900 transition-all duration-500 md:rounded-2xl md:border-2 md:border-slate-800 md:shadow-2xl ${
          gameState === "LOBBY" ? "" : ""
        }`}
      >
        {gameState === "LOBBY" ? (
          <>
            <LobbyScreen
              onFindMatch={handleFindMatch}
              connectionError={connectionError}
              onOpenSettings={() => {
                playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
                setShowSettings(true);
              }}
              onOpenGuide={() => {
                playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
                setShowGuide(true);
              }}
              onOpenLeaderboard={() => {
                playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
                setShowLeaderboard(true);
              }}
              onOpenAuth={() => {
                playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
                setShowAuthModal(true);
              }}
              onOpenDonate={() => {
                playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
                setShowDonateModal(true);
              }}
              onOpenCommunity={() => setShowSocialHub(true)}
              onOpenPrivateRoom={() => {
                playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
                setShowPrivateModal(true);
              }}
              onOpenTutorial={() => setShowTutorial(true)}
              currentUser={currentUser}
              onLogout={handleLogout}
            />
            {searching && <SearchingScreen onCancel={handleCancelSearch} />}
            {showTutorial && (
              <InteractiveTutorial
                onComplete={() => {
                  localStorage.setItem("hasSeenTutorial", "true");
                  setShowTutorial(false);
                }}
                soundEnabled={soundEnabled}
                sfxVolume={sfxVolume}
              />
            )}
          </>
        ) : (
          <div className="flex flex-col w-full h-full">
            <Header
              team={team}
              playerName={currentUser?.displayName || playerName}
              isMyTurn={isMyTurn}
              gameState={gameState}
              turnTimeLeft={turnTimeLeft}
              onOpenSettings={() => {
                playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
                setShowSettings(true);
              }}
              onSurrender={handleSurrender}
            />
            {connectionError && (
              <p
                role="status"
                className="w-full border-b border-rose-500/30 bg-rose-950/80 px-3 py-1 text-center text-[10px] font-bold text-rose-200"
              >
                {connectionError}
              </p>
            )}

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-950">
              {/* CỘT TRÁI: Roster + HUD + BottomPanel */}
              <div className="w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-800 shrink-0 min-h-0 overflow-y-auto">
                {(gameState === "SETUP" || mode === "2v2") && (
                  <div className="p-2 sm:p-3 pb-0">
                    <RoomRoster
                      players={roomPlayers}
                      currentSocketId={socket.id}
                      hostSocketId={roomHostSocketId}
                      turnId={currentTurnId}
                      mode={mode}
                      canSwap={
                        (gameState === "SETUP" ||
                          roomLobbyStatus === "WAITING_FRIEND") &&
                        !roomPlayers.some((player) => player.ready)
                      }
                      onSwapTeams={handleSwapTeams}
                    />
                  </div>
                )}
                {gameState === "PLAYING" && (
                  <div className="p-2 sm:p-3 shrink-0">
                    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 flex justify-between items-center shadow-xl animate-fade-in">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                          🏠 ĐỘI BẠN
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-w-30">
                          {activeShops.map((s, idx) => {
                            const health = getShopHealth(s.id);
                            return (
                              <div
                                key={`my-hud-${s.id}-${idx}`}
                                className={`relative w-8 h-8 rounded-lg p-0.5 border flex items-center justify-center transition-all ${health.isSunk ? "bg-red-950/70 border-red-700 opacity-40 grayscale" : "bg-slate-800 border-slate-700 shadow"}`}
                              >
                                <img
                                  src={s.icon}
                                  className="w-full h-full object-contain"
                                  alt={s.name}
                                />
                                {!health.isSunk && health.total > 0 && (
                                  <span className="absolute -bottom-1 -right-1 bg-slate-950 text-emerald-400 border border-emerald-800 text-[9px] font-black px-1 rounded-full">
                                    {health.alive}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="text-xs font-black text-slate-600 px-1">
                        VS
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider">
                          🎯 ĐỘI ĐỊCH
                        </span>
                        <div className="flex flex-wrap justify-end gap-1.5 max-w-30">
                          {activeShops.map((s, idx) => (
                            <div
                              key={`opp-hud-${s.id}-${idx}`}
                              className={`relative w-8 h-8 rounded-lg p-0.5 border flex items-center justify-center text-xs font-bold shadow ${opponentSunkShops.includes(s.id) ? "bg-red-950/70 border-red-700 opacity-50 grayscale" : "bg-slate-800/80 border-slate-700/80 text-slate-400"}`}
                            >
                              {opponentSunkShops.includes(s.id) ? (
                                <>
                                  <img
                                    src={s.icon}
                                    className="h-full w-full object-contain"
                                    alt={s.name}
                                  />
                                  <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-red-500">
                                    ✖
                                  </span>
                                </>
                              ) : (
                                "❓"
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <BottomPanel
                  gameState={gameState}
                  selectedShop={selectedShop}
                  onSelectShop={(id) => {
                    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
                    setSelectedShop(id);
                    setRotation(0);
                  }}
                  rotation={rotation}
                  onRotate={handleRotate}
                  onResetBoard={handleResetBoard}
                  myBoard={myBoard}
                  onConfirmPlaceShop={handleConfirmPlaceShop}
                  isPreviewValid={previewIndex !== null}
                  onReady={handleReady}
                  onSendChat={handleSendChat}
                  messages={messages}
                  shops={activeShops}
                  showChatToggle={mode === "2v2"}
                />
              </div>

              {/* CỘT PHẢI: GameBoard */}
              <main className="flex-1 p-2 md:p-6 flex items-center justify-center relative overflow-hidden bg-slate-950 min-h-0">
                <GameBoard
                  gameState={gameState}
                  myBoard={myBoard}
                  setMyBoard={(newBoard) => {
                    setMyBoard(newBoard);
                    if (mode === "2v2")
                      socket.emit("sync_team_board", {
                        roomId: roomIdRef.current,
                        board: newBoard,
                      });
                    const placedShopIds = new Set(
                      newBoard.filter(Boolean).map((c) => c.shopId),
                    );
                    const nextShop = activeShops.find(
                      (s) => !placedShopIds.has(s.id),
                    );
                    if (nextShop) {
                      setSelectedShop(nextShop.id);
                      setRotation(0);
                    }
                  }}
                  opponentHits={opponentHits}
                  selectedShop={selectedShop}
                  rotation={rotation}
                  previewIndex={previewIndex}
                  setPreviewIndex={setPreviewIndex}
                  isMyTurn={isMyTurn}
                  isMyTeamTurn={isMyTeamTurn}
                  shotPending={shotPending}
                  onFireShot={handleFireShot}
                  aimingData={aimingData}
                  onAimShot={handleAimShot}
                  recentShot={recentShot}
                  showTaunt={showTaunt}
                  soundEnabled={soundEnabled}
                  shops={activeShops}
                  boardSize={gridSize}
                  equippedCosmetics={currentUser?.equippedCosmetics || []}
                  team={team}
                />
              </main>
            </div>

            {coinFlipResult && (
              <CoinFlipOverlay
                result={coinFlipResult}
                isTeamMode={mode === "2v2"}
                onComplete={() => {
                  setCoinFlipResult(null);
                  setGameState("PLAYING");
                }}
              />
            )}
            {surrenderVote && (
              <SurrenderVoteModal
                initiatorName={surrenderVote.initiatorName}
                onVote={handleSurrenderVote}
              />
            )}
            {gameState === "FINISHED" && (
              <ResultScreen
                isWinner={winner === team}
                gameId={gameId}
                canReport={Boolean(currentUser)}
                opponents={roomPlayers.filter((player) => player.team !== team)}
                onReport={handleReportMatch}
                winnerBoards={winnerBoards}
                shops={activeShops}
                boardSize={gridSize}
                equippedCosmetics={currentUser?.equippedCosmetics || []}
                onRematch={handleRematch}
                onLeave={handleLeaveRoom}
              />
            )}
          </div>
        )}

        {/* MODALS */}
        <SocialHub
          isOpen={showSocialHub}
          onClose={() => setShowSocialHub(false)}
          currentUser={currentUser}
          onUserUpdate={(user) => {
            setCurrentUser(user);
            refreshSocketAuth();
          }}
          socket={socket}
        />
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          bgmVolume={bgmVolume}
          onChangeBgmVolume={setBgmVolume}
          sfxVolume={sfxVolume}
          onChangeSfxVolume={setSfxVolume}
          showTaunt={showTaunt}
          onToggleTaunt={() => setShowTaunt(!showTaunt)}
          vibrate={vibrate}
          onToggleVibrate={() => setVibrate(!vibrate)}
          playerName={currentUser?.displayName || playerName}
          isAuthenticated={Boolean(currentUser)}
          onPasswordChanged={(token) => {
            localStorage.setItem("token", token);
            refreshSocketAuth();
          }}
        />
        <GuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
        <LeaderboardModal
          isOpen={showLeaderboard}
          onClose={() => setShowLeaderboard(false)}
        />
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={(user) => {
            setCurrentUser(user);
            refreshSocketAuth();
          }}
        />
        <DonateModal
          isOpen={showDonateModal}
          onClose={() => setShowDonateModal(false)}
          currentUser={currentUser}
          onAccountUpdate={(account) => {
            const updated = { ...currentUser, ...account };
            localStorage.setItem("user", JSON.stringify(updated));
            setCurrentUser(updated);
          }}
        />
        <PrivateRoomModal
          isOpen={showPrivateModal}
          onClose={() => {
            if (roomLobbyStatus === "WAITING_FRIEND") handleCancelPrivateRoom();
            else {
              setShowPrivateModal(false);
              setCreatedRoomCode(null);
            }
          }}
          onCreateRoom={handleCreatePrivateRoom}
          onJoinRoom={handleJoinPrivateRoom}
          onCancelWaiting={handleCancelPrivateRoom}
          roomLobby={
            roomLobbyStatus
              ? {
                  roomId,
                  roomCode: createdRoomCode,
                  hostSocketId: roomHostSocketId,
                  mode,
                  gridSize,
                  playerCount: mode === "2v2" ? 4 : 2,
                  gameState: roomLobbyStatus,
                  players: roomPlayers,
                }
              : null
          }
          currentSocketId={socket.id}
          onChangeMode={handleChangePrivateMode}
          onSwapTeams={handleSwapTeams}
          onAddBot={handleAddBot}
          onKickPlayer={handleKickPlayer}
          onHostStart={handleHostStartGame}
        />

        {/* CUSTOM TOAST */}
        {customAlert.show && (
          <div className="absolute inset-0 z-100 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
            <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 shadow-2xl w-full max-w-sm animate-fade-in flex flex-col items-center text-center">
              <div className="text-5xl mb-3 drop-shadow-md">
                {customAlert.type === "error"
                  ? "❌"
                  : customAlert.type === "warning"
                    ? "⚠️"
                    : customAlert.type === "success"
                      ? "✅"
                      : "🔔"}
              </div>
              <h3
                className={`text-xl font-black uppercase mb-3 ${customAlert.type === "error" ? "text-red-400" : customAlert.type === "warning" ? "text-amber-400" : "text-emerald-400"}`}
              >
                {customAlert.title}
              </h3>
              <p className="text-slate-200 text-sm font-medium whitespace-pre-wrap mb-6 leading-relaxed">
                {customAlert.message}
              </p>
              <button
                onClick={() => setCustomAlert({ ...customAlert, show: false })}
                className="bg-amber-500 hover:bg-yellow-400 text-slate-950 font-black px-8 py-3 rounded-2xl uppercase tracking-wider transition active:scale-95 w-full shadow-lg"
              >
                ĐÃ RÕ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
