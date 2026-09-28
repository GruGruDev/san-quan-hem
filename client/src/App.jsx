import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

// Import Constants
import { SHOPS, TAUNT_TEXTS } from "./constants/game";

// Import Audio Utilities
import { playBGM, playSFX, stopBGM } from "./utils/sound";

// Import Components
import BottomPanel from "./components/BottomPanel";
import CoinFlipOverlay from "./components/CoinFlipOverlay";
import GameBoard from "./components/GameBoard";
import Header from "./components/Header";
import LoadingScreen from "./components/LoadingScreen";
import LobbyScreen from "./components/LobbyScreen";
import ResultScreen from "./components/ResultScreen";
import SearchingScreen from "./components/SearchingScreen";

// Import Modals
import AuthModal from "./components/Modals/AuthModal";
import DonateModal from "./components/Modals/DonateModal";
import GuideModal from "./components/Modals/GuideModal";
import LeaderboardModal from "./components/Modals/LeaderboardModal";
import PrivateRoomModal from "./components/Modals/PrivateRoomModal";
import SettingsModal from "./components/Modals/SettingsModal";

// Lấy URL từ biến môi trường Vite, nếu không có thì fallback về localhost
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

// Kết nối Socket.IO
const socket = io(SERVER_URL, {
  autoConnect: false,
});

