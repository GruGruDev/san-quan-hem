import { useEffect } from "react";

export default function ShotOverlay({ type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!type) return null;

  const config = {
    HIT: {
      text: "🔥 BÙM! BÙM! TRÚNG QUÁN! 🔥",
      style: "from-red-600 to-amber-600 border-yellow-300 text-yellow-200",
    },
    MISS: {
      text: "💦 HỤT RỒI! HẺM VẮNG! 💦",
      style: "from-slate-800 to-blue-900 border-slate-500 text-blue-200",
    },
    SUNK: {
      text: "💥 ĐÁNH SẬP HOÀN TOÀN QUÁN! 💥",
      style:
        "from-purple-700 via-red-600 to-purple-700 border-yellow-300 text-yellow-200",
    },
  }[type] || { text: "", style: "" };

  return (
    <div className="absolute inset-0 bg-black/60 z-40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div
        className={`p-5 rounded-3xl border-4 text-center shadow-2xl bg-gradient-to-r ${config.style} animate-bounce`}
      >
        <h2 className="text-xl font-black tracking-wider uppercase drop-shadow">
          {config.text}
        </h2>
      </div>
    </div>
  );
}
