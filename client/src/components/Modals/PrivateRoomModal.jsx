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
}) {
  const [inputCode, setInputCode] = useState("");
  const [selectedMode, setSelectedMode] = useState("1v1");
  const [copyNotice, setCopyNotice] = useState("");

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="w-full max-w-sm bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 relative text-center">
        {/* Nút Đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-slate-800 hover:bg-slate-700 text-amber-200 rounded-full font-bold flex items-center justify-center border border-amber-500/30 transition active:scale-95"
        >
          ✕
        </button>

        {/* Tiêu đề */}
        <div className="mt-1">
          <div className="inline-block bg-linear-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-widest shadow mb-1">
            Góc Kèo Riêng
          </div>
          <h2 className="text-xl font-black text-amber-300 tracking-wider uppercase drop-shadow">
            🔑 PHÒNG KÍN HẺM PhỐ
          </h2>
        </div>

        {/* Nếu đang chờ bạn bè vào bằng mã đã tạo */}
        {roomLobby ? (
          <div className="flex flex-col items-center gap-3 py-2 animate-fade-in">
            {roomLobby.roomCode && (
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs text-amber-100 font-medium">
                  Mã phòng
                </span>
                <div className="flex items-center gap-2 rounded-xl border-2 border-amber-400 bg-slate-950 px-4 py-2 text-xl font-black tracking-widest text-amber-300">
                  <span>{roomLobby.roomCode}</span>
                  <button
                    type="button"
                    title="Sao chép mã phòng"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(roomLobby.roomCode);
                        setCopyNotice("Đã sao chép mã phòng.");
                      } catch {
                        setCopyNotice("Không thể sao chép trên thiết bị này.");
                      }
                    }}
                    className="rounded-md bg-amber-500/20 px-2 py-1 text-xs text-amber-200"
                  >
                    📋
                  </button>
                </div>
                {copyNotice && (
                  <span className="text-[10px] text-emerald-300">
                    {copyNotice}
                  </span>
                )}
              </div>
            )}

            {roomLobby.hostSocketId === currentSocketId && (
              <div className="grid w-full grid-cols-2 gap-1 rounded-lg border border-slate-700 bg-slate-950 p-1">
                {["1v1", "2v2"].map((matchMode) => (
                  <button
                    key={matchMode}
                    type="button"
                    aria-pressed={roomLobby.mode === matchMode}
                    onClick={() => {
                      setSelectedMode(matchMode);
                      onChangeMode(matchMode);
                    }}
                    className={`rounded-md py-2 text-[10px] font-black ${roomLobby.mode === matchMode ? "bg-amber-400 text-slate-950" : "text-slate-300"}`}
                  >
                    {matchMode} · {matchMode === "2v2" ? "10×10" : "8×8"}
                  </button>
                ))}
              </div>
            )}

            <RoomRoster
              players={roomLobby.players}
              currentSocketId={currentSocketId}
              hostSocketId={roomLobby.hostSocketId}
              mode={roomLobby.mode}
              canSwap={roomLobby.gameState === "WAITING_FRIEND"}
              onSwapTeams={onSwapTeams}
            />
            <p className="text-[11px] text-slate-400 font-medium">
              {roomLobby.players?.length || 0}/{roomLobby.playerCount} người ·
              {roomLobby.gameState === "WAITING_FRIEND"
                ? " đang chờ đủ đội hình"
                : " đang vào trận"}
            </p>
            <button
              onClick={onCancelWaiting}
              className="px-4 py-2 bg-rose-950/60 border border-rose-800/60 text-rose-300 font-bold rounded-xl text-xs active:scale-95 transition mt-2"
            >
              RỜI PHÒNG
            </button>
          </div>
        ) : (
          /* Khung chọn Tạo hoặc Vào phòng */
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-800 bg-slate-950 p-1">
              {["1v1", "2v2"].map((matchMode) => (
                <button
                  key={matchMode}
                  type="button"
                  aria-pressed={selectedMode === matchMode}
                  onClick={() => setSelectedMode(matchMode)}
                  className={`rounded-lg py-2 text-[10px] font-black ${selectedMode === matchMode ? "bg-amber-400 text-slate-950" : "text-slate-300"}`}
                >
                  {matchMode} · {matchMode === "2v2" ? "10×10" : "8×8"}
                </button>
              ))}
            </div>
            {/* Nút Tạo Mã Hẻm Mới */}
            <button
              onClick={() => onCreateRoom(selectedMode)}
              className="w-full py-3.5 bg-linear-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg active:scale-95 transition flex items-center justify-center gap-2"
            >
              🏠 TẠO MÃ HẺM MỚI (RỦ BẠN BÈ)
            </button>

            <div className="flex items-center gap-2 my-1">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-[10px] text-slate-500 font-black uppercase">
                HOẶC
              </span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* Form Nhập Mã Hẻm Có Sẵn */}
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Nhập Mã Hẻm (ví dụ: A89X2)..."
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                maxLength={5}
                className="w-full px-4 py-3 bg-slate-950 border-2 border-slate-800 rounded-2xl text-center text-amber-300 font-black tracking-widest text-sm focus:border-amber-400 focus:outline-none uppercase placeholder-slate-600"
              />
              <button
                onClick={() => {
                  if (inputCode.trim()) onJoinRoom(inputCode.trim());
                }}
                disabled={!inputCode.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg active:scale-95 transition"
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
