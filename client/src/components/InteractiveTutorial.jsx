import { useEffect, useState } from "react";
import { playSFX } from "../utils/sound";

export default function InteractiveTutorial({
  onComplete,
  soundEnabled,
  sfxVolume,
}) {
  const [step, setStep] = useState(0);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // --- STATES GIẢ LẬP TRẬN ĐẤU ---
  const [rotation, setRotation] = useState(0);
  const [myBoard, setMyBoard] = useState(Array(64).fill(null));
  const [enemyBoard, setEnemyBoard] = useState(Array(64).fill(null));
  const [showExplosion, setShowExplosion] = useState(false);
  const [botShooting, setBotShooting] = useState(false);

  const boardSize = 8;

  useEffect(() => {
    if (step === 0) playSFX("success jingle.mp3", soundEnabled, sfxVolume);
  }, [step, soundEnabled, sfxVolume]);

  const handleNextStep = () => {
    playSFX("pop.mp3", soundEnabled, sfxVolume);
    setStep((prev) => prev + 1);
  };

  // --- LOGIC CÁC BƯỚC THỰC HÀNH ---
  const handleAction = (actionType, index = null) => {
    if (showSkipConfirm) return;

    // Bước 1: Yêu cầu bấm XOAY
    if (step === 1 && actionType === "ROTATE") {
      playSFX("pop.mp3", soundEnabled, sfxVolume);
      setRotation(1);
      setTimeout(() => setStep(2), 500);
    }

    // Bước 2: Yêu cầu ĐẶT QUÁN vào vị trí GÓC (Khuất)
    if (step === 2 && actionType === "PLACE") {
      // Bắt buộc đặt ở góc dưới cùng bên trái (ô 56, 48)
      if (index === 48 || index === 56) {
        playSFX("pop.mp3", soundEnabled, sfxVolume);
        const newBoard = [...myBoard];
        newBoard[48] = { shopId: "cavien", icon: "/cavienchien.png" };
        newBoard[56] = { shopId: "cavien", icon: "/cavienchien.png" };
        setMyBoard(newBoard);
        setTimeout(() => setStep(3), 800);
      } else {
        playSFX("waterdrop.mp3", soundEnabled, sfxVolume);
      }
    }

    // Bước 3: Dùng tính năng ĐẶT LẠI (Reset)
    if (step === 3 && actionType === "RESET") {
      playSFX("pop.mp3", soundEnabled, sfxVolume);
      setMyBoard(Array(64).fill(null));
      setRotation(0);
      setTimeout(() => setStep(4), 800);
    }

    // Bước 4: Tự động xếp ful bàn và bấm SẴN SÀNG
    if (step === 4 && actionType === "READY") {
      playSFX("success jingle.mp3", soundEnabled, sfxVolume);
      setStep(5);
    }

    // Bước 5: Lượt bắn đầu tiên (Cố tình cho bắn trượt)
    if (step === 5 && actionType === "SHOOT") {
      if (index === 27) {
        playSFX("waterdrop.mp3", soundEnabled, sfxVolume);
        const newEnemy = [...enemyBoard];
        newEnemy[27] = "MISS";
        setEnemyBoard(newEnemy);
        setStep(6);

        // Kích hoạt lượt Bot bắn
        setTimeout(() => {
          setBotShooting(true);
          playSFX("pop.mp3", soundEnabled, sfxVolume);
          setTimeout(() => {
            playSFX("waterdrop.mp3", soundEnabled, sfxVolume);
            const boardAfterBot = [...myBoard];
            boardAfterBot[15] = { shot: "MISS" }; // Bot bắn hụt
            setMyBoard(boardAfterBot);
            setBotShooting(false);
            setStep(7); // Trả lại lượt cho mình
          }, 1500);
        }, 1500);
      }
    }

    // Bước 7 & 8: Bắn trúng -> Được bắn tiếp -> Nổ tung
    if ((step === 7 || step === 8) && actionType === "SHOOT") {
      // Phát súng 1 (Trúng)
      if (step === 7 && index === 36) {
        playSFX("pop.mp3", soundEnabled, sfxVolume);
        const newEnemy = [...enemyBoard];
        newEnemy[36] = "HIT";
        setEnemyBoard(newEnemy);
        setStep(8);
      }
      // Phát súng 2 (Trúng & Chìm)
      if (step === 8 && index === 37) {
        playSFX("pop.mp3", soundEnabled, sfxVolume);
        const newEnemy = [...enemyBoard];
        newEnemy[37] = "HIT";
        setEnemyBoard(newEnemy);
        setShowExplosion(true);
        setTimeout(() => {
          playSFX("success jingle.mp3", soundEnabled, sfxVolume);
          setStep(9); // Sang màn tổng kết
        }, 1500);
      }
    }
  };

  // Render lưới bàn cờ trong Tutorial
  const renderGrid = (board, isEnemy = false) => {
    return (
      <div
        className="absolute inset-0 grid gap-px w-full h-full p-[8.5%]"
        style={{ gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))` }}
      >
        {board.map((cell, i) => {
          // --- LOGIC HIGHLIGHT (Gợi ý chỗ cần bấm) ---
          let isTarget = false;
          if (step === 2 && !isEnemy && (i === 48 || i === 56)) isTarget = true; // Dạy đặt góc
          if (step === 5 && isEnemy && i === 27) isTarget = true; // Dạy bắn trượt
          if (step === 7 && isEnemy && i === 36) isTarget = true; // Dạy bắn trúng 1
          if (step === 8 && isEnemy && i === 37) isTarget = true; // Dạy bắn chìm

          return (
            <div
              key={i}
              onClick={() => handleAction(isEnemy ? "SHOOT" : "PLACE", i)}
              className={`relative w-full h-full border border-white/10 rounded-sm transition-all flex items-center justify-center
                ${isTarget ? "bg-amber-500/40 border-2 border-amber-400 cursor-pointer animate-pulse z-20 shadow-[0_0_15px_rgba(245,158,11,0.5)]" : "bg-slate-800/80"}
                ${!isEnemy && cell?.icon ? "bg-emerald-900/50 outline-solid outline-2 -outline-offset-2 outline-emerald-400" : ""}
                ${isEnemy && !isTarget ? "cursor-not-allowed" : ""}
              `}
            >
              {/* Hiển thị Quán (Sân nhà) */}
              {!isEnemy && cell?.icon && i === 48 && (
                <img
                  src={cell.icon}
                  alt="Shop"
                  className="absolute w-[90%] h-[200%] top-[5%] object-contain z-10"
                />
              )}
              {/* Hiển thị đạn Địch (Bot bắn) */}
              {!isEnemy && cell?.shot === "MISS" && (
                <img src="/khongtrung.png" className="w-[80%] opacity-80" />
              )}

              {/* Kính ngắm khi bắt buộc bấm */}
              {isEnemy && isTarget && (
                <img
                  src="/vitri.png"
                  className="absolute w-[120%] h-[120%] z-10 animate-ping opacity-90 drop-shadow-[0_0_5px_red]"
                />
              )}

              {/* Hiển thị đạn Ta bắn */}
              {isEnemy && cell === "MISS" && (
                <img
                  src="/khongtrung.png"
                  className="w-[80%] opacity-80 z-10"
                />
              )}
              {isEnemy && cell === "HIT" && (
                <img
                  src="/trung.png"
                  className="absolute w-[120%] h-[120%] animate-bounce z-10"
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-110 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-fade-in select-none overflow-hidden">
      {/* Nút Bỏ qua */}
      <button
        onClick={() => {
          playSFX("pop.mp3", soundEnabled, sfxVolume);
          setShowSkipConfirm(true);
        }}
        className="absolute top-4 right-4 md:top-6 md:right-6 z-120 bg-slate-800/80 border border-slate-600 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs hover:bg-slate-700 hover:text-white active:scale-95 transition backdrop-blur-md"
      >
        Bỏ qua ⏭️
      </button>

      <div className="w-full max-w-lg flex flex-col items-center gap-6 relative">
        {/* --- KHUNG HỘI THOẠI HƯỚNG DẪN DƯỚI/TRÊN CÙNG --- */}
        <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-4 w-full shadow-[0_0_30px_rgba(245,158,11,0.15)] flex flex-col items-center text-center z-30 transition-all duration-300">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">👩‍🏫</span>
            <h3 className="text-amber-400 font-black uppercase tracking-wider text-sm">
              Hệ Thống Huấn Luyện
            </h3>
          </div>

          <p className="text-slate-200 text-sm font-medium leading-relaxed min-h-[40px]">
            {step === 0 &&
              "Săn Quán Hẻm là game chiến thuật ẩn nấp. Bạn giấu quán ăn của mình và oanh tạc sân đối thủ."}
            {step === 1 &&
              "BƯỚC 1: XẾP QUÁN.\nĐể đối thủ khó đoán, hãy nhấn nút XOAY để chuyển quán dọc/ngang."}
            {step === 2 &&
              "Tốt lắm! Giờ hãy bấm vào Ô PHÁT SÁNG để đặt Xe Cá Viên sát vào góc hẻm."}
            {step === 3 &&
              "Gợi ý: Nếu lỡ đặt sai hoặc thấy đội hình dễ đoán, hãy nhấn ĐẶT LẠI để xếp lại từ đầu."}
            {step === 4 &&
              "Đội hình đã được sắp xếp ngẫu nhiên xong. Nhấn SẴN SÀNG để vào trận đấu!"}
            {step === 5 &&
              "BƯỚC 2: TẤN CÔNG.\nĐây là sân địch. Hãy ngắm vào ô PHÁT SÁNG ĐỎ và khai hỏa!"}
            {step === 6 &&
              "Trượt rồi (Nước bắn vào hẻm trống)! Khi trượt, bạn SẼ MẤT LƯỢT. Chờ đối thủ bắn..."}
            {step === 7 &&
              "May quá địch cũng trượt. Lượt của bạn! Hãy bắn vào ô PHÁT SÁNG MỚI."}
            {step === 8 &&
              "TRÚNG RỒI! Bắn trúng thì BẠN ĐƯỢC BẮN TIẾP. Hãy bắn nốt ô bên cạnh để đánh chìm!"}
            {step === 9 &&
              "Tuyệt vời! Xe Cá Viên của địch đã nổ tung! Bạn đã nắm vững cơ chế chiến đấu."}
          </p>
        </div>

        {/* --- BƯỚC 0 & 9: CHÀO MỪNG / TỔNG KẾT --- */}
        {(step === 0 || step === 9) && (
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full text-center animate-pop-in shadow-2xl mt-4">
            <div className="text-6xl mb-4 drop-shadow-lg">
              {step === 0 ? "🎓" : "🏆"}
            </div>

            {step === 9 && (
              <div className="text-left bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6 space-y-3">
                <p className="text-sm">
                  <b className="text-emerald-400">✅ Mẹo giấu quán:</b> Đừng xếp
                  quán dính chùm vào nhau. Hãy rải rác sát viền hoặc góc.
                </p>
                <p className="text-sm">
                  <b className="text-amber-400">🎯 Bắn trúng bắn tiếp:</b> Tận
                  dụng lượt bắn thêm để rà quét hình dáng quán địch.
                </p>
                <p className="text-sm">
                  <b className="text-rose-400">⏱️ Luật 25 giây:</b> Mỗi lượt chỉ
                  có 25s. Quá giờ, hệ thống sẽ tự động thả bom bừa bãi!
                </p>
                <p className="text-sm">
                  <b className="text-blue-400">🤝 Chế độ 2v2:</b> Bạn và đồng
                  đội sẽ dùng chung 1 bàn cờ 12x12 siêu to khổng lồ.
                </p>
              </div>
            )}

            <button
              onClick={step === 0 ? handleNextStep : onComplete}
              className="w-full bg-linear-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-white font-black py-3.5 rounded-xl uppercase tracking-wider active:scale-95 transition shadow-lg animate-pulse"
            >
              {step === 0
                ? "Bắt Đầu Thực Hành 🚀"
                : "HOÀN TẤT HUẤN LUYỆN KHÓA 1"}
            </button>
          </div>
        )}

        {/* --- BƯỚC 1 -> 4: MÔ PHỎNG XẾP QUÁN --- */}
        {step >= 1 && step <= 4 && (
          <div className="flex flex-col md:flex-row gap-4 w-full animate-fade-in items-center justify-center">
            {/* Thanh Control Mô phỏng */}
            <div className="w-full md:w-48 bg-slate-900 border border-slate-700 p-3 rounded-2xl flex flex-col gap-3 order-2 md:order-1">
              <div className="text-xs font-black text-slate-400 uppercase text-center mb-1">
                Kho Quán
              </div>
              <div className="w-12 h-12 mx-auto bg-amber-500/20 border-2 border-amber-400 rounded-xl p-1">
                <img
                  src="/cavienchien.png"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => handleAction("ROTATE")}
                  className={`flex-1 font-black text-xs py-2 rounded-lg transition ${step === 1 ? "bg-indigo-500 text-white animate-pulse shadow-[0_0_15px_rgba(99,102,241,0.6)]" : "bg-slate-800 text-slate-500"}`}
                >
                  🔄 XOAY ({rotation === 0 ? "0°" : "90°"})
                </button>
                <button
                  onClick={() => handleAction("RESET")}
                  className={`w-10 font-black text-xs rounded-lg transition ${step === 3 ? "bg-rose-600 text-white animate-pulse shadow-[0_0_15px_rgba(225,29,72,0.6)]" : "bg-slate-800 text-slate-500"}`}
                >
                  ↩️
                </button>
              </div>
              <button
                onClick={() => handleAction("READY")}
                disabled={step !== 4}
                className={`w-full font-black py-3 rounded-xl text-xs uppercase transition ${step === 4 ? "bg-emerald-500 text-slate-950 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.6)]" : "bg-slate-800 text-slate-500 opacity-50"}`}
              >
                🚀 SẴN SÀNG!
              </button>
            </div>

            {/* Bàn Cờ Mô Phỏng */}
            <div className="relative w-full max-w-[280px] aspect-square bg-slate-900 rounded-2xl p-1 border-2 border-slate-700 shadow-2xl order-1 md:order-2">
              <div className="absolute -top-6 left-0 right-0 text-center font-black text-[10px] text-emerald-400 uppercase">
                🏠 Sân Nhà Của Bạn
              </div>
              <img
                src="/bg8x8.png"
                className="absolute inset-0 w-full h-full object-fill rounded-xl pointer-events-none"
              />

              {/* Lưới giả lập Auto-fill cho bước 4 */}
              {step === 4 ? (
                <div className="absolute inset-0 p-[8.5%] grid grid-cols-8 grid-rows-8 gap-px opacity-60">
                  <div className="col-start-1 row-start-1 col-span-2 row-span-1 bg-emerald-900/50 border-2 border-emerald-400" />
                  <div className="col-start-8 row-start-2 col-span-1 row-span-3 bg-emerald-900/50 border-2 border-emerald-400" />
                  <div className="col-start-4 row-start-5 col-span-1 row-span-4 bg-emerald-900/50 border-2 border-emerald-400" />
                  <div className="col-start-2 row-start-7 col-span-2 row-span-1 bg-emerald-900/50 border-2 border-emerald-400" />
                </div>
              ) : (
                renderGrid(myBoard, false)
              )}
            </div>
          </div>
        )}

        {/* --- BƯỚC 5 -> 8: MÔ PHỎNG CHIẾN ĐẤU --- */}
        {step >= 5 && step <= 8 && (
          <div className="flex flex-col items-center gap-4 w-full animate-fade-in">
            {/* Bảng trạng thái Lượt */}
            <div
              className={`px-6 py-2 rounded-xl border-2 font-black text-sm tracking-widest uppercase transition-all duration-300 ${botShooting ? "bg-rose-950/80 border-rose-500 text-rose-400" : "bg-emerald-950/80 border-emerald-500 text-emerald-400"}`}
            >
              {botShooting ? "⏳ ĐỊCH ĐANG BẮN..." : "⏱️ LƯỢT CỦA BẠN (25s)"}
            </div>

            <div
              className={`relative w-full max-w-[280px] aspect-square bg-slate-900 rounded-2xl p-1 border-2 border-slate-700 shadow-2xl transition-transform ${showExplosion ? "animate-shake" : ""}`}
            >
              <div className="absolute -top-6 left-0 right-0 text-center font-black text-[10px] text-rose-400 uppercase">
                🎯 Sân Địch
              </div>
              <img
                src="/bg8x8.png"
                className="absolute inset-0 w-full h-full object-fill rounded-xl pointer-events-none"
              />

              {renderGrid(enemyBoard, true)}

              {/* Nổ Tung */}
              {showExplosion && (
                <div className="absolute inset-0 z-50 flex items-center justify-center mix-blend-screen pointer-events-none">
                  <img
                    src="/explosion.gif"
                    className="w-[150%] h-[150%] object-cover opacity-90"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL XÁC NHẬN BỎ QUA */}
      {showSkipConfirm && (
        <div className="absolute inset-0 z-130 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 text-center shadow-2xl">
            <h3 className="text-xl font-black text-amber-400 mb-2 uppercase">
              Chắc chắn bỏ qua?
            </h3>
            <p className="text-sm text-slate-300 mb-6 font-medium">
              Bạn có thể bị "ăn hành" sấp mặt nếu không nắm vững luật bắn
              Trúng/Trượt và xoay quán đấy nhé!
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
                Quay lại học tiếp
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
        .animate-shake { animation: shake 1s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>
    </div>
  );
}
