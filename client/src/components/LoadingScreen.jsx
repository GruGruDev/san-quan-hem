import { useEffect } from "react";
import { APP_VERSION } from "../constants/game";

export default function LoadingScreen({ onFinish }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onFinish) onFinish();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-white select-none">
      <div className="w-28 h-28 relative flex items-center justify-center animate-bounce">
        <img
          src="/khungvang.png"
          className="absolute inset-0 w-full h-full object-contain animate-spin"
          style={{ animationDuration: "3s" }}
          alt="Khung"
        />
        <img
          src="/cavienchien.png"
          className="w-14 h-14 object-contain z-10"
          alt="Icon"
        />
      </div>

      <div className="text-center mt-6">
        <h1 className="text-2xl font-black text-yellow-400 tracking-wider uppercase drop-shadow">
          SĂN QUÁN HẺM
        </h1>
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">
          Đang tải hẻm phố...
        </p>
      </div>

      <div className="w-2/3 max-w-[220px] h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700 mt-6">
        <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full animate-pulse w-full" />
      </div>

      <span className="absolute bottom-4 right-4 text-[10px] text-slate-600 font-bold tracking-wider">
        {APP_VERSION}
      </span>
    </div>
  );
}
