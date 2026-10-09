export default function Header({
  team,
  playerName,
  isMyTurn,
  gameState,
  turnTimeLeft,
  onOpenSettings,
  onSurrender,
}) {
  const isRed = team === "red";

  return (
    <header className="w-full bg-slate-950/90 border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-xl backdrop-blur-md z-30 select-none">
      {/* Thông tin Phe & Người chơi */}
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-lg border-2 ${
            isRed
              ? "bg-rose-600/90 border-rose-400 shadow-rose-950/50"
              : "bg-blue-600/90 border-blue-400 shadow-blue-950/50"
          }`}
        >
          {isRed ? "🔴" : "🔵"}
        </div>
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-slate-100 uppercase tracking-wider">
              {playerName || "Phượt Thủ"}
            </span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                isRed
                  ? "bg-rose-950/60 text-rose-300 border-rose-800"
                  : "bg-blue-950/60 text-blue-300 border-blue-800"
              }`}
            >
              ĐỘI {isRed ? "ĐỎ" : "XANH"}
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400">
            {gameState === "SETUP"
              ? "Giai đoạn giăng bẫy xếp quán"
              : gameState === "PLAYING"
                ? isMyTurn
                  ? "🎯 ĐẾN LƯỢT BẠN BẮN!"
                  : "🛡️ ĐỐI THỦ ĐANG NGẮM..."
                : "TỔNG KẾT TRẬN ĐẤU"}
          </span>
        </div>
      </div>

      {/* Cụm Giữa: Tên Game & Đếm Ngược Lượt Đi */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex flex-col items-center">
          <h1 className="text-sm font-black text-amber-400 tracking-widest uppercase drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]">
            SĂN QUÁN HẺM
          </h1>
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
            Tactical Alley Arena
          </span>
        </div>

        {gameState === "PLAYING" && (
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-lg transition-all ${
              isMyTurn
                ? "bg-amber-500/10 border-amber-500/50 text-amber-300 animate-pulse"
                : "bg-slate-900/80 border-slate-800 text-slate-400"
            }`}
          >
            <span className="text-xs font-black tracking-wider uppercase">
              {isMyTurn ? "⏱️ LƯỢT BẠN" : "⏳ LƯỢT ĐỊCH"}
            </span>
            <span
              className={`font-mono text-sm font-black px-2 py-0.5 rounded ${
                turnTimeLeft <= 5
                  ? "bg-rose-600 text-white animate-ping"
                  : "bg-slate-950 text-amber-400 border border-amber-500/30"
              }`}
            >
              {turnTimeLeft}s
            </span>
          </div>
        )}
      </div>

      {/* Cụm Nút Thao Tác Trận Đấu */}
      <div className="flex items-center gap-2">
        {gameState === "PLAYING" && (
          <button
            type="button"
            onClick={onSurrender}
            className="bg-rose-950/70 hover:bg-rose-900 border border-rose-700/60 text-rose-200 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow active:scale-95 transition backdrop-blur-md flex items-center gap-1"
            title="Xin đầu hàng"
          >
            <span>🏳️</span>
            <span className="hidden md:inline">Đầu hàng</span>
          </button>
        )}
        <button
          type="button"
          onClick={onOpenSettings}
          className="bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 w-9 h-9 rounded-xl flex items-center justify-center shadow active:scale-95 transition"
          title="Cài đặt âm thanh"
        >
          ⚙️
        </button>
      </div>
    </header>
  );
}
