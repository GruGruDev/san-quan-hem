export default function Header({
  team,
  playerName,
  isMyTurn,
  gameState,
  turnTimeLeft,
  onOpenSettings,
  onSurrender, // Prop mới từ App.jsx
}) {
  const isRed = team === "red";

  return (
    <div
      className={`w-full p-3 text-center shadow-lg z-10 border-b-2 flex justify-between items-center px-4 md:rounded-t-3xl transition-all duration-500 ${isRed ? "bg-linear-to-r from-red-600 via-amber-500 to-red-600 border-red-700" : "bg-linear-to-r from-blue-600 via-cyan-500 to-blue-600 border-blue-700"}`}
    >
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 flex items-center justify-center font-black text-2xl bg-black/20 rounded-xl shadow-inner border border-white/20">
          {isRed ? "🔴" : "🔵"}
        </div>
      </div>

      <div className="flex flex-col items-center">
        <h1 className="text-xl font-black text-slate-950 tracking-wider uppercase drop-shadow">
          SĂN QUÁN HẺM
        </h1>
        <p className="text-[11px] text-slate-950 font-black uppercase tracking-tight flex items-center justify-center gap-1">
          {gameState === "SETUP" &&
            `ĐỘI ${isRed ? "ĐỎ" : "XANH"} (${playerName || "BẠN"}): ĐẶT QUÁN`}
          {gameState === "PLAYING" && (
            <>
              <span>
                {isMyTurn ? "💥 LƯỢT BẠN BẮN!" : "🛡️ CHỜ ĐỐI THỦ BẮN!"}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded font-mono text-xs shadow ${turnTimeLeft <= 5 ? "bg-red-600 text-white animate-ping" : "bg-black/40 text-yellow-300"}`}
              >
                ⏱️ {turnTimeLeft}s
              </span>
            </>
          )}
          {gameState === "FINISHED" && "🏆 TỔNG KẾT TRẬN ĐẤU"}
        </p>
      </div>

      <div className="flex gap-2">
        {/* Nút Đầu Hàng */}
        {gameState === "PLAYING" && (
          <button
            onClick={onSurrender}
            className="w-10 h-10 bg-slate-950/40 hover:bg-rose-600 border border-rose-400/50 rounded-xl flex items-center justify-center text-lg active:scale-95 transition shadow-lg"
            title="Đầu hàng"
          >
            🏳️
          </button>
        )}
        {/* Nút Cài đặt */}
        <button
          onClick={onOpenSettings}
          className="w-10 h-10 bg-slate-950/40 hover:bg-black/60 border border-white/20 rounded-xl flex items-center justify-center active:scale-95 transition shadow-lg"
        >
          <img src="/loa.png" alt="Sound" className="w-5 h-5 object-contain" />
        </button>
      </div>
    </div>
  );
}
