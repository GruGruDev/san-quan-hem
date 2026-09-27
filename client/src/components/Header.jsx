export default function Header({
  team,
  playerName,
  isMyTurn,
  gameState,
  turnTimeLeft,
  onOpenSettings,
}) {
  const isRed = team === "red";

  return (
    <div
      className={`w-full max-w-md p-3 text-center shadow-lg z-10 border-b-2 flex justify-between items-center px-4 rounded-t-2xl transition-all duration-500 ${
        isRed
          ? "bg-gradient-to-r from-red-600 via-amber-500 to-red-600 border-red-700"
          : "bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 border-blue-700"
      }`}
    >
      <button
        onClick={onOpenSettings}
        className="w-10 h-10 bg-black/20 hover:bg-black/40 rounded-xl flex items-center justify-center active:scale-95 transition"
      >
        <img src="/loa.png" alt="Sound" className="w-6 h-6 object-contain" />
      </button>

      <div>
        <h1 className="text-xl font-black text-slate-950 tracking-wider uppercase drop-shadow">
          SĂN QUÁN HẺM
        </h1>

        {/* ĐỒNG HỒ ĐẾM NGƯỢC 15S */}
        <p className="text-[11px] text-slate-950 font-black uppercase tracking-tight flex items-center justify-center gap-1">
          {gameState === "SETUP" &&
            `🔴 ĐỘI ${isRed ? "ĐỎ" : "XANH"} (${playerName || "BẠN"}): ĐẶT QUÁN`}
          {gameState === "PLAYING" && (
            <>
              <span>
                {isMyTurn ? "💥 LƯỢT BẠN BẮN!" : "🛡️ LƯỢT ĐỐI THỦ BẮN!"}
              </span>
              <span
                className={`px-1.5 py-0.2 rounded font-mono text-xs ${turnTimeLeft <= 5 ? "bg-red-600 text-white animate-ping" : "bg-black/30 text-yellow-300"}`}
              >
                ⏱️ {turnTimeLeft}s
              </span>
            </>
          )}
          {gameState === "FINISHED" && "🏆 TỔNG KẾT TRẬN ĐẤU"}
        </p>
      </div>

      <div className="w-10 h-10 flex items-center justify-center font-black text-xl">
        {isRed ? "🔴" : "🔵"}
      </div>
    </div>
  );
}
