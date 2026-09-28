import { useEffect, useRef, useState } from "react";
import { SHOPS, filterBadWords } from "../constants/game";

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
  const chatEndRef = useRef(null);

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (chatInput.trim()) {
      const cleanText =
        typeof filterBadWords === "function"
          ? filterBadWords(chatInput.trim())
          : chatInput.trim();
      onSendChat(cleanText);
      setChatInput("");
    }
  };

  const isSetup = gameState === "SETUP";
  const currentShopObj = SHOPS.find((s) => s.id === selectedShop) || SHOPS[0];

  // Kiểm tra số lượng quán đã đặt
  const placedShopIds = new Set(myBoard.filter(Boolean).map((c) => c.shopId));
  const isAllPlaced = SHOPS.every((s) => placedShopIds.has(s.id));

  return (
    <div className="w-full max-w-md bg-slate-900 p-3 border-t border-slate-800 flex flex-col gap-2.5 rounded-b-2xl">
      {isSetup && (
        <div className="flex flex-col gap-2">
          {/* Thanh Chọn Quán Tinh Gọn */}
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

      {/* Frame Chat Log (Mở rộng h-28 và tự cuộn trượt) */}
      <div className="bg-slate-950 rounded-2xl p-2.5 h-28 flex flex-col justify-between border border-slate-800 shadow-inner">
        <div className="overflow-y-auto flex-1 text-[12px] flex flex-col gap-1.5 pr-1 font-sans">
          {Array.isArray(messages) &&
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={
                  msg.sender === "Hệ thống"
                    ? "text-slate-400 italic font-medium leading-relaxed"
                    : "text-slate-200 leading-relaxed"
                }
              >
                <b className="text-amber-400 font-black">{msg.sender}:</b>{" "}
                <span className="break-all font-medium">
                  {typeof filterBadWords === "function"
                    ? filterBadWords(msg.text)
                    : msg.text}
                </span>
              </div>
            ))}
          {/* Thẻ neo tự động cuộn đến tin nhắn mới nhất */}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSend} className="flex gap-1.5 mt-1.5">
          <input
            type="text"
            placeholder="Gửi tin nhắn khịa..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            maxLength={50}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
          />
          <button
            type="submit"
            className="bg-amber-500 hover:bg-yellow-400 active:scale-95 text-slate-950 font-black px-3.5 py-1.5 rounded-xl text-xs uppercase tracking-wider transition shrink-0"
          >
            Gửi
          </button>
        </form>
      </div>
    </div>
  );
}
