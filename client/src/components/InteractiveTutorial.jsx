import { useEffect, useState } from "react";
import { playSFX } from "../utils/sound";

// Quán dùng cho Tutorial
const TUTORIAL_SHOPS = [
  { id: "cavien", name: "Xe Cá Viên", size: 2, icon: "/cavienchien.png" },
  { id: "trasua", name: "Xe Trà Sữa", size: 3, icon: "/trasua.png" },
];

// Vị trí cố định của Bot (18, 19) và (45, 53, 61)
const BOT_SHIPS_INDICES = [18, 19, 45, 53, 61];

export default function InteractiveTutorial({
  onComplete,
  soundEnabled,
  sfxVolume,
}) {
  const [phase, setPhase] = useState("WELCOME"); // WELCOME, SETUP, PLAYING, FINISHED
  const [guideText, setGuideText] = useState("");
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // --- STATES SETUP ---
  const [myBoard, setMyBoard] = useState(Array(64).fill(null));
  const [currentShopIdx, setCurrentShopIdx] = useState(0);
  const [rotation, setRotation] = useState(0); // 0: Ngang, 1: Dọc
  const [previewIndex, setPreviewIndex] = useState(null); // Cho phép chọn vị trí trước khi chốt

  // --- STATES PLAYING ---
  const [enemyBoard, setEnemyBoard] = useState(Array(64).fill(null));
  const [turn, setTurn] = useState("PLAYER"); // PLAYER, BOT
  const [playerScore, setPlayerScore] = useState(0);
  const [showExplosion, setShowExplosion] = useState(false);
  const [botShooting, setBotShooting] = useState(false);

  const boardSize = 8;

  // Lời chào ban đầu
  useEffect(() => {
    playSFX("success jingle.mp3", soundEnabled, sfxVolume);
    setGuideText(
      "Chào mừng đến Săn Quán Hẻm! Hãy hoàn thành ván đấu tập này để nắm trọn mọi bí quyết.",
    );
  }, []);

  const handleNextPhase = (nextPhase) => {
    playSFX("pop.mp3", soundEnabled, sfxVolume);
    setPhase(nextPhase);
    if (nextPhase === "SETUP") {
      setGuideText(
        "BƯỚC 1: XẾP QUÁN. Hãy nhấn chọn 1 ô trên lưới, thử nút XOAY, rồi nhấn XÁC NHẬN để đặt quán.",
      );
    } else if (nextPhase === "PLAYING") {
      playSFX("success jingle.mp3", soundEnabled, sfxVolume);
      setGuideText(
        "VÀO TRẬN! Đây là Sân Địch. Hãy ngắm và click vào 1 ô bất kỳ để nã đạn.",
      );
    }
  };

  // --- LOGIC XẾP QUÁN (CHUẨN NHƯ GAME THẬT) ---
  const handleRotate = () => {
    playSFX("pop.mp3", soundEnabled, sfxVolume);
    setRotation((prev) => (prev === 0 ? 1 : 0));
  };

  const handleReset = () => {
    playSFX("pop.mp3", soundEnabled, sfxVolume);
    setMyBoard(Array(64).fill(null));
    setCurrentShopIdx(0);
    setRotation(0);
    setPreviewIndex(null);
    setGuideText("Đã dọn dẹp sạch sẽ. Hãy xếp lại từ đầu nào!");
  };

  const getOccupiedIndices = (startIndex, size, rot) => {
    if (startIndex === null || startIndex < 0 || startIndex >= 64) return null;
    const indices = [];
    let r = Math.floor(startIndex / 8);
    let c = startIndex % 8;

    for (let i = 0; i < size; i++) {
      let tr = rot === 0 ? r : r + i;
      let tc = rot === 0 ? c + i : c;
      if (tr >= 8 || tc >= 8) return null; // Tràn viền
      let idx = tr * 8 + tc;
      if (
        myBoard[idx] !== null &&
        myBoard[idx].shopId !== TUTORIAL_SHOPS[currentShopIdx]?.id
      )
        return null; // Đè quán cũ
      indices.push(idx);
    }
    return indices;
  };

  const handleSetupCellClick = (index) => {
    if (phase !== "SETUP" || currentShopIdx >= TUTORIAL_SHOPS.length) return;
    playSFX("pop.mp3", soundEnabled, sfxVolume * 0.5);
    setPreviewIndex(index); // Chỉ preview, chưa chốt
  };

  const handleConfirmPlace = () => {
    if (previewIndex === null || currentShopIdx >= TUTORIAL_SHOPS.length)
      return;

    const shop = TUTORIAL_SHOPS[currentShopIdx];
    const indices = getOccupiedIndices(previewIndex, shop.size, rotation);

    if (!indices) {
      playSFX("waterdrop.mp3", soundEnabled, sfxVolume);
      setGuideText(
        "❌ Không đặt được! Quán đang bị tràn viền hoặc đè lên quán khác.",
      );
      return;
    }

    playSFX("pop.mp3", soundEnabled, sfxVolume);
    const newBoard = [...myBoard];
    indices.forEach((idx, i) => {
      newBoard[idx] = {
        shopId: shop.id,
        isHead: i === 0, // Đánh dấu ô gốc để render Icon dài ra
        icon: shop.icon,
        rot: rotation,
        size: shop.size,
      };
    });
    setMyBoard(newBoard);
    setCurrentShopIdx((prev) => prev + 1);
    setPreviewIndex(null);
    setRotation(0);

    if (currentShopIdx === 0) {
      setGuideText(
        "Ngon lành! Giờ hãy chọn vị trí cho Xe Trà Sữa (3 ô) rồi XÁC NHẬN nhé.",
      );
    } else {
      setGuideText(
        "Đội hình đã sẵn sàng! Bạn có thể ĐẶT LẠI, hoặc bấm SẴN SÀNG để khiêu chiến Bot.",
      );
    }
  };

  // Tính toán Preview để hiển thị màu xanh/đỏ lúc chọn
  const previewIndices =
    phase === "SETUP" &&
    previewIndex !== null &&
    currentShopIdx < TUTORIAL_SHOPS.length
      ? getOccupiedIndices(
          previewIndex,
          TUTORIAL_SHOPS[currentShopIdx].size,
          rotation,
        )
      : null;
  const isPreviewValid = previewIndices !== null;

  // --- LOGIC CHIẾN ĐẤU VỚI BOT ---
  const handlePlayerShoot = (index) => {
    if (
      phase !== "PLAYING" ||
      turn !== "PLAYER" ||
      enemyBoard[index] !== null ||
      botShooting
    )
      return;

    const isHit = BOT_SHIPS_INDICES.includes(index);
    const newEnemyBoard = [...enemyBoard];

    if (isHit) {
      playSFX("pop.mp3", soundEnabled, sfxVolume);
      newEnemyBoard[index] = "HIT";
      setEnemyBoard(newEnemyBoard);
      const newScore = playerScore + 1;
      setPlayerScore(newScore);

      if (newScore === 5) {
        setShowExplosion(true);
        setTimeout(() => {
          playSFX("success jingle.mp3", soundEnabled, sfxVolume);
          setPhase("FINISHED");
          setGuideText(
            "🏆 BẠN ĐÃ TIÊU DIỆT TOÀN BỘ QUÁN BOT! Khóa huấn luyện hoàn tất.",
          );
        }, 1200);
      } else {
        setGuideText(
          "💥 TRÚNG RỒI! Bắn trúng thì bạn ĐƯỢC BẮN TIẾP. Hãy truy cùng diệt tận nó!",
        );
      }
    } else {
      playSFX("waterdrop.mp3", soundEnabled, sfxVolume);
      newEnemyBoard[index] = "MISS";
      setEnemyBoard(newEnemyBoard);
      setTurn("BOT");
      setGuideText(
        "💦 Trượt rồi! Bạn MẤT LƯỢT. Camera sẽ tự động quay về Sân Nhà để chờ Bot bắn...",
      );
    }
  };

  // Bot Auto Shoot (Có Delay để cảm giác như thật)
  useEffect(() => {
    if (phase === "PLAYING" && turn === "BOT") {
      setBotShooting(true);
      const timer = setTimeout(() => {
        let availableIndices = [];
        myBoard.forEach((cell, idx) => {
          if (!cell?.shot) availableIndices.push(idx);
        });

        if (availableIndices.length === 0) return;
        const randomIdx =
          availableIndices[Math.floor(Math.random() * availableIndices.length)];

        const isHit = myBoard[randomIdx] !== null && myBoard[randomIdx].shopId;
        const newMyBoard = [...myBoard];

        if (isHit) {
          playSFX("pop.mp3", soundEnabled, sfxVolume);
          newMyBoard[randomIdx] = { ...newMyBoard[randomIdx], shot: "HIT" };
          setMyBoard(newMyBoard);
          setGuideText(
            "⚠️ BÁO ĐỘNG! Bot bắn TRÚNG quán của bạn. Nó được quyền bắn tiếp!",
          );
          // Bot tiếp tục lượt, không đổi turn
        } else {
          playSFX("waterdrop.mp3", soundEnabled, sfxVolume);
          if (newMyBoard[randomIdx] === null)
            newMyBoard[randomIdx] = { shot: "MISS" };
          else
            newMyBoard[randomIdx] = { ...newMyBoard[randomIdx], shot: "MISS" };
          setMyBoard(newMyBoard);
          setTurn("PLAYER");
          setBotShooting(false);
          setGuideText(
            "🛡️ Bot bắn HỤT rồi! Camera quay lại Sân Địch. Tới lượt bạn trả thù!",
          );
        }
      }, 2500); // Đợi 2.5s Bot mới bắn cho chân thực
      return () => clearTimeout(timer);
    }
  }, [turn, phase, myBoard]);

  // --- RENDER GRID (CHUẨN 100% GAME THẬT) ---
  const renderGrid = (board, isEnemyBoard = false, isMinimap = false) => {
    return (
      <div
        className="absolute inset-0 grid gap-px w-full h-full p-[8.5%]"
        style={{ gridTemplateColumns: `repeat(8, minmax(0, 1fr))` }}
      >
        {board.map((cell, i) => {
          // Logic Preview Xếp Quán
          const isPreviewHere =
            phase === "SETUP" &&
            !isEnemyBoard &&
            previewIndices &&
            previewIndices.includes(i);
          const isPreviewHead =
            phase === "SETUP" && !isEnemyBoard && previewIndex === i;

          // CSS Icon vươn dài ra nhiều ô chính xác (calc 100% * size + gap)
          const getShopStyle = (size, rot) => {
            if (rot === 0)
              return {
                width: `calc(${size * 100}% + ${size - 1}px)`,
                height: "100%",
                left: 0,
                top: 0,
              };
            if (rot === 1)
              return {
                width: "100%",
                height: `calc(${size * 100}% + ${size - 1}px)`,
                left: 0,
                top: 0,
              };
            return { width: "100%", height: "100%" };
          };

          return (
            <div
              key={i}
              onClick={() => {
                if (isMinimap) return;
                isEnemyBoard ? handlePlayerShoot(i) : handleSetupCellClick(i);
              }}
              className={`relative w-full h-full border border-white/10 rounded-sm transition-all flex items-center justify-center overflow-visible
                ${isEnemyBoard && turn === "PLAYER" && cell === null && !isMinimap ? "hover:bg-amber-400/20 cursor-crosshair active:bg-amber-400/30" : ""}
                ${!isEnemyBoard && phase === "SETUP" && cell === null ? "hover:bg-emerald-500/20 cursor-pointer" : ""}
                ${isPreviewHere && isPreviewValid ? "bg-emerald-500/50 border-2 border-emerald-300 animate-pulse z-20" : ""}
                ${isPreviewHere && !isPreviewValid ? "bg-rose-500/50 border-2 border-rose-300 z-20" : ""}
                ${!isEnemyBoard && cell?.shopId ? "outline-solid outline-2 -outline-offset-2 outline-amber-400" : "bg-slate-800/80"}
              `}
            >
              {/* Sân Nhà: Render Icon Quán Thật */}
              {!isEnemyBoard && cell?.isHead && (
                <img
                  src={cell.icon}
                  style={getShopStyle(cell.size, cell.rot)}
                  className="absolute z-10 object-contain drop-shadow-md pointer-events-none p-1"
                />
              )}

              {/* Sân Nhà: Render Icon Preview */}
              {isPreviewHead &&
                isPreviewValid &&
                currentShopIdx < TUTORIAL_SHOPS.length && (
                  <img
                    src={TUTORIAL_SHOPS[currentShopIdx].icon}
                    style={getShopStyle(
                      TUTORIAL_SHOPS[currentShopIdx].size,
                      rotation,
                    )}
                    className="absolute z-20 object-contain opacity-70 animate-pulse pointer-events-none p-1"
                  />
                )}

              {/* Kính ngắm đỏ (Kẻ địch đang bắn vào Sân Nhà) */}
              {!isEnemyBoard &&
                turn === "BOT" &&
                !isMinimap &&
                botShooting &&
                cell?.shot === undefined &&
                i === 15 /* Cố tình báo động giả ở ô 15 */ && (
                  <img
                    src="/vitri.png"
                    className="absolute inset-0 w-[120%] h-[120%] left-[-10%] top-[-10%] max-w-none object-contain z-30 animate-ping opacity-90 drop-shadow-[0_0_8px_red]"
                  />
                )}

              {/* Đạn Trượt (MISS) */}
              {cell?.shot === "MISS" && (
                <img
                  src="/khongtrung.png"
                  className={`absolute inset-0 object-contain opacity-80 z-20 pointer-events-none ${isMinimap ? "w-[70%] h-[70%] m-auto" : "w-[90%] h-[90%] m-auto"}`}
                />
              )}
              {isEnemyBoard && cell === "MISS" && (
                <img
                  src="/khongtrung.png"
                  className={`absolute inset-0 object-contain opacity-80 z-20 pointer-events-none ${isMinimap ? "w-[70%] h-[70%] m-auto" : "w-[90%] h-[90%] m-auto"}`}
                />
              )}

              {/* Đạn Trúng (HIT) */}
              {cell?.shot === "HIT" && (
                <img
                  src="/trung.png"
                  className={`absolute inset-0 object-contain z-30 pointer-events-none ${isMinimap ? "w-full h-full" : "w-[120%] h-[120%] animate-bounce"}`}
                />
              )}
              {isEnemyBoard && cell === "HIT" && (
                <img
                  src="/trung.png"
                  className={`absolute inset-0 object-contain z-30 pointer-events-none ${isMinimap ? "w-full h-full" : "w-[120%] h-[120%] animate-bounce"}`}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // --- XÁC ĐỊNH CAMERA MAIN BOARD VS MINIMAP ---
  const isAttackingPhase = turn === "PLAYER"; // Nếu lượt Player thì Main Board = Sân Địch

  return (
    <div className="absolute inset-0 z-[110] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-fade-in select-none overflow-hidden">
      {/* Nút Bỏ qua */}
      <button
        onClick={() => {
          playSFX("pop.mp3", soundEnabled, sfxVolume);
          setShowSkipConfirm(true);
        }}
        className="absolute top-4 right-4 z-[120] bg-slate-800/80 border border-slate-600 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs hover:bg-slate-700 hover:text-white active:scale-95 transition backdrop-blur-md"
      >
        Bỏ qua ⏭️
      </button>

      <div className="w-full max-w-4xl flex flex-col items-center gap-6 relative">
        {/* --- KHUNG HỘI THOẠI TRỢ LÝ --- */}
        <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-4 w-full max-w-2xl shadow-[0_0_30px_rgba(245,158,11,0.15)] flex flex-col items-center text-center z-30 transition-all duration-300">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl animate-bounce">👩‍🏫</span>
            <h3 className="text-amber-400 font-black uppercase tracking-wider text-sm">
              Hệ Thống Huấn Luyện
            </h3>
          </div>
          <p className="text-slate-200 text-sm font-medium leading-relaxed min-h-[40px]">
            {guideText}
          </p>
        </div>

        {/* --- MÀN HÌNH WELCOME & FINISHED --- */}
        {(phase === "WELCOME" || phase === "FINISHED") && (
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md text-center animate-pop-in shadow-2xl mt-4">
            <div className="text-6xl mb-4 drop-shadow-lg">
              {phase === "WELCOME" ? "🎓" : "🏆"}
            </div>

            {phase === "FINISHED" && (
              <div className="text-left bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6 space-y-3">
                <p className="text-sm">
                  <b className="text-emerald-400">✅ Đổi Camera Tự Động:</b> Tới
                  lượt ai bắn, sân đối phương sẽ phóng to.
                </p>
                <p className="text-sm">
                  <b className="text-amber-400">🎯 Bắn trúng bắn tiếp:</b> Đây
                  là chìa khóa lật kèo.
                </p>
                <p className="text-sm">
                  <b className="text-rose-400">⏱️ Luật 25 giây:</b> Quá giờ, hệ
                  thống tự thả bom bừa bãi!
                </p>
              </div>
            )}

            <button
              onClick={
                phase === "WELCOME"
                  ? () => handleNextPhase("SETUP")
                  : onComplete
              }
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-white font-black py-3.5 rounded-xl uppercase tracking-wider active:scale-95 transition shadow-lg animate-pulse"
            >
              {phase === "WELCOME" ? "Vào Thực Chiến 🚀" : "VỀ SẢNH CHỜ"}
            </button>
          </div>
        )}

        {/* --- MÀN HÌNH SETUP (XẾP QUÁN) --- */}
        {phase === "SETUP" && (
          <div className="flex flex-col md:flex-row gap-6 w-full animate-fade-in items-center justify-center">
            {/* Bảng Controls Chuẩn UX */}
            <div className="w-full md:w-64 bg-slate-900 border border-slate-700 p-4 rounded-2xl flex flex-col gap-4">
              <div className="text-xs font-black text-slate-400 uppercase text-center">
                Đang xếp:{" "}
                {currentShopIdx < 2
                  ? TUTORIAL_SHOPS[currentShopIdx].name
                  : "XONG"}
              </div>

              {/* Box Preview Quán trong Kho (Hình tự xoay) */}
              <div className="h-20 mx-auto flex items-center justify-center bg-slate-950 border-2 border-slate-800 rounded-xl p-2 w-full shadow-inner">
                {currentShopIdx < 2 ? (
                  <img
                    src={TUTORIAL_SHOPS[currentShopIdx].icon}
                    className="object-contain drop-shadow-md transition-transform duration-300"
                    style={{
                      transform: rotation === 1 ? "rotate(90deg)" : "none",
                      height: "80%",
                      width: "80%",
                    }}
                  />
                ) : (
                  <span className="text-emerald-400 font-black">
                    ✔️ ĐÃ XẾP ĐỦ
                  </span>
                )}
              </div>

              <div className="flex gap-2 justify-center">
                <button
                  onClick={handleRotate}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 active:scale-95 font-black text-xs py-2.5 rounded-xl shadow transition text-white"
                >
                  🔄 XOAY ({rotation === 0 ? "Ngang" : "Dọc"})
                </button>
                <button
                  onClick={handleReset}
                  className="w-12 bg-slate-800 hover:bg-slate-700 active:scale-95 font-black text-sm rounded-xl transition text-white"
                  title="Đặt lại toàn bộ"
                >
                  ↩️
                </button>
              </div>

              {/* Nút Xác Nhận Đặt Từng Quán */}
              {currentShopIdx < 2 ? (
                <button
                  onClick={handleConfirmPlace}
                  disabled={!isPreviewValid}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 disabled:opacity-40 text-slate-950 font-black py-3 rounded-xl text-xs uppercase transition shadow-lg active:scale-95"
                >
                  📌 XÁC NHẬN ĐẶT
                </button>
              ) : (
                <button
                  onClick={() => handleNextPhase("PLAYING")}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl text-xs uppercase transition shadow-lg animate-pulse active:scale-95"
                >
                  🚀 SẴN SÀNG!
                </button>
              )}
            </div>

            {/* Sân Nhà */}
            <div className="relative w-full max-w-[320px] md:max-w-[400px] aspect-square bg-slate-900 rounded-2xl p-1 border-2 border-slate-700 shadow-2xl">
              <div className="absolute -top-7 left-0 right-0 text-center font-black text-xs text-emerald-400 uppercase drop-shadow">
                🏠 Sân Nhà Của Bạn
              </div>
              <img
                src="/bg8x8.png"
                className="absolute inset-0 w-full h-full object-fill rounded-xl pointer-events-none"
              />
              {renderGrid(myBoard, false, false)}
            </div>
          </div>
        )}

        {/* --- MÀN HÌNH PLAYING (ĐỔI CAMERA THÔNG MINH) --- */}
        {phase === "PLAYING" && (
          <div className="flex flex-col md:flex-row gap-6 w-full animate-fade-in items-center justify-center mt-4">
            {/* MAIN BOARD (Chiếm Giữa) */}
            <div
              className={`relative w-full max-w-[320px] md:max-w-[400px] aspect-square bg-slate-900 rounded-2xl p-1 border-2 shadow-2xl transition-all duration-500 ${isAttackingPhase ? "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]" : "border-rose-500 shadow-[0_0_20px_rgba(225,29,72,0.3)]"} ${showExplosion ? "animate-shake" : ""}`}
            >
              <div className="absolute -top-7 left-0 right-0 flex justify-center z-40">
                <span
                  className={`px-4 py-1 rounded-full font-black text-xs uppercase border-2 bg-slate-950 ${isAttackingPhase ? "text-amber-400 border-amber-500 animate-pulse" : "text-rose-400 border-rose-500"}`}
                >
                  {isAttackingPhase
                    ? "🎯 ĐỊCH (BẠN ĐANG NGẮM)"
                    : "🏠 NHÀ (ĐỊCH ĐANG BẮN)"}
                </span>
              </div>
              <img
                src="/bg8x8.png"
                className="absolute inset-0 w-full h-full object-fill rounded-xl pointer-events-none"
              />

              {/* Tùy thuộc lượt mà hiển thị Board nào ở giữa */}
              {isAttackingPhase
                ? renderGrid(enemyBoard, true, false)
                : renderGrid(myBoard, false, false)}

              {/* Hiệu ứng Nổ */}
              {showExplosion && (
                <div className="absolute inset-0 z-50 flex items-center justify-center mix-blend-screen pointer-events-none">
                  <img
                    src="/explosion.gif"
                    className="w-[180%] h-[180%] object-cover opacity-90"
                  />
                </div>
              )}
            </div>

            {/* MINIMAP (Thu nhỏ góc phải) */}
            <div className="absolute top-14 right-2 md:top-6 md:right-6 w-24 md:w-32 aspect-square bg-slate-900 rounded-xl p-0.5 border-2 border-slate-600 shadow-2xl opacity-80 hover:scale-[1.8] origin-top-right transition-transform duration-300 z-40 group hidden md:block">
              <div
                className={`absolute -top-5 left-0 right-0 text-center font-black text-[9px] uppercase drop-shadow ${!isAttackingPhase ? "text-rose-400" : "text-emerald-400"}`}
              >
                {!isAttackingPhase ? "🎯 Sân Địch" : "🏠 Sân Nhà"}
              </div>
              <img
                src="/bg8x8.png"
                className="absolute inset-0 w-full h-full object-fill rounded-lg pointer-events-none"
              />
              {!isAttackingPhase
                ? renderGrid(enemyBoard, true, true)
                : renderGrid(myBoard, false, true)}
            </div>
          </div>
        )}
      </div>

      {/* MODAL XÁC NHẬN BỎ QUA */}
      {showSkipConfirm && (
        <div className="absolute inset-0 z-[130] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 text-center shadow-2xl">
            <h3 className="text-xl font-black text-amber-400 mb-2 uppercase">
              Chắc chắn bỏ qua?
            </h3>
            <p className="text-sm text-slate-300 mb-6 font-medium">
              Bỏ qua lúc này sẽ khiến bạn không biết cách xoay quán và cách
              camera hoạt động khi bị nã đạn đấy!
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={onComplete}
                className="w-full bg-amber-500 hover:bg-yellow-400 text-slate-950 font-black py-3 rounded-xl text-xs uppercase tracking-wider active:scale-95 transition shadow"
              >
                Bỏ qua luôn
              </button>
              <button
                onClick={() => setShowSkipConfirm(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider active:scale-95 transition shadow border border-slate-600"
              >
                Quay lại tập tiếp
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0) translateY(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px) translateY(3px) rotate(-1deg); }
          20%, 40%, 60%, 80% { transform: translateX(5px) translateY(-3px) rotate(1deg); }
        }
        .animate-shake { animation: shake 0.8s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>
    </div>
  );
}
