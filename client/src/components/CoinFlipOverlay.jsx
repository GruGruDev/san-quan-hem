import { useEffect, useState } from "react";

export default function CoinFlipOverlay({ result, onComplete }) {
  const [flipping, setFlipping] = useState(true);
  const isFirst = result === "FIRST";

  useEffect(() => {
    // 1. Chạy animation tung xu 3s
    const flipTimer = setTimeout(() => {
      setFlipping(false);

      // 2. Chờ 1.2s cho người chơi xem rõ mặt đồng xu & thông báo kết quả
      const finishTimer = setTimeout(() => {
        if (onComplete) onComplete();
      }, 1200);

      return () => clearTimeout(finishTimer);
    }, 3000);

    return () => clearTimeout(flipTimer);
  }, [onComplete]);

  return (
    <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in select-none">
      {/* Vòng tròn spinner đếm ngược bao quanh */}
      {flipping && (
        <div className="absolute w-44 h-44 rounded-full border-4 border-slate-800 animate-spin-slow pointer-events-none">
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-amber-400 border-r-yellow-400" />
        </div>
      )}

      {/* Đồng xu Lật 3D */}
      <div className="relative w-32 h-32 [perspective:1000px] mb-6">
        <div
          className={`coin w-full h-full rounded-full shadow-2xl shadow-yellow-500/20 ${
            flipping ? "flip" : ""
          }`}
          style={{
            transform: !flipping
              ? isFirst
                ? "rotateY(0deg)"
                : "rotateY(180deg)"
              : undefined,
          }}
        >
          {/* Mặt Trước (Người chơi đi trước) */}
          <div className="front bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 border-4 border-yellow-300 flex items-center justify-center text-5xl font-bold shadow-inner">
            👑
          </div>

          {/* Mặt Sau (Đối thủ đi trước) */}
          <div className="back bg-gradient-to-tr from-blue-600 via-indigo-400 to-purple-500 border-4 border-cyan-300 flex items-center justify-center text-5xl font-bold shadow-inner">
            🛡️
          </div>
        </div>
      </div>

      {/* Thông báo Trạng thái & Kết quả */}
      <div className="flex flex-col items-center gap-2 z-10">
        {flipping ? (
          <>
            <h2 className="text-2xl font-black text-yellow-400 tracking-wider uppercase drop-shadow animate-pulse">
              ĐANG QUAY ĐỒNG XU...
            </h2>
            <p className="text-xs text-slate-300 font-medium">
              Trọng tài đang tung đồng xu quyết định lượt đi!
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 animate-fade-in-up">
            <h2
              className={`text-2xl font-black tracking-widest uppercase drop-shadow ${
                isFirst ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {isFirst
                ? "🎉 BẠN ĐƯỢC BẮN TRƯỚC!"
                : "🛡️ ĐỐI THỦ ĐƯỢC BẮN TRƯỚC!"}
            </h2>
            <p className="text-xs text-slate-200 font-bold bg-slate-800/80 px-4 py-1.5 rounded-full border border-slate-700 shadow-lg">
              {isFirst ? "Xả đạn ngay lập tức!" : "Hãy chuẩn bị phòng thủ!"}
            </p>
          </div>
        )}
      </div>

      {/* Custom Keyframes CSS */}
      <style>{`
        @keyframes coinFlip {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(1800deg); }
        }
        .coin {
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .coin.flip {
          animation: coinFlip 0.5s linear infinite;
        }
        .coin .front, .coin .back {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          backface-visibility: hidden;
        }
        .coin .back {
          transform: rotateY(180deg);
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 2.5s linear infinite;
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.4s ease forwards;
        }
      `}</style>
    </div>
  );
}