export default function App() {
  // --- STATES TÀI KHOẢN ---
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // --- STATES CÀI ĐẶT GAME ---
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [bgmVolume, setBgmVolume] = useState(0.4);
  const [sfxVolume, setSfxVolume] = useState(0.8);
  const [showTaunt, setShowTaunt] = useState(true);
  const [vibrate, setVibrate] = useState(true);

  const soundRef = useRef({ soundEnabled, sfxVolume });
  useEffect(() => {
    soundRef.current = { soundEnabled, sfxVolume };
  }, [soundEnabled, sfxVolume]);

  // --- HỆ THỐNG THÔNG BÁO CUSTOM (CUSTOM ALERT UI) ---
  const [customAlert, setCustomAlert] = useState({
    show: false,
    title: "",
    message: "",
    type: "info",
  });
  const showAlert = (title, message, type = "info") => {
    setCustomAlert({ show: true, title, message, type });
  };

  // --- STATES QUẢN LÝ GAME ---
  const [appLoading, setAppLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const [gameState, setGameState] = useState("LOBBY");
  const [playerName, setPlayerName] = useState("");
  const [team, setTeam] = useState("red");

  const [roomId, setRoomId] = useState(null);
  const roomIdRef = useRef(roomId);
  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  const [activeShops, setActiveShops] = useState(SHOPS);

  const [selectedShop, setSelectedShop] = useState(SHOPS[0]?.id || "cavien");
  const [orientation, setOrientation] = useState("HORIZONTAL");
  const [previewIndex, setPreviewIndex] = useState(null);
  const [myBoard, setMyBoard] = useState(Array(64).fill(null));
  const [opponentHits, setOpponentHits] = useState(Array(64).fill(null));

  const [isMyTurn, setIsMyTurn] = useState(false);
  const [coinFlipResult, setCoinFlipResult] = useState(null);
  const [recentShot, setRecentShot] = useState(null);
  const [opponentAimingIndex, setOpponentAimingIndex] = useState(null);
  const [winner, setWinner] = useState(null);
  const [turnTimeLeft, setTurnTimeLeft] = useState(25);

  const [messages, setMessages] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [showPrivateModal, setShowPrivateModal] = useState(false);
  const [createdRoomCode, setCreatedRoomCode] = useState(null);

  const getToken = () => localStorage.getItem("token");

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem("user");
      }
    }
  }, []);

  useEffect(() => {
    if (vibrate && recentShot && window.navigator.vibrate) {
      window.navigator.vibrate([100, 50, 100]);
    }
  }, [recentShot, vibrate]);

  useEffect(() => {
    if (!soundEnabled) {
      stopBGM();
      return;
    }
    if (gameState === "LOBBY") {
      playBGM("lofi.mp3", soundEnabled, bgmVolume);
    } else if (gameState === "SETUP" || gameState === "PLAYING") {
      playBGM("acousticstreet.mp3", soundEnabled, bgmVolume);
    } else if (gameState === "FINISHED") {
      stopBGM();
    }
  }, [gameState, soundEnabled, bgmVolume]);

  useEffect(() => {
    if (
      gameState === "PLAYING" &&
      isMyTurn &&
      turnTimeLeft <= 5 &&
      turnTimeLeft > 0
    ) {
      playSFX("TurnTimer.mp3", soundEnabled, sfxVolume * 0.7);
    }
  }, [turnTimeLeft, isMyTurn, gameState, soundEnabled, sfxVolume]);

  useEffect(() => {
    let timer = null;
    if (gameState === "PLAYING" && turnTimeLeft > 0) {
      timer = setInterval(() => {
        setTurnTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState, turnTimeLeft]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setCurrentUser(null);
  };

  const resetGameData = (newShops = activeShops) => {
    setMyBoard(Array(64).fill(null));
    setOpponentHits(Array(64).fill(null));
    setSelectedShop(newShops[0]?.id || "cavien");
    setOrientation("HORIZONTAL");
    setPreviewIndex(null);
    setIsMyTurn(false);
    setCoinFlipResult(null);
    setRecentShot(null);
    setWinner(null);
    setTurnTimeLeft(25);
    setOpponentAimingIndex(null);
  };

  // --- SOCKET LISTENERS ---
  useEffect(() => {
    socket.connect();

    socket.on("match_found", (data) => {
      const roomShops = data.shops || SHOPS;
      setActiveShops(roomShops);
      resetGameData(roomShops);

      setRoomId(data.roomId);
      setTeam(data.team);
      setGameState("SETUP");
      setSearching(false);
      setShowPrivateModal(false);
      setCreatedRoomCode(null);
      setMessages([{ sender: "Hệ thống", text: data.message }]);
      // Đóng hộp thoại alert nếu đang mở dở
      setCustomAlert((prev) => ({ ...prev, show: false }));
    });

    socket.on("waiting_for_opponent", (msg) => {
      setMessages((prev) => [...prev, { sender: "Hệ thống", text: msg }]);
    });

    socket.on("private_room_created", (data) => {
      setCreatedRoomCode(data.roomCode);
      setRoomId(data.roomId);
    });

    socket.on("join_private_error", (msg) => {
      showAlert("Lỗi Hẻm Kín", msg, "error");
    });

    socket.on("board_rejected", (msg) => {
      showAlert("Sơ đồ bị từ chối", msg, "warning");
    });

    socket.on("start_coin_flip", (data) => {
      const { soundEnabled: sEnabled, sfxVolume: sVol } = soundRef.current;
      playSFX("coin-flip.mp3", sEnabled, sVol);
      const first = data.firstTurnId === socket.id;
      setCoinFlipResult(first ? "FIRST" : "SECOND");
      setIsMyTurn(first);
      setTurnTimeLeft(25);
    });

    socket.on("shot_result", (data) => {
      const { soundEnabled: sEnabled, sfxVolume: sVol } = soundRef.current;
      const isMeShooter = data.shooter === socket.id;
      const type = data.sunkShopId ? "SUNK" : data.isHit ? "HIT" : "MISS";

      if (data.isHit) {
        playSFX("sizzling-pan.mp3", sEnabled, sVol);
      } else {
        playSFX("waterdrop.mp3", sEnabled, sVol * 0.7);
      }

      const textList = TAUNT_TEXTS[type] || TAUNT_TEXTS.MISS;
      const randomText = textList[Math.floor(Math.random() * textList.length)];

      setRecentShot({ index: data.targetIndex, type, text: randomText });

      if (isMeShooter) {
        setOpponentHits((prev) => {
          const next = [...prev];
          next[data.targetIndex] = data.isHit ? "HIT" : "MISS";
          return next;
        });
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
        setIsMyTurn(data.nextTurn === socket.id);
        setTurnTimeLeft(25);
      }, 2000);
    });

    socket.on("receive_chat", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("game_over", (data) => {
      const { soundEnabled: sEnabled, sfxVolume: sVol } = soundRef.current;
      setWinner(data.winner);
      setGameState("FINISHED");
      if (data.winner === socket.id) {
        playSFX("success jingle.mp3", sEnabled, sVol);
      }
    });

    socket.on("opponent_requested_rematch", (msg) => {
      setMessages((prev) => [...prev, { sender: "Hệ thống", text: msg }]);
      // Dùng Custom Alert để thay cho alert() xấu xí
      showAlert(
        "Đối Thủ Thách Đấu",
        "🔥 ĐỐI THỦ MUỐN PHỤC THÙ!\n\nHãy nhấn nút 'CHƠI LẠI VỚI ĐỐI THỦ' để nghênh chiến ngay!",
        "warning",
      );
    });

    socket.on("rematch_accepted", (data) => {
      const newShops = data.shops;
      setActiveShops(newShops);
      resetGameData(newShops);
      setGameState("SETUP");
      setMessages([{ sender: "Hệ thống", text: data.message }]);
      setCustomAlert((prev) => ({ ...prev, show: false })); // Tắt popup
    });

    socket.on("opponent_left", (data) => {
      // Đổi Alert thành Custom Toast bự
      showAlert(
        "Đối Thủ Rời Sảnh",
        "Đối thủ đã rời đi hoặc ngắt kết nối.\nVui lòng quay về sảnh tìm đối thủ mới!",
        "error",
      );
      setGameState("LOBBY");
      setRoomId(null);
      setSearching(false);
      setShowPrivateModal(false);
      setCreatedRoomCode(null);
      setMessages([]);
    });

    return () => {
      socket.off("match_found");
      socket.off("waiting_for_opponent");
      socket.off("private_room_created");
      socket.off("join_private_error");
      socket.off("board_rejected");
      socket.off("start_coin_flip");
      socket.off("shot_result");
      socket.off("receive_chat");
      socket.off("game_over");
      socket.off("opponent_requested_rematch");
      socket.off("rematch_accepted");
      socket.off("opponent_left");
      socket.disconnect();
    };
  }, []); // Vẫn giữ mảng rỗng để không bị reconnect vòng lặp

  // --- HANDLERS ---
  const handleFindMatch = (name) => {
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
    setPlayerName(name);
    setSearching(true);
    socket.emit("tim_doi_thu", { name, token: getToken() });
  };

  const handleCancelSearch = () => {
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
    setSearching(false);
    socket.emit("cancel_search");
  };

  const handleCreatePrivateRoom = () => {
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
    socket.emit("create_private_room", {
      name: currentUser?.displayName || playerName || "Phượt Thủ Hẻm",
      token: getToken(),
    });
  };

  const handleJoinPrivateRoom = (code) => {
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
    socket.emit("join_private_room", {
      roomCode: code,
      name: currentUser?.displayName || playerName || "Phượt Thủ Hẻm",
      token: getToken(),
    });
  };

  const handleCancelPrivateRoom = () => {
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
    setCreatedRoomCode(null);
    setShowPrivateModal(false);
    socket.emit("cancel_search");
  };

  const handleRotate = () => {
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
    const nextOrientation =
      orientation === "HORIZONTAL" ? "VERTICAL" : "HORIZONTAL";
    setOrientation(nextOrientation);

    const currentShopObj = activeShops.find((s) => s.id === selectedShop);
    if (!currentShopObj) return;

    const placedIndex = myBoard.findIndex(
      (cell) => cell && cell.shopId === selectedShop,
    );
    if (placedIndex !== -1) {
      let row = Math.floor(placedIndex / 8);
      let col = placedIndex % 8;
      const size = currentShopObj.size;
      const isHorizontal = nextOrientation === "HORIZONTAL";

      if (isHorizontal && col + size > 8) col = 8 - size;
      if (!isHorizontal && row + size > 8) row = 8 - size;

      const adjustedIndex = row * 8 + col;
      const newIndices = [];
      for (let i = 0; i < size; i++) {
        newIndices.push(
          isHorizontal ? adjustedIndex + i : adjustedIndex + i * 8,
        );
      }

      const isOverlap = newIndices.some((idx) => {
        const cell = myBoard[idx];
        return cell !== null && cell.shopId !== selectedShop;
      });

      if (!isOverlap) {
        const newBoard = myBoard.map((cell) =>
          cell && cell.shopId === selectedShop ? null : cell,
        );
        newIndices.forEach((idx) => {
          newBoard[idx] = {
            shopId: currentShopObj.id,
            icon: currentShopObj.icon,
            name: currentShopObj.name,
          };
        });
        setMyBoard(newBoard);
        setPreviewIndex(adjustedIndex);
      }
    }
  };

  const handleConfirmPlaceShop = () => {
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
    if (previewIndex === null) return;

    const currentShopObj =
      activeShops.find((s) => s.id === selectedShop) || activeShops[0];
    const size = currentShopObj.size;
    const isHorizontal = orientation === "HORIZONTAL";

    let row = Math.floor(previewIndex / 8);
    let col = previewIndex % 8;

    if (isHorizontal && col + size > 8) col = 8 - size;
    if (!isHorizontal && row + size > 8) row = 8 - size;

    const adjustedIndex = row * 8 + col;
    const indices = [];
    for (let i = 0; i < size; i++) {
      indices.push(isHorizontal ? adjustedIndex + i : adjustedIndex + i * 8);
    }

    const isOverlap = indices.some((idx) => {
      const cell = myBoard[idx];
      return cell !== null && cell.shopId !== selectedShop;
    });

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

      const placedShopIds = new Set(
        newBoard.filter(Boolean).map((c) => c.shopId),
      );
      const nextShop = activeShops.find((s) => !placedShopIds.has(s.id));
      if (nextShop) {
        setSelectedShop(nextShop.id);
      }
    }
  };

  const handleResetBoard = () => {
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
    setMyBoard(Array(64).fill(null));
    setPreviewIndex(null);
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
      { sender: "Hệ thống", text: "Đã chốt sơ đồ! Đang chờ đối thủ..." },
    ]);
  };

  const handleFireShot = (targetIndex) => {
    if (!isMyTurn || gameState !== "PLAYING" || recentShot !== null) return;
    if (opponentHits[targetIndex] !== null) return;

    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.5);
    socket.emit("fire_shot", { roomId: roomIdRef.current, targetIndex });
  };
  const handleAimShot = (targetIndex) => {
    if (!isMyTurn || gameState !== "PLAYING") return;
    socket.emit("aim_shot", { roomId: roomIdRef.current, targetIndex });
  };

  const handleSendChat = (text) => {
    socket.emit("send_chat", { roomId: roomIdRef.current, text });
  };

  const handleRematch = () => {
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
    socket.emit("request_rematch", { roomId: roomIdRef.current });
    showAlert(
      "Chờ phản hồi",
      "⏳ Đã gửi lời thách đấu!\n\nĐang chờ đối thủ đồng ý...",
      "info",
    );
  };

  const handleLeaveRoom = () => {
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
    socket.emit("leave_room");
    setGameState("LOBBY");
    setRoomId(null);
    setSearching(false);
    setMessages([]);
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
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-2 select-none font-sans relative">
      <div className="w-full max-w-md bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border-4 border-slate-800 flex flex-col h-[850px] max-h-screen relative">
        {gameState === "LOBBY" ? (
          <>
            <LobbyScreen
              onFindMatch={handleFindMatch}
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
              onOpenPrivateRoom={() => {
                playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
                setShowPrivateModal(true);
              }}
              currentUser={currentUser}
              onLogout={handleLogout}
            />
            {searching && <SearchingScreen onCancel={handleCancelSearch} />}
          </>
        ) : (
          <>
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
            />
            <main className="flex-1 bg-slate-950 p-3 flex flex-col justify-between items-center relative overflow-visible">
              {gameState === "PLAYING" && (
                <div className="w-full max-w-[360px] bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 flex justify-between items-center shadow-xl my-auto animate-fade-in">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                      🏠 QUÁN BẠN
                    </span>
                    <div className="flex gap-1.5">
                      {activeShops.map((s) => {
                        const health = getShopHealth(s.id);
                        return (
                          <div
                            key={`my-hud-${s.id}`}
                            className={`relative w-9 h-9 rounded-xl p-0.5 border flex items-center justify-center transition-all ${health.isSunk ? "bg-red-950/70 border-red-700 opacity-40 grayscale" : "bg-slate-800 border-slate-700 shadow"}`}
                          >
                            <img
                              src={s.icon}
                              className="w-full h-full object-contain"
                              alt={s.name}
                            />
                            {health.isSunk && (
                              <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-red-500">
                                ✖
                              </span>
                            )}
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
                      🎯 ĐỐI THỦ
                    </span>
                    <div className="flex gap-1.5">
                      {activeShops.map((s) => (
                        <div
                          key={`opp-hud-${s.id}`}
                          className="w-9 h-9 rounded-xl p-0.5 border bg-slate-800/80 border-slate-700/80 flex items-center justify-center text-xs font-bold text-slate-400 shadow"
                        >
                          ❓
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div className="my-auto w-full flex justify-center">
                <GameBoard
                  gameState={gameState}
                  myBoard={myBoard}
                  setMyBoard={setMyBoard}
                  opponentHits={opponentHits}
                  selectedShop={selectedShop}
                  orientation={orientation}
                  previewIndex={previewIndex}
                  setPreviewIndex={setPreviewIndex}
                  isMyTurn={isMyTurn}
                  onFireShot={handleFireShot}
                  recentShot={showTaunt ? recentShot : null}
                  soundEnabled={soundEnabled}
                  shops={activeShops}
                />
              </div>
            </main>
            <BottomPanel
              gameState={gameState}
              selectedShop={selectedShop}
              onSelectShop={(id) => {
                playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
                setSelectedShop(id);
              }}
              orientation={orientation}
              onRotate={handleRotate}
              onResetBoard={handleResetBoard}
              myBoard={myBoard}
              onConfirmPlaceShop={handleConfirmPlaceShop}
              isPreviewValid={previewIndex !== null}
              onReady={handleReady}
              onSendChat={handleSendChat}
              messages={messages}
              shops={activeShops}
            />
            {coinFlipResult && (
              <CoinFlipOverlay
                result={coinFlipResult}
                onComplete={() => {
                  setCoinFlipResult(null);
                  setGameState("PLAYING");
                }}
              />
            )}
            {gameState === "FINISHED" && (
              <ResultScreen
                isWinner={winner === socket.id}
                onRematch={handleRematch}
                onLeave={handleLeaveRoom}
              />
            )}
          </>
        )}

        {/* CÁC MODALS CỦA GAME */}
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
        />
        <GuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
        <LeaderboardModal
          isOpen={showLeaderboard}
          onClose={() => setShowLeaderboard(false)}
        />
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={(user) => setCurrentUser(user)}
        />
        <DonateModal
          isOpen={showDonateModal}
          onClose={() => setShowDonateModal(false)}
        />
        <PrivateRoomModal
          isOpen={showPrivateModal}
          onClose={() => {
            setShowPrivateModal(false);
            setCreatedRoomCode(null);
          }}
          onCreateRoom={handleCreatePrivateRoom}
          onJoinRoom={handleJoinPrivateRoom}
          roomCodeCreated={createdRoomCode}
          onCancelWaiting={handleCancelPrivateRoom}
        />

        {/* HỆ THỐNG CUSTOM TOAST (THÔNG BÁO) GHI ĐÈ LÊN MỌI THỨ */}
        {customAlert.show && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
            <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 shadow-2xl w-full animate-fade-in flex flex-col items-center text-center">
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
