import { useState } from "react";
import { SHOPS } from "../constants/game";

export default function BottomPanel({
  gameState,
  selectedShop,
  onSelectShop,
  orientation,
  onRotate,
  onResetBoard,
  myBoard,
  onConfirmPlaceShop,
  isPreviewValid,
  onReady,
  onSendChat,
  messages = [],
}) {
  const [chatInput, setChatInput] = useState("");

  const handleSend = (e) => {
    e.preventDefault();
    if (chatInput.trim()) {
      onSendChat(chatInput.trim());
      setChatInput("");
    }
  };

  const isSetup = gameState === "SETUP";
  const currentShopObj = SHOPS.find((s) => s.id === selectedShop) || SHOPS[0];

  // Kiểm tra số lượng quán đã đặt
  const placedShopIds = new Set(myBoard.filter(Boolean).map((c) => c.shopId));
  const isAllPlaced = SHOPS.every((s) => placedShopIds.has(s.id));

  return (
    <div className="w-full max-w-md bg-slate-900 p-3 border-t border-slate-800 flex flex-col gap-2 rounded-b-2xl">
      {isSetup && (
        <div className="flex flex-col gap-2">
          {/* Thanh Chọn Quán Tinh Gọn (Chỉ hiện Icon + Badge Số Ô) */}
          <div className="flex gap-2 justify-center items-center bg-slate-950 p-2 rounded-xl border border-slate-800">
            {SHOPS.map((shop) => {
              const isPlaced = placedShopIds.has(shop.id);
              const isSelected = selectedShop === shop.id;

              return (
                <button
                  key={shop.id}
                  onClick={() => onSelectShop(shop.id)}
                  className={`relative w-12 h-12 rounded-xl p-1 flex items-center justify-center transition border-2 ${
                    isSelected
                      ? "bg-amber-500/20 border-amber-400 scale-105 shadow-md shadow-amber-500/20"
                      : isPlaced
                        ? "bg-slate-900 border-emerald-600/60 opacity-80"
                        : "bg-slate-900 border-slate-700 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={shop.icon}
                    alt={shop.name}
                    className="w-full h-full object-contain"
                  />

                  {/* Badge hiển thị độ dài quán */}
                  <span className="absolute -bottom-1 -right-1 bg-slate-950 text-amber-400 border border-slate-700 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    {shop.size}ô
                  </span>

                  {/* Icon Check đã đặt */}
                  {isPlaced && (
                    <span className="absolute -top-1 -left-1 bg-emerald-500 text-slate-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}

            <div className="h-8 w-[1px] bg-slate-800 mx-1" />

            {/* Nút Xoay Ngang / Dọc */}
            <button
              onClick={onRotate}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-3 py-2.5 rounded-xl shadow active:scale-95 transition flex items-center gap-1"
            >
              🔄 {orientation === "HORIZONTAL" ? "NGANG" : "DỌC"}
            </button>

            {/* Nút Đặt Lại */}
            <button
              onClick={onResetBoard}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs p-2.5 rounded-xl active:scale-95 transition"
            >
              ↩️
            </button>
          </div>

          {/* Nút ĐẶT QUÁN NÀY / SẮN SÀNG */}
          {!isAllPlaced ? (
            <button
              onClick={onConfirmPlaceShop}
              disabled={!isPreviewValid}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black py-3 rounded-xl shadow-lg active:scale-95 transition text-xs uppercase tracking-wider"
            >
              📌 ĐẶT {currentShopObj.name.toUpperCase()}
            </button>
          ) : (
            <button
              onClick={onReady}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white font-black py-3.5 rounded-xl shadow-lg active:scale-95 transition text-sm uppercase tracking-wider animate-pulse"
            >
              🚀 SẴN SÀNG VÀO TRẬN!
            </button>
          )}
        </div>
      )}

      {/* Frame Chat Log */}
      <div className="bg-slate-950 rounded-xl p-2 h-16 flex flex-col justify-between border border-slate-800">
        <div className="overflow-y-auto flex-1 text-[11px] flex flex-col gap-1 pr-1">
          {Array.isArray(messages) &&
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={
                  msg.sender === "Hệ thống"
                    ? "text-slate-400 italic"
                    : "text-blue-400"
                }
              >
                <b>{msg.sender}:</b> {msg.text}
              </div>
            ))}
        </div>

        <form onSubmit={handleSend} className="flex gap-1 mt-1">
          <input
            type="text"
            placeholder="Gửi tin nhắn..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-yellow-500"
          />
          <button
            type="submit"
            className="bg-amber-500 hover:bg-yellow-400 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs"
          >
            Gửi
          </button>
        </form>
      </div>
    </div>
  );
}
