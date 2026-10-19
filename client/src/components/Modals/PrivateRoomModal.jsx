import { useState } from "react";
import RoomRoster from "../RoomRoster";

export default function PrivateRoomModal({
  isOpen,
  onClose,
  onCreateRoom,
  onJoinRoom,
  onCancelWaiting,
  roomLobby,
  currentSocketId,
  onChangeMode,
  onSwapTeams,
  onAddBot,
  onKickPlayer,
  onHostStart,
}) {
  const [inputCode, setInputCode] = useState("");
  const [selectedMode, setSelectedMode] = useState("1v1");
  const [copyNotice, setCopyNotice] = useState("");

  if (!isOpen) return null;

  const isHost = roomLobby?.hostSocketId === currentSocketId;
  const players = roomLobby?.players || [];

  // --- LOGIC MỚI: TÍNH TOÁN SỐ NGƯỜI CHÍNH XÁC MỖI ĐỘI ---
  const maxPerTeam = roomLobby?.mode === "2v2" ? 2 : 1;
  const redCount = players.filter((p) => p.team === "red").length;
  const blueCount = players.filter((p) => p.team === "blue").length;

  // Nút Bắt Đầu chỉ sáng khi cả 2 đội đều ĐỦ NGƯỜI
  const canStart = redCount === maxPerTeam && blueCount === maxPerTeam;

  return (
    <div className="absolute inset-0 z-[110] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="w-full max-w-[360px] bg-slate-900 border border-slate-700/80 rounded-[28px] p-5 md:p-6 shadow-2xl flex flex-col gap-5 relative text-center">
        {/* Nút Đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full font-bold flex items-center justify-center transition active:scale-95 z-10"
        >
          ✕
        </button>

        {/* Tiêu đề */}
        <div className="mt-2">
          <div className="inline-block bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[10px] font-black px-3 py-1 rounded-sm uppercase tracking-widest shadow-sm mb-2 rotate-1">
            Góc Kèo Riêng
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-widest uppercase drop-shadow-md">
            🔑 PHÒNG KÍN HẺM
          </h2>
        </div>

        {/* --- NẾU ĐÃ VÀO PHÒNG LOBBY --- */}
        {roomLobby ? (
          <div className="flex flex-col items-center gap-4 animate-fade-in w-full">
            {/* Box Mã Phòng */}
            {roomLobby.roomCode && (
              <div className="flex flex-col items-center w-full gap-1">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Mã Phòng Kín
                </span>
                <div className="flex items-center gap-3 bg-slate-950 border border-amber-500/50 rounded-xl px-4 py-2 shadow-inner w-3/4 max-w-[200px] justify-center relative group">
                  <span className="text-2xl font-black tracking-[0.2em] text-amber-400 drop-shadow-md">
                    {roomLobby.roomCode}
                  </span>
                  <button
                    type="button"
                    title="Sao chép mã phòng"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(roomLobby.roomCode);
                        setCopyNotice("✅ Đã chép!");
                        setTimeout(() => setCopyNotice(""), 2000);
                      } catch {
                        setCopyNotice("❌ Lỗi!");
                      }
                    }}
                    className="absolute -right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg flex items-center justify-center text-sm shadow-md active:scale-95 transition opacity-80 group-hover:opacity-100"
                  >
                    📄
                  </button>
                </div>
                {/* Thông báo copy */}
                <div className="h-4">
                  {copyNotice && (
                    <span className="text-[10px] font-bold text-emerald-400 animate-fade-in">
                      {copyNotice}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Chủ phòng đổi Mode */}
            {isHost && (
              <div className="grid w-full grid-cols-2 gap-1.5 rounded-xl border border-slate-800 bg-slate-950 p-1.5 shadow-inner">
                {["1v1", "2v2"].map((matchMode) => (
                  <button
                    key={matchMode}
                    type="button"
                    aria-pressed={roomLobby.mode === matchMode}
                    onClick={() => {
                      setSelectedMode(matchMode);
                      onChangeMode(matchMode);
                    }}
                    className={`rounded-lg py-2 text-[11px] font-black uppercase tracking-wider transition ${roomLobby.mode === matchMode ? "bg-amber-500 text-slate-950 shadow-md" : "text-slate-400 hover:bg-slate-900 hover:text-slate-300"}`}
                  >
                    {matchMode} · {matchMode === "2v2" ? "12×12" : "8×8"}
                  </button>
                ))}
              </div>
            )}

            {/* Khung chứa danh sách người chơi */}
            <div className="w-full bg-slate-950/50 rounded-2xl p-2 border border-slate-800/80">
              <RoomRoster
                players={players}
                currentSocketId={currentSocketId}
                hostSocketId={roomLobby.hostSocketId}
                mode={roomLobby.mode}
                canSwap={roomLobby.gameState === "WAITING_FRIEND"}
                onSwapTeams={onSwapTeams}
              />

              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2 border-t border-slate-800 pt-2 text-center">
                {players.length}/{roomLobby.playerCount} Người ·
                <span
                  className={
                    canStart
                      ? "text-emerald-400"
                      : "text-amber-400 animate-pulse"
                  }
                >
                  {canStart ? " Đã sẵn sàng" : " Đang chờ..."}
                </span>
              </div>
            </div>

            {/* --- KHU VỰC QUYỀN CHỦ PHÒNG --- */}
            {isHost ? (
              <div className="flex flex-col gap-3 w-full border-t border-slate-800/80 pt-4 relative">
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-slate-900 px-3 text-[9px] font-black text-amber-500 uppercase tracking-widest border border-slate-800 rounded-full">
                  👑 Quyền Chủ Phòng
                </span>

                {/* --- ĐÃ FIX LỖI THÊM BOT --- */}
                {/* Chỉ hiện khu vực Bot nếu có ít nhất 1 đội chưa đầy */}
                {(redCount < maxPerTeam || blueCount < maxPerTeam) && (
                  <div className="flex gap-2">
                    {/* Chỉ hiện nút Thêm Bot Đỏ nếu Đội Đỏ chưa đầy */}
                    {redCount < maxPerTeam ? (
                      <button
                        onClick={() => onAddBot("red")}
                        className="flex-1 py-2 bg-rose-950/40 border border-rose-900/50 text-rose-400 text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-rose-900/80 transition active:scale-95 shadow-sm"
                      >
                        + Bot Đỏ
                      </button>
                    ) : (
                      <div className="flex-1" />
                    )}

                    {/* Chỉ hiện nút Thêm Bot Xanh nếu Đội Xanh chưa đầy */}
                    {blueCount < maxPerTeam ? (
                      <button
                        onClick={() => onAddBot("blue")}
                        className="flex-1 py-2 bg-sky-950/40 border border-sky-900/50 text-sky-400 text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-sky-900/80 transition active:scale-95 shadow-sm"
                      >
                        + Bot Xanh
                      </button>
                    ) : (
                      <div className="flex-1" />
                    )}
                  </div>
                )}

                {/* Quản lý & Kick */}
                {players.length > 1 && (
                  <div className="flex flex-col gap-1 max-h-[80px] overflow-y-auto pr-1">
                    {players
                      .filter((p) => p.socketId !== currentSocketId)
                      .map((p) => (
                        <div
                          key={p.socketId}
                          className="flex justify-between items-center bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 shadow-inner"
                        >
                          <span className="text-[11px] text-slate-200 truncate max-w-[120px] font-bold">
                            {p.name}
                          </span>
                          <button
                            onClick={() => onKickPlayer(p.socketId)}
                            className="text-[9px] text-rose-300 font-black uppercase tracking-wider bg-rose-950 hover:bg-rose-900 px-3 py-1.5 rounded-lg border border-rose-800 transition active:scale-95"
                          >
                            Kick
                          </button>
                        </div>
                      ))}
                  </div>
                )}

                {/* Bắt Đầu Trận Đấu */}
                <button
                  onClick={onHostStart}
                  disabled={!canStart}
                  className={`w-full py-3.5 font-black rounded-xl text-xs md:text-sm uppercase tracking-widest shadow-lg transition-all mt-1 ${canStart ? "bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-slate-950 animate-pulse active:scale-95" : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-70"}`}
                >
                  🚀 BẮT ĐẦU TRẬN ĐẤU
                </button>
              </div>
            ) : (
              /* Dành cho người chơi thường */
              <div className="text-[11px] font-black text-amber-400 uppercase tracking-widest animate-pulse mt-2 bg-slate-950 py-3 rounded-xl border border-amber-900/30 w-full shadow-inner">
                ⏳ Đang chờ Chủ phòng...
              </div>
            )}

            {/* Nút rời phòng */}
            <button
              onClick={onCancelWaiting}
              className="w-full py-3 bg-slate-800/50 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-800 text-slate-400 hover:text-rose-400 font-bold uppercase tracking-wider rounded-xl text-[11px] active:scale-95 transition-all mt-1"
            >
              🚪 RỜI PHÒNG
            </button>
          </div>
        ) : (
          /* --- NẾU CHƯA VÀO PHÒNG (KHUNG CHỌN TẠO / NHẬP) --- */
          <div className="flex flex-col gap-5">
            {/* Tạo phòng mới */}
            <div className="flex flex-col gap-2 p-3 bg-slate-950/50 border border-slate-800 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Tùy chọn tạo phòng
              </span>
              <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-800 bg-slate-950 p-1.5 shadow-inner">
                {["1v1", "2v2"].map((matchMode) => (
                  <button
                    key={matchMode}
                    type="button"
                    aria-pressed={selectedMode === matchMode}
                    onClick={() => setSelectedMode(matchMode)}
                    className={`rounded-lg py-2 text-[11px] font-black uppercase tracking-wider transition ${selectedMode === matchMode ? "bg-amber-500 text-slate-950 shadow-sm" : "text-slate-400 hover:bg-slate-900 hover:text-slate-300"}`}
                  >
                    {matchMode} · {matchMode === "2v2" ? "12×12" : "8×8"}
                  </button>
                ))}
              </div>
              <button
                onClick={() => onCreateRoom(selectedMode)}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-slate-950 font-black rounded-xl text-xs uppercase tracking-widest shadow-lg active:scale-95 transition mt-1"
              >
                🏠 TẠO MÃ HẺM MỚI
              </button>
            </div>

            <div className="flex items-center gap-3 opacity-60">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                HOẶC NHẬP MÃ
              </span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>

            {/* Nhập mã có sẵn */}
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Nhập Mã (VD: A89X2)"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                maxLength={5}
                className="w-full px-4 py-3.5 bg-slate-950 border-2 border-slate-800 rounded-xl text-center text-white font-black tracking-[0.3em] text-sm focus:border-indigo-500 focus:outline-none uppercase placeholder-slate-600 transition shadow-inner"
              />
              <button
                onClick={() => {
                  if (inputCode.trim()) onJoinRoom(inputCode.trim());
                }}
                disabled={!inputCode.trim()}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:bg-slate-800 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-lg active:scale-95 transition"
              >
                🚀 VÀO HẺM NGAY
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
