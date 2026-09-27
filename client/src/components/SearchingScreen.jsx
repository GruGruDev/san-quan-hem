export default function SearchingScreen({ onCancel }) {
  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-xs z-40 flex flex-col items-center justify-center gap-4 text-center p-4 animate-fade-in select-none">
      {/* Vòng quay Loading */}
      <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(234,179,8,0.5)]" />

      {/* Thông báo */}
      <div className="flex flex-col gap-1">
        <p className="text-white font-bold text-sm tracking-wide">
          Đang tìm phượt thủ xứng tầm...
        </p>
        <p className="text-[11px] text-amber-200/60 font-medium animate-pulse">
          Sẵn sàng trà sữa & cá viên chiên nhé!
        </p>
      </div>

      {/* NÚT HỦY TÌM TRẬN */}
      <button
        onClick={onCancel}
        className="mt-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 border-2 border-rose-500/50 hover:border-rose-400 text-rose-300 font-black text-xs rounded-2xl shadow-lg active:scale-95 transition flex items-center gap-2 cursor-pointer"
      >
        <span>❌</span> HỦY TÌM TRẬN
      </button>
    </div>
  );
}
