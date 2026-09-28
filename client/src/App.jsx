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

// Kết nối Socket.IO tới Server Production
const socket = io("https://san-quan-hem-backend.onrender.com", {
  autoConnect: false,
});

export default function App() {
  // --- STATES TÀI KHOẢN ---
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // --- STATES CÀI ĐẶT GAME ---
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [bgmVolume, setBgmVolume] = useState(0.4); // 40%
  const [sfxVolume, setSfxVolume] = useState(0.8); // 80%
  const [showTaunt, setShowTaunt] = useState(true);
  const [vibrate, setVibrate] = useState(true);

  const soundRef = useRef({ soundEnabled, sfxVolume });
  useEffect(() => {
    soundRef.current = { soundEnabled, sfxVolume };
  }, [soundEnabled, sfxVolume]);

  // --- STATES QUẢN LÝ GAME ---
  const [appLoading, setAppLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const [gameState, setGameState] = useState("LOBBY"); // LOBBY | SETUP | PLAYING | FINISHED
  const [playerName, setPlayerName] = useState("");
  const [team, setTeam] = useState("red");
  const [roomId, setRoomId] = useState(null);

  // Lưu danh sách 3 Quán ngẫu nhiên từ Server (Map Rotation)
  const [activeShops, setActiveShops] = useState(SHOPS);

  // Management State cho Setup & Bàn cờ
  const [selectedShop, setSelectedShop] = useState(SHOPS[0]?.id || "cavien");
  const [orientation, setOrientation] = useState("HORIZONTAL");
  const [previewIndex, setPreviewIndex] = useState(null);
  const [myBoard, setMyBoard] = useState(Array(64).fill(null));
  const [opponentHits, setOpponentHits] = useState(Array(64).fill(null));

  // Turn & Shot status
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [coinFlipResult, setCoinFlipResult] = useState(null);
  const [recentShot, setRecentShot] = useState(null);
  const [winner, setWinner] = useState(null);

  // Đếm ngược 20 giây cho mỗi lượt
  const [turnTimeLeft, setTurnTimeLeft] = useState(20);

  // Chat & Modals state
  const [messages, setMessages] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);

  // State Phòng Kín (Mã Hẻm)
  const [showPrivateModal, setShowPrivateModal] = useState(false);
  const [createdRoomCode, setCreatedRoomCode] = useState(null);

  // Khôi phục tài khoản đã đăng nhập
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

  // Rung Haptic khi bị bắn
  useEffect(() => {
    if (vibrate && recentShot && window.navigator.vibrate) {
      window.navigator.vibrate([100, 50, 100]);
    }
  }, [recentShot, vibrate]);

  // Quản lý Nhạc Nền (BGM)
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

  // Turn Timer 5s sound
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setCurrentUser(null);
  };

  const autoFireRandomShot = () => {
    if (!isMyTurn || gameState !== "PLAYING" || recentShot !== null) return;
    const availableIndices = opponentHits
      .map((status, idx) => (status === null ? idx : null))
      .filter((idx) => idx !== null);

    if (availableIndices.length > 0) {
      const randomIndex =
        availableIndices[Math.floor(Math.random() * availableIndices.length)];
      socket.emit("fire_shot", { roomId, targetIndex: randomIndex });
    }
  };

  useEffect(() => {
    let timer = null;
    if (gameState === "PLAYING" && turnTimeLeft > 0) {
      timer = setInterval(() => {
        setTurnTimeLeft((prev) => {
          if (prev <= 1) {
            if (isMyTurn) autoFireRandomShot();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState, turnTimeLeft, isMyTurn, opponentHits, recentShot]);

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
    setTurnTimeLeft(20);
  };

  // --- SOCKET LISTENERS ---
  useEffect(() => {
    socket.connect();

    socket.on("match_found", (data) => {
      // Sắp xếp thứ tự từ nhỏ đến lớn (2 ô -> 3 ô -> 4 ô)
      const roomShops = (data.shops || SHOPS).sort((a, b) => a.size - b.size);
      setActiveShops(roomShops);
      resetGameData(roomShops);

      setRoomId(data.roomId);
      setTeam(data.team);
      setGameState("SETUP");
      setSearching(false);
      setShowPrivateModal(false);
      setCreatedRoomCode(null);
      setMessages((prev) => [
        ...prev,
        { sender: "Hệ thống", text: data.message },
      ]);
    });

    socket.on("waiting_for_opponent", (msg) => {
      setMessages((prev) => [...prev, { sender: "Hệ thống", text: msg }]);
    });

    socket.on("private_room_created", (data) => {
      setCreatedRoomCode(data.roomCode);
      setRoomId(data.roomId);
    });

    socket.on("join_private_error", (msg) => {
      alert(msg);
    });

    socket.on("start_coin_flip", (data) => {
      const { soundEnabled: sEnabled, sfxVolume: sVol } = soundRef.current;
      playSFX("coin-flip.mp3", sEnabled, sVol);
      const first = data.firstTurnId === socket.id;
      setCoinFlipResult(first ? "FIRST" : "SECOND");
      setIsMyTurn(first);
      setTurnTimeLeft(20);
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
        setTurnTimeLeft(20);
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

    socket.on("rematch_accepted", (data) => {
      resetGameData(activeShops);
      setGameState("SETUP");
      setMessages((prev) => [
        ...prev,
        { sender: "Hệ thống", text: data.message },
      ]);
    });

    socket.on("opponent_left", (data) => {
      alert(data);
      setGameState("LOBBY");
      setRoomId(null);
      setSearching(false);
      setShowPrivateModal(false);
      setCreatedRoomCode(null);
    });

    return () => {
      socket.off("match_found");
      socket.off("waiting_for_opponent");
      socket.off("private_room_created");
      socket.off("join_private_error");
      socket.off("start_coin_flip");
      socket.off("shot_result");
      socket.off("receive_chat");
      socket.off("game_over");
      socket.off("rematch_accepted");
      socket.off("opponent_left");
      socket.disconnect();
    };
  }, [activeShops]);

  // --- HANDLERS TÌM TRẬN & PHÒNG KÍN ---
  const handleFindMatch = (name) => {
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
    setPlayerName(name);
    setSearching(true);
    socket.emit("tim_doi_thu", { name, userId: currentUser?.id });
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
      userId: currentUser?.id,
    });
  };

  const handleJoinPrivateRoom = (code) => {
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
    socket.emit("join_private_room", {
      roomCode: code,
      name: currentUser?.displayName || playerName || "Phượt Thủ Hẻm",
      userId: currentUser?.id,
    });
  };

  const handleCancelPrivateRoom = () => {
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
    setCreatedRoomCode(null);
    setShowPrivateModal(false);
    socket.emit("cancel_search");
  };

  // --- GAMEPLAY HANDLERS ---
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

      // 💥 FIX LỖI PREVIEW MỜ: Reset preview về null ngay sau khi đặt thành công
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
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
    socket.emit("ready_place_shops", { roomId, playerBoard: myBoard });
    setMessages((prev) => [
      ...prev,
      { sender: "Hệ thống", text: "Đã chốt sơ đồ! Đang chờ đối thủ..." },
    ]);
  };

  const handleFireShot = (targetIndex) => {
    if (!isMyTurn || gameState !== "PLAYING" || recentShot !== null) return;
    if (opponentHits[targetIndex] !== null) return;

    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.5);
    socket.emit("fire_shot", { roomId, targetIndex });
  };

  const handleSendChat = (text) => {
    socket.emit("send_chat", { roomId, text });
  };

  const handleRematch = () => {
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
    socket.emit("request_rematch", { roomId });
  };

  const handleLeaveRoom = () => {
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.6);
    setGameState("LOBBY");
    setRoomId(null);
    setSearching(false);
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

  // --- RENDER ---
  if (appLoading)
    return <LoadingScreen onFinish={() => setAppLoading(false)} />;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-2 select-none font-sans">
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
                  shops={activeShops} // TRUYỀN DANH SÁCH QUÁN XUỐNG BÀN CỜ ĐỂ FIX LỖI PREVIEW 4 Ô
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

        {/* --- DÙNG CHUNG CÁC MODALS OVERLAY --- */}
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
      </div>
    </div>
  );
}
