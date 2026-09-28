import { useState } from "react";

export default function PrivateRoomModal({
  isOpen,
  onClose,
  onCreateRoom,
  onJoinRoom,
  roomCodeCreated,
  onCancelWaiting,
}) {
  const [inputCode, setInputCode] = useState("");

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
          <div className="inline-block bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-widest shadow mb-1">
            Góc Kèo Riêng
          </div>
          <h2 className="text-xl font-black text-amber-300 tracking-wider uppercase drop-shadow">
            🔑 PHÒNG KÍN HẺM PhỐ
          </h2>
        </div>

        {/* Nếu đang chờ bạn bè vào bằng mã đã tạo */}
        {roomCodeCreated ? (
          <div className="flex flex-col items-center gap-3 py-2 animate-fade-in">
            <span className="text-xs text-amber-100 font-medium">
              Mã Hẻm của bạn là:
            </span>
            <div className="bg-slate-950 border-2 border-amber-400 px-6 py-3 rounded-2xl text-2xl font-black text-amber-300 tracking-widest shadow-inner flex items-center gap-2">
              <span>{roomCodeCreated}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(roomCodeCreated);
                  alert("Đã sao chép Mã Hẻm!");
                }}
                className="text-xs bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 px-2 py-1 rounded-lg border border-amber-500/40 ml-2"
              >
                📋 Cùng chép
              </button>
            </div>
            <p className="text-[11px] text-slate-400 font-medium animate-pulse">
              ⏳ Đang chờ bạn bè nhập mã để vào...
            </p>
            <button
              onClick={onCancelWaiting}
              className="px-4 py-2 bg-rose-950/60 border border-rose-800/60 text-rose-300 font-bold rounded-xl text-xs active:scale-95 transition mt-2"
            >
              HỦY TẠO PHÒNG
            </button>
          </div>
        ) : (
          /* Khung chọn Tạo hoặc Vào phòng */
          <div className="flex flex-col gap-4">
            {/* Nút Tạo Mã Hẻm Mới */}
            <button
              onClick={onCreateRoom}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg active:scale-95 transition flex items-center justify-center gap-2"
            >
              🏠 TẠO MÃ HẺM MỚI (RỦ BẠN BÈ)
            </button>

            <div className="flex items-center gap-2 my-1">
              <div className="flex-1 h-[1px] bg-slate-800" />
              <span className="text-[10px] text-slate-500 font-black uppercase">
                HOẶC
              </span>
              <div className="flex-1 h-[1px] bg-slate-800" />
            </div>

            {/* Form Nhập Mã Hẻm Có Sẵn */}
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Nhập Mã Hẻm (ví dụ: A89X2)..."
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                maxLength={6}
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
