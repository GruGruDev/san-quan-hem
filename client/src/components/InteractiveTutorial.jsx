import { useEffect, useState } from "react";
import { playSFX } from "../utils/sound";

export default function InteractiveTutorial({
  onComplete,
  soundEnabled,
  sfxVolume,
}) {
  const [step, setStep] = useState(0);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // States tương tác
  const [shopPlaced, setShopPlaced] = useState(false);
  const [shotHistory, setShotHistory] = useState({}); // { index: "MISS" | "HIT" }
  const [showExplosion, setShowExplosion] = useState(false);

  const boardSize = 8;

  useEffect(() => {
    if (step === 0) playSFX("success jingle.mp3", soundEnabled, sfxVolume);
  }, [step, soundEnabled, sfxVolume]);

  const handleNextStep = () => {
    playSFX("pop.mp3", soundEnabled, sfxVolume);
    setStep((prev) => prev + 1);
  };

  const handlePlaceShop = (index) => {
    if (shopPlaced) return;
    // Vị trí mồi cho Xe Cá Viên (2 ô)
    if (index === 27 || index === 28) {
      playSFX("pop.mp3", soundEnabled, sfxVolume);
      setShopPlaced(true);
      setTimeout(() => setStep(2), 1500);
    }
  };

  const handleShoot = (index) => {
    if (shotHistory[index]) return;

    if (index === 18 && !shotHistory[18]) {
      // Bắn trượt
      playSFX("waterdrop.mp3", soundEnabled, sfxVolume);
      setShotHistory((prev) => ({ ...prev, 18: "MISS" }));
    } else if (index === 28 && shotHistory[18] === "MISS") {
      // Bắn trúng (Chỉ cho bấm khi đã bắn trượt trước đó)
      playSFX("pop.mp3", soundEnabled, sfxVolume);
      setShotHistory((prev) => ({ ...prev, 28: "HIT" }));
      setShowExplosion(true);

      setTimeout(() => {
        playSFX("success jingle.mp3", soundEnabled, sfxVolume);
        setStep(3);
      }, 1500);
    }
  };

  return (
    <div className="absolute inset-0 z-100 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in select-none overflow-hidden">
      {/* Nút Skip */}
      <button
        onClick={() => {
          playSFX("pop.mp3", soundEnabled, sfxVolume);
          setShowSkipConfirm(true);
        }}
        className="absolute top-4 right-4 z-110 bg-slate-800/80 border border-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs hover:bg-slate-700 active:scale-95 transition"
      >
        Bỏ qua ⏭️
      </button>

      <div className="w-full max-w-md flex flex-col items-center gap-6 relative">
        {/* BƯỚC 0: CHÀO MỪNG */}
        {step === 0 && (
          <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 text-center animate-pop-in shadow-2xl">
            <div className="text-6xl mb-4 drop-shadow-lg">🎓</div>
            <h2 className="text-2xl font-black text-amber-400 uppercase mb-2">
              Khóa Huấn Luyện
            </h2>
            <p className="text-sm text-slate-300 mb-6 font-medium leading-relaxed">
              Săn Quán Hẻm là trò chơi chiến thuật đấu trí. Nhiệm vụ của bạn là
              giấu kín quán ăn của mình và oanh tạc bàn cờ của đối thủ để giành
              chiến thắng!
            </p>
            <button
              onClick={handleNextStep}
              className="w-full bg-linear-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-slate-950 font-black py-3.5 rounded-xl uppercase tracking-wider active:scale-95 transition shadow-lg"
            >
              Vào bài thực hành 🚀
            </button>
          </div>
        )}

        {/* BƯỚC 1: XẾP QUÁN */}
        {step === 1 && (
          <div className="flex flex-col items-center gap-4 w-full animate-fade-in">
            <div className="bg-slate-900 border-2 border-emerald-500 rounded-2xl p-4 text-center shadow-lg w-full max-w-[320px]">
              <h3 className="text-emerald-400 font-black text-lg uppercase mb-1">
                Bước 1: Giăng Bẫy
              </h3>
              <p className="text-xs text-slate-300">
                Đây là lưới 8x8 của bạn. Hãy nhấn vào{" "}
                <b className="text-amber-400">khu vực phát sáng</b> để đặt Xe Cá
                Viên!
              </p>
            </div>

            <div className="relative w-full max-w-[320px] aspect-square bg-slate-900 rounded-xl p-1 border-2 border-slate-700 shadow-2xl">
              <img
                src="/bg8x8.png"
                alt="Map"
                className="absolute inset-0 w-full h-full object-fill rounded-lg pointer-events-none"
              />
              <div
                className="absolute inset-0 grid gap-px w-full h-full p-[8.5%]"
                style={{
                  gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
                }}
              >
                {Array(boardSize * boardSize)
                  .fill(null)
                  .map((_, i) => {
                    const isTarget = i === 27 || i === 28;
                    return (
                      <div
                        key={i}
                        onClick={() => handlePlaceShop(i)}
                        className={`relative w-full h-full border border-white/10 rounded-sm transition-all 
                        ${isTarget && !shopPlaced ? "bg-emerald-500/40 border-2 border-emerald-400 cursor-pointer animate-pulse" : "bg-slate-800/80"}
                        ${shopPlaced && isTarget ? "bg-slate-800 outline-solid outline-2 -outline-offset-2 outline-amber-400" : ""}
                      `}
                      >
                        {shopPlaced && i === 27 && (
                          <img
                            src="/cavienchien.png"
                            alt="Shop"
                            className="absolute w-[200%] h-[90%] left-0 top-[5%] object-contain z-10"
                          />
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* BƯỚC 2: BẮN ĐỊCH */}
        {step === 2 && (
          <div className="flex flex-col items-center gap-4 w-full animate-fade-in">
            <div className="bg-slate-900 border-2 border-rose-500 rounded-2xl p-4 text-center shadow-lg w-full max-w-[320px]">
              <h3 className="text-rose-400 font-black text-lg uppercase mb-1">
                Bước 2: Săn Lùng
              </h3>
              <p className="text-xs text-slate-300">
                {!shotHistory[18] ? (
                  <span>
                    Đây là sân địch. Hãy ngắm vào{" "}
                    <b className="text-rose-400">Kính ngắm đỏ</b> để khai hỏa!
                  </span>
                ) : (
                  <span>
                    <b className="text-cyan-400">Trượt rồi!</b> Bắn hụt sẽ mất
                    lượt. May đây là diễn tập. Thử ô tiếp theo xem!
                  </span>
                )}
              </p>
            </div>

            <div
              className={`relative w-full max-w-[320px] aspect-square bg-slate-900 rounded-xl p-1 border-2 border-slate-700 shadow-2xl transition-transform ${showExplosion ? "animate-shake" : ""}`}
            >
              <img
                src="/bg8x8.png"
                alt="Map"
                className="absolute inset-0 w-full h-full object-fill rounded-lg pointer-events-none"
              />
              <div
                className="absolute inset-0 grid gap-px w-full h-full p-[8.5%]"
                style={{
                  gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
                }}
              >
                {Array(boardSize * boardSize)
                  .fill(null)
                  .map((_, i) => {
                    const isAiming1 = i === 18 && !shotHistory[18];
                    const isAiming2 =
                      i === 28 &&
                      shotHistory[18] === "MISS" &&
                      !shotHistory[28];
                    const status = shotHistory[i];

                    return (
                      <div
                        key={i}
                        onClick={() => handleShoot(i)}
                        className={`relative w-full h-full border border-white/10 rounded-sm transition-all 
                        ${isAiming1 || isAiming2 ? "bg-rose-500/20 cursor-pointer" : "bg-slate-800/80"}
                      `}
                      >
                        {(isAiming1 || isAiming2) && (
                          <img
                            src="/vitri.png"
                            className="absolute inset-0 w-[120%] h-[120%] left-[-10%] top-[-10%] object-contain animate-ping z-10"
                            alt="Aim"
                          />
                        )}
                        {status === "MISS" && (
                          <img
                            src="/khongtrung.png"
                            className="absolute inset-0 w-[90%] h-[90%] m-auto object-contain opacity-80 z-20"
                            alt="Miss"
                          />
                        )}
                        {status === "HIT" && (
                          <img
                            src="/trung.png"
                            className="absolute inset-0 w-[120%] h-[120%] left-[-10%] top-[-10%] object-contain animate-bounce z-20"
                            alt="Hit"
                          />
                        )}
                      </div>
                    );
                  })}
              </div>
              {showExplosion && (
                <div className="absolute inset-0 z-50 flex items-center justify-center mix-blend-screen pointer-events-none">
                  <img
                    src="/explosion.gif"
                    className="w-[150%] h-[150%] object-cover opacity-90"
                    alt="Boom"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* BƯỚC 3: TỔNG KẾT */}
        {step === 3 && (
          <div className="bg-slate-900 border-2 border-emerald-500 rounded-3xl p-6 text-center animate-pop-in shadow-2xl">
            <div className="text-5xl mb-4">🏆</div>
            <h2 className="text-xl font-black text-emerald-400 uppercase mb-2">
              Xuất Sắc!
            </h2>
            <div className="text-sm text-slate-300 mb-6 font-medium leading-relaxed text-left space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <p>
                🎯 <b className="text-amber-400">Bắn TRÚNG:</b> Được quyền bắn
                tiếp.
              </p>
              <p>
                💦 <b className="text-cyan-400">Bắn TRƯỢT:</b> Lượt chuyển sang
                đối thủ.
              </p>
              <p>
                ⏱️ <b className="text-rose-400">Luật 25s:</b> Nếu bạn treo máy,
                hệ thống sẽ tự động bắn bừa.
              </p>
              <p>
                🤝 <b className="text-purple-400">Đấu 2v2:</b> 2 người cùng
                chung 1 bàn cờ 12x12 siêu to.
              </p>
            </div>
            <button
              onClick={onComplete}
              className="w-full bg-linear-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-white font-black py-3.5 rounded-xl uppercase tracking-wider active:scale-95 transition shadow-lg animate-pulse"
            >
              Tuyệt, VÀO GAME THÔI! 🚀
            </button>
          </div>
        )}
      </div>

      {/* MODAL XÁC NHẬN BỎ QUA */}
      {showSkipConfirm && (
        <div className="absolute inset-0 z-120 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-xs bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 text-center animate-pop-in shadow-2xl">
            <h3 className="text-xl font-black text-amber-400 mb-2 uppercase">
              Khoan đã! ✋
            </h3>
            <p className="text-sm text-slate-300 mb-6 font-medium">
              Bạn chắc chắn đã rành luật chơi và muốn nhảy thẳng vào thực chiến?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={onComplete}
                className="w-full bg-amber-500 hover:bg-yellow-400 text-slate-950 font-black py-3 rounded-xl text-xs uppercase tracking-wider active:scale-95 transition shadow"
              >
                Tôi đã hiểu, bỏ qua
              </button>
              <button
                onClick={() => setShowSkipConfirm(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider active:scale-95 transition shadow"
              >
                Xem tiếp hướng dẫn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hiệu ứng Rung khi trúng */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0) translateY(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px) translateY(3px) rotate(-1deg); }
          20%, 40%, 60%, 80% { transform: translateX(5px) translateY(-3px) rotate(1deg); }
        }
        .animate-shake {
          animation: shake 1s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
}
