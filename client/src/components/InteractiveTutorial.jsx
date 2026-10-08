import { useEffect, useState } from "react";
import { playSFX } from "../utils/sound";

export default function InteractiveTutorial({
  onComplete,
  soundEnabled,
  sfxVolume,
}) {
  const [step, setStep] = useState(0);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [demoHit, setDemoHit] = useState(false);

  useEffect(() => {
    if (step === 0) playSFX("success jingle.mp3", soundEnabled, sfxVolume);
  }, [step, soundEnabled, sfxVolume]);

  const handleNextStep = () => {
    playSFX("pop.mp3", soundEnabled, sfxVolume);
    setStep((prev) => prev + 1);
  };

  const handleSimulateShot = () => {
    if (demoHit) return;
    playSFX("pop.mp3", soundEnabled, sfxVolume);
    setDemoHit(true);
    setTimeout(() => {
      setStep(3);
    }, 1500);
  };

  return (
    <div className="absolute inset-0 z-100 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-fade-in select-none overflow-hidden">
      {/* Nút Skip */}
      <button
        onClick={() => {
          playSFX("pop.mp3", soundEnabled, sfxVolume);
          setShowSkipConfirm(true);
        }}
        className="absolute top-4 right-4 z-50 bg-slate-800/80 border border-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs hover:bg-slate-700 active:scale-95 transition"
      >
        Bỏ qua hướng dẫn ⏭️
      </button>

      {/* Nội dung Huấn luyện */}
      <div className="w-full max-w-sm flex flex-col items-center gap-6 relative">
        {step === 0 && (
          <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 text-center animate-pop-in shadow-2xl">
            <div className="text-5xl mb-4">🎓</div>
            <h2 className="text-xl font-black text-amber-400 uppercase mb-2">
              Chào mừng Tân Thủ!
            </h2>
            <p className="text-sm text-slate-300 mb-6 font-medium leading-relaxed">
              Săn Quán Hẻm là trò chơi đấu trí ẩn nấp. Nhiệm vụ của bạn là giấu
              quán ăn của mình và phán đoán bắn sập quán của đối thủ!
            </p>
            <button
              onClick={handleNextStep}
              className="w-full bg-amber-500 text-slate-950 font-black py-3 rounded-xl uppercase active:scale-95 transition"
            >
              Bắt đầu học việc
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col items-center gap-4 w-full animate-fade-in">
            <div className="bg-slate-900 border-2 border-emerald-500 rounded-2xl p-4 text-center">
              <h3 className="text-emerald-400 font-black uppercase mb-1">
                Bước 1: Giăng Bẫy
              </h3>
              <p className="text-xs text-slate-300">
                Nhấn vào vùng sáng bên dưới để đặt "Xe Cá Viên" lên bàn cờ của
                bạn!
              </p>
            </div>

            {/* Giả lập Bàn cờ nhỏ */}
            <div className="w-64 h-64 bg-slate-900 border border-slate-700 rounded-xl grid grid-cols-4 grid-rows-4 p-2 gap-1">
              {Array(16)
                .fill(null)
                .map((_, i) => (
                  <div
                    key={i}
                    onClick={i === 5 ? handleNextStep : null}
                    className={`rounded-md border border-white/10 ${i === 5 ? "bg-amber-500/40 border-amber-400 cursor-pointer animate-pulse" : "bg-slate-800"}`}
                  >
                    {i === 5 && (
                      <span className="flex items-center justify-center h-full text-2xl drop-shadow-md">
                        👇
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center gap-4 w-full animate-fade-in">
            <div className="bg-slate-900 border-2 border-rose-500 rounded-2xl p-4 text-center">
              <h3 className="text-rose-400 font-black uppercase mb-1">
                Bước 2: Săn Lùng
              </h3>
              <p className="text-xs text-slate-300">
                Đến lượt bạn! Kẻ địch đang trốn ở đâu đó. Chạm vào ô sáng để
                khai hỏa!
              </p>
            </div>

            {/* Giả lập Bàn cờ Địch */}
            <div className="w-64 h-64 bg-slate-900 border border-slate-700 rounded-xl grid grid-cols-4 grid-rows-4 p-2 gap-1 relative">
              {Array(16)
                .fill(null)
                .map((_, i) => (
                  <div
                    key={i}
                    onClick={i === 10 ? handleSimulateShot : null}
                    className={`relative rounded-md border border-white/10 ${i === 10 && !demoHit ? "bg-rose-500/40 border-rose-400 cursor-pointer animate-pulse" : "bg-slate-800"}`}
                  >
                    {i === 10 && !demoHit && (
                      <span className="absolute inset-0 flex items-center justify-center text-2xl">
                        🎯
                      </span>
                    )}
                    {i === 10 && demoHit && (
                      <img
                        src="/trung.png"
                        className="w-full h-full object-contain animate-bounce z-20"
                        alt="Hit"
                      />
                    )}
                  </div>
                ))}
              {demoHit && (
                <img
                  src="/explosion.gif"
                  className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-90 pointer-events-none"
                  alt="Boom"
                />
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 text-center animate-pop-in shadow-2xl">
            <div className="text-5xl mb-4">🏆</div>
            <h2 className="text-xl font-black text-amber-400 uppercase mb-2">
              Tuyệt Đỉnh!
            </h2>
            <p className="text-sm text-slate-300 mb-6 font-medium leading-relaxed">
              Bắn TRÚNG sẽ được bắn tiếp. Bắn hụt sẽ mất lượt. Đội nào bị đánh
              sập hết 100% quán ăn trước sẽ thua cuộc.
              <br />
              <br />
              Bạn đã sẵn sàng để trở thành Vua Hẻm Phố!
            </p>
            <button
              onClick={onComplete}
              className="w-full bg-linear-to-r from-emerald-500 to-teal-500 text-white font-black py-3 rounded-xl uppercase active:scale-95 transition"
            >
              Vào Game Ngay 🚀
            </button>
          </div>
        )}
      </div>

      {/* Confirm Skip Modal */}
      {showSkipConfirm && (
        <div className="absolute inset-0 z-110 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-slate-900 border-2 border-slate-700 rounded-2xl p-5 text-center animate-pop-in">
            <h3 className="text-lg font-black text-amber-400 mb-2 uppercase">
              Khoan đã!
            </h3>
            <p className="text-xs text-slate-300 mb-5 font-medium">
              Bạn chắc chắn đã thuộc lòng mọi ngóc ngách của Hẻm và muốn nhảy
              thẳng vào thực chiến?
            </p>
            <div className="flex gap-2">
              <button
                onClick={onComplete}
                className="flex-1 bg-amber-500 text-slate-950 font-black py-2 rounded-xl text-xs active:scale-95 transition"
              >
                Bỏ qua
              </button>
              <button
                onClick={() => setShowSkipConfirm(false)}
                className="flex-1 bg-slate-700 text-white font-black py-2 rounded-xl text-xs active:scale-95 transition"
              >
                Xem tiếp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
