import { useEffect, useState } from "react";
import { playSFX } from "../utils/sound";

// Quán dùng cho Tutorial (Chỉ 2 quán cho nhanh gọn)
const TUTORIAL_SHOPS = [
  { id: "cavien", name: "Xe Cá Viên", size: 2, icon: "/cavienchien.png" },
  { id: "trasua", name: "Xe Trà Sữa", size: 3, icon: "/trasua.png" },
];

// Vị trí quán của Bot (Fix cứng để dễ biểu diễn)
// Cá Viên: 18, 19 | Trà Sữa: 45, 53, 61
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

  // --- STATES PLAYING ---
  const [enemyBoard, setEnemyBoard] = useState(Array(64).fill(null));
  const [turn, setTurn] = useState("PLAYER"); // PLAYER, BOT
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [showExplosion, setShowExplosion] = useState(false);

  // Khởi tạo Lời chào
  useEffect(() => {
    playSFX("success jingle.mp3", soundEnabled, sfxVolume);
    setGuideText(
      "Chào mừng đến Săn Quán Hẻm! Hãy chơi thử 1 ván siêu tốc với Bot để nắm rõ mọi luật chơi nhé.",
    );
  }, []);

  const handleNextPhase = (nextPhase) => {
    playSFX("pop.mp3", soundEnabled, sfxVolume);
    setPhase(nextPhase);
    if (nextPhase === "SETUP") {
      setGuideText(
        "BƯỚC 1: XẾP QUÁN. Hãy nhấn nút XOAY nếu muốn, rồi chọn 1 ô trên Sân Nhà để đặt Xe Cá Viên (2 ô).",
      );
    } else if (nextPhase === "PLAYING") {
      playSFX("success jingle.mp3", soundEnabled, sfxVolume);
      setGuideText(
        "VÀO TRẬN! Đây là Sân Địch. Hãy ngắm và click vào 1 ô lưới bất kỳ để bắn.",
      );
    }
  };

  // --- LOGIC XẾP QUÁN ---
  const handleRotate = () => {
    playSFX("pop.mp3", soundEnabled, sfxVolume);
    setRotation((prev) => (prev === 0 ? 1 : 0));
  };

  const handleReset = () => {
    playSFX("pop.mp3", soundEnabled, sfxVolume);
    setMyBoard(Array(64).fill(null));
    setCurrentShopIdx(0);
    setRotation(0);
    setGuideText("Đã dọn dẹp. Hãy xếp lại Xe Cá Viên nào!");
  };

  const checkValidPlacement = (startIndex, size, rot) => {
    const indices = [];
    let r = Math.floor(startIndex / 8);
    let c = startIndex % 8;

    for (let i = 0; i < size; i++) {
      let tr = rot === 0 ? r : r + i;
      let tc = rot === 0 ? c + i : c;
      if (tr >= 8 || tc >= 8) return null; // Tràn viền
      let idx = tr * 8 + tc;
      if (myBoard[idx] !== null) return null; // Đè quán cũ
      indices.push(idx);
    }
    return indices;
  };

  const handlePlaceShop = (index) => {
    if (phase !== "SETUP" || currentShopIdx >= TUTORIAL_SHOPS.length) return;

    const shop = TUTORIAL_SHOPS[currentShopIdx];
    const indices = checkValidPlacement(index, shop.size, rotation);

    if (!indices) {
      playSFX("waterdrop.mp3", soundEnabled, sfxVolume);
      setGuideText(
        "❌ Không đặt được ở đây! Quán bị tràn ra ngoài hoặc đè lên nhau rồi.",
      );
      return;
    }

    playSFX("pop.mp3", soundEnabled, sfxVolume);
    const newBoard = [...myBoard];
    indices.forEach((idx, i) => {
      newBoard[idx] = {
        shopId: shop.id,
        isHead: i === 0, // Đánh dấu ô đầu tiên để render icon
        icon: shop.icon,
        rot: rotation,
        size: shop.size,
      };
    });
    setMyBoard(newBoard);
    setCurrentShopIdx((prev) => prev + 1);

    if (currentShopIdx === 0) {
      setGuideText(
        "Tốt lắm! 💡 Mẹo: Đừng xếp các quán dính chùm vào nhau. Giờ hãy đặt tiếp Xe Trà Sữa (3 ô).",
      );
    } else {
      setGuideText(
        "Đội hình đã sẵn sàng! Bạn có thể 'Đặt Lại' nếu muốn, hoặc bấm SẴN SÀNG để khiêu chiến Bot.",
      );
    }
  };

  // --- LOGIC CHIẾN ĐẤU VỚI BOT ---
  const handlePlayerShoot = (index) => {
    if (phase !== "PLAYING" || turn !== "PLAYER" || enemyBoard[index] !== null)
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
        // Bot có 5 ô tổng cộng
        setShowExplosion(true);
        setTimeout(() => {
          playSFX("success jingle.mp3", soundEnabled, sfxVolume);
          setPhase("FINISHED");
          setGuideText(
            "🏆 BẠN ĐÃ TIÊU DIỆT TOÀN BỘ QUÁN CỦA BOT! Chúc mừng bạn tốt nghiệp.",
          );
        }, 1200);
      } else {
        setGuideText(
          "💥 TRÚNG RỒI! Khi bắn trúng, bạn ĐƯỢC BẮN TIẾP. Hãy truy cùng diệt tận nó!",
        );
      }
    } else {
      playSFX("waterdrop.mp3", soundEnabled, sfxVolume);
      newEnemyBoard[index] = "MISS";
      setEnemyBoard(newEnemyBoard);
      setTurn("BOT");
      setGuideText(
        "💦 Trượt rồi! Nước bắn vào hẻm trống. Bạn MẤT LƯỢT. Chờ Bot bắn...",
      );
    }
  };

  // Bot Auto Shoot
  useEffect(() => {
    if (phase === "PLAYING" && turn === "BOT") {
      const timer = setTimeout(() => {
        // Tìm ô chưa bắn
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
          setBotScore((prev) => prev + 1);
          setGuideText(
            "⚠️ BÁO ĐỘNG! Bot bắn trúng quán của bạn. Nó được quyền bắn tiếp!",
          );
          // Bot tiếp tục lượt
        } else {
          playSFX("waterdrop.mp3", soundEnabled, sfxVolume);
          if (newMyBoard[randomIdx] === null)
            newMyBoard[randomIdx] = { shot: "MISS" };
          else
            newMyBoard[randomIdx] = { ...newMyBoard[randomIdx], shot: "MISS" };
          setMyBoard(newMyBoard);
          setTurn("PLAYER");
          setGuideText(
            "🛡️ Bot bắn hụt rồi! Tới lượt bạn. Nhớ rằng mỗi lượt chỉ có 25s thôi nhé.",
          );
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [turn, phase, myBoard]);

  // --- RENDER BÀN CỜ CHUẨN UI ---
  const renderGrid = (board, isEnemy = false) => (
    <div
      className="absolute inset-0 grid gap-px w-full h-full p-[8.5%]"
      style={{ gridTemplateColumns: `repeat(8, minmax(0, 1fr))` }}
    >
      {board.map((cell, i) => {
        // CSS Icon vươn dài ra đúng ô
        const getShopStyle = (size, rot) => {
          if (size === 2 && rot === 0) return "w-[195%] h-[90%] left-[2.5%]";
          if (size === 2 && rot === 1) return "w-[90%] h-[195%] top-[2.5%]";
          if (size === 3 && rot === 0) return "w-[295%] h-[90%] left-[2.5%]";
          if (size === 3 && rot === 1) return "w-[90%] h-[295%] top-[2.5%]";
          return "w-[90%] h-[90%]";
        };

        return (
          <div
            key={i}
            onClick={() =>
              isEnemy ? handlePlayerShoot(i) : handlePlaceShop(i)
            }
            className={`relative w-full h-full border border-white/10 rounded-sm transition-all flex items-center justify-center overflow-visible
              ${isEnemy && turn === "PLAYER" && cell === null ? "hover:bg-rose-500/30 cursor-crosshair" : ""}
              ${!isEnemy && phase === "SETUP" && currentShopIdx < 2 ? "hover:bg-emerald-500/30 cursor-pointer" : ""}
              ${!isEnemy && cell?.shopId ? "bg-emerald-900/40 outline-solid outline-2 -outline-offset-2 outline-emerald-400" : "bg-slate-800/80"}
            `}
          >
            {/* Sân Nhà: Render Icon Quán */}
            {!isEnemy && cell?.isHead && (
              <img
                src={cell.icon}
                className={`absolute z-10 object-contain drop-shadow-md pointer-events-none ${getShopStyle(cell.size, cell.rot)}`}
              />
            )}

            {/* Sân Nhà: Bị Bot Bắn */}
            {!isEnemy && cell?.shot === "MISS" && (
              <img
                src="/khongtrung.png"
                className="absolute inset-0 w-[80%] h-[80%] m-auto object-contain opacity-80 z-20 pointer-events-none"
              />
            )}
            {!isEnemy && cell?.shot === "HIT" && (
              <img
                src="/trung.png"
                className="absolute inset-0 w-[120%] h-[120%] m-auto object-contain z-30 pointer-events-none animate-bounce"
              />
            )}

            {/* Sân Địch: Mình Bắn */}
            {isEnemy && cell === "MISS" && (
              <img
                src="/khongtrung.png"
                className="absolute inset-0 w-[80%] h-[80%] m-auto object-contain opacity-80 z-20 pointer-events-none"
              />
            )}
            {isEnemy && cell === "HIT" && (
              <img
                src="/trung.png"
                className="absolute inset-0 w-[120%] h-[120%] m-auto object-contain z-30 pointer-events-none animate-bounce"
              />
            )}
          </div>
        );
      })}
    </div>
  );

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

      <div className="w-full max-w-2xl flex flex-col items-center gap-6 relative">
        {/* --- KHUNG HỘI THOẠI TRỢ LÝ --- */}
        <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-4 w-full max-w-lg shadow-[0_0_30px_rgba(245,158,11,0.15)] flex flex-col items-center text-center z-30 transition-all duration-300">
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
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-lg text-center animate-pop-in shadow-2xl mt-4">
            <div className="text-6xl mb-4 drop-shadow-lg">
              {phase === "WELCOME" ? "🎓" : "🏆"}
            </div>

            {phase === "FINISHED" && (
              <div className="text-left bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6 space-y-3">
                <p className="text-sm">
                  <b className="text-emerald-400">✅ Mẹo giấu quán:</b> Rải rác
                  sát góc, đổi hướng linh hoạt.
                </p>
                <p className="text-sm">
                  <b className="text-amber-400">🎯 Bắn trúng bắn tiếp:</b> Tận
                  dụng rà quét hình dáng quán địch.
                </p>
                <p className="text-sm">
                  <b className="text-rose-400">⏱️ Luật 25 giây:</b> Quá giờ, hệ
                  thống tự thả bom bừa bãi!
                </p>
                <p className="text-sm">
                  <b className="text-blue-400">🤝 Chế độ 2v2:</b> Bạn và đồng
                  đội chung 1 bàn cờ 12x12 siêu to.
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
              {phase === "WELCOME"
                ? "Vào Thực Chiến 🚀"
                : "HOÀN TẤT HUẤN LUYỆN"}
            </button>
          </div>
        )}

        {/* --- MÀN HÌNH SETUP (XẾP QUÁN) --- */}
        {phase === "SETUP" && (
          <div className="flex flex-col md:flex-row gap-6 w-full animate-fade-in items-center justify-center">
            {/* Bảng Controls */}
            <div className="w-full md:w-56 bg-slate-900 border border-slate-700 p-4 rounded-2xl flex flex-col gap-4 order-2 md:order-1">
              <div className="text-xs font-black text-slate-400 uppercase text-center">
                Đang xếp:{" "}
                {currentShopIdx < 2
                  ? TUTORIAL_SHOPS[currentShopIdx].name
                  : "Xong"}
              </div>
              <div className="h-16 mx-auto flex items-center justify-center bg-amber-500/10 border-2 border-amber-400/50 rounded-xl p-2 w-full">
                {currentShopIdx < 2 ? (
                  <img
                    src={TUTORIAL_SHOPS[currentShopIdx].icon}
                    className="h-full object-contain drop-shadow-md animate-pulse"
                  />
                ) : (
                  "✔️ Đã xếp đủ"
                )}
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={handleRotate}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 font-black text-xs py-2.5 rounded-xl shadow transition text-white"
                >
                  🔄 XOAY ({rotation === 0 ? "Ngang" : "Dọc"})
                </button>
                <button
                  onClick={handleReset}
                  className="w-12 bg-slate-800 hover:bg-slate-700 font-black text-sm rounded-xl transition text-white"
                >
                  ↩️
                </button>
              </div>
              <button
                onClick={() => handleNextPhase("PLAYING")}
                disabled={currentShopIdx < 2}
                className={`w-full font-black py-3.5 rounded-xl text-xs uppercase transition shadow-lg ${currentShopIdx === 2 ? "bg-emerald-500 text-slate-950 animate-pulse" : "bg-slate-800 text-slate-500 opacity-50"}`}
              >
                🚀 SẴN SÀNG!
              </button>
            </div>

            {/* Sân Nhà */}
            <div className="relative w-full max-w-[300px] md:max-w-[350px] aspect-square bg-slate-900 rounded-2xl p-1 border-2 border-slate-700 shadow-2xl order-1 md:order-2">
              <div className="absolute -top-7 left-0 right-0 text-center font-black text-xs text-emerald-400 uppercase drop-shadow">
                🏠 Sân Nhà Của Bạn
              </div>
              <img
                src="/bg8x8.png"
                className="absolute inset-0 w-full h-full object-fill rounded-xl pointer-events-none"
              />
              {renderGrid(myBoard, false)}
            </div>
          </div>
        )}

        {/* --- MÀN HÌNH PLAYING (CHIẾN ĐẤU VỚI BOT) --- */}
        {phase === "PLAYING" && (
          <div className="flex flex-col md:flex-row gap-6 w-full animate-fade-in items-center justify-center mt-4">
            {/* Sân Nhà Thu Nhỏ (Giống Minimap) */}
            <div className="relative w-32 md:w-48 aspect-square bg-slate-900 rounded-xl p-0.5 border-2 border-slate-700 shadow-xl opacity-80 order-2 md:order-1">
              <div className="absolute -top-5 left-0 right-0 text-center font-black text-[9px] text-emerald-400 uppercase drop-shadow">
                🏠 Sân Nhà
              </div>
              <img
                src="/bg8x8.png"
                className="absolute inset-0 w-full h-full object-fill rounded-lg pointer-events-none"
              />
              {renderGrid(myBoard, false)}
            </div>

            {/* Sân Địch Lớn */}
            <div
              className={`relative w-full max-w-[320px] md:max-w-[400px] aspect-square bg-slate-900 rounded-2xl p-1 border-2 shadow-2xl order-1 md:order-2 transition-all ${turn === "PLAYER" ? "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]" : "border-rose-500 shadow-[0_0_20px_rgba(225,29,72,0.3)]"} ${showExplosion ? "animate-shake" : ""}`}
            >
              <div className="absolute -top-7 left-0 right-0 flex justify-center">
                <span
                  className={`px-4 py-1 rounded-full font-black text-xs uppercase border-2 bg-slate-950 ${turn === "PLAYER" ? "text-amber-400 border-amber-500 animate-pulse" : "text-rose-400 border-rose-500"}`}
                >
                  {turn === "PLAYER"
                    ? "⏱️ LƯỢT BẠN BẮN"
                    : "⏳ ĐỊCH ĐANG NGẮM..."}
                </span>
              </div>
              <img
                src="/bg8x8.png"
                className="absolute inset-0 w-full h-full object-fill rounded-xl pointer-events-none"
              />
              {renderGrid(enemyBoard, true)}

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
              Khóa huấn luyện này chỉ mất 1 phút thôi, giúp bạn làm quen 100% cơ
              chế chiến đấu và tránh bị ăn hành oan uổng đấy!
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
