import { useEffect, useRef, useState } from "react";
import { SHOPS as DEFAULT_SHOPS, filterBadWords } from "../constants/game";

export default function BottomPanel({
  gameState,
  selectedShop,
  onSelectShop,
  rotation = 0,
  onRotate,
  onResetBoard,
  myBoard,
  onConfirmPlaceShop,
  isPreviewValid,
  onReady,
  onSendChat,
  messages = [],
  shops = DEFAULT_SHOPS,
  showChatToggle = false,
}) {
  const [chatInput, setChatInput] = useState("");
  const [chatType, setChatType] = useState("ALL");
  const chatEndRef = useRef(null);

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
      onSendChat(cleanText, chatType);
      setChatInput("");
    }
  };

  const isSetup = gameState === "SETUP";
  const currentShopObj = shops.find((s) => s.id === selectedShop) || shops[0];
  const placedShopIds = new Set(myBoard.filter(Boolean).map((c) => c.shopId));
  const isAllPlaced = shops.every((s) => placedShopIds.has(s.id));
  const rotationDegrees = ["0°", "90°", "180°", "270°"];

  return (
    <div className="w-full flex-1 flex flex-col justify-between p-3 gap-3 bg-slate-950/80 border-t border-slate-800/80 select-none">
      {/* BẢNG ĐIỀU KHIỂN ĐẶT QUÁN (CHỈ HIỆN KHI SETUP) */}
      {isSetup && (
        <div className="flex flex-col gap-2.5 bg-slate-900/90 p-3 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider">
              📦 Kho Quán Ăn ({placedShopIds.size}/{shops.length})
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={onRotate}
                className="bg-indigo-600/90 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs px-2.5 py-1.5 rounded-xl shadow border border-indigo-400/40 transition flex items-center gap-1"
              >
                🔄 Xoay ({rotationDegrees[rotation % 4]})
              </button>
              <button
                type="button"
                onClick={onResetBoard}
                className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-xs px-2.5 py-1.5 rounded-xl border border-slate-700 transition"
                title="Đặt lại từ đầu"
              >
                ↩️
              </button>
            </div>
          </div>

          {/* Danh Sách Lựa Chọn Quán */}
          <div className="grid grid-cols-4 gap-2">
            {shops.map((shop) => {
              const isPlaced = placedShopIds.has(shop.id);
              const isSelected = selectedShop === shop.id;

              return (
                <button
                  key={shop.id}
                  type="button"
                  onClick={() => onSelectShop(shop.id)}
                  className={`relative aspect-square rounded-xl p-1.5 flex flex-col items-center justify-center transition border-2 ${
                    isSelected
                      ? "bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20 scale-105"
                      : isPlaced
                        ? "bg-slate-950/60 border-emerald-600/40 opacity-50"
                        : "bg-slate-950 border-slate-800 opacity-80 hover:opacity-100 hover:border-slate-600"
                  }`}
                >
                  <img
                    src={shop.icon}
                    alt={shop.name}
                    className="w-full h-full object-contain pointer-events-none"
                  />
                  <span className="absolute -bottom-1 -right-1 bg-slate-950 text-amber-400 border border-slate-700 text-[9px] font-black px-1.5 py-0.2 rounded-full">
                    {shop.size} ô
                  </span>
                  {isPlaced && (
                    <span className="absolute -top-1 -left-1 bg-emerald-500 text-slate-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Nút Chốt Vị Trí / Sẵn Sàng */}
          {!isAllPlaced ? (
            <button
              type="button"
              onClick={onConfirmPlaceShop}
              disabled={!isPreviewValid}
              className="w-full bg-linear-to-r from-amber-500 to-yellow-500 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black py-2.5 rounded-xl shadow-lg active:scale-95 transition text-xs uppercase tracking-wider mt-1"
            >
              📌 Đặt {currentShopObj.name.toUpperCase()} Cố Định
            </button>
          ) : (
            <button
              type="button"
              onClick={onReady}
              className="w-full bg-linear-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white font-black py-3 rounded-xl shadow-lg active:scale-95 transition text-xs uppercase tracking-wider animate-pulse mt-1"
            >
              🚀 SẴN SÀNG VÀO TRẬN!
            </button>
          )}
        </div>
      )}

      {/* KHUNG NHẬT KÝ VÀ KÊNH CHAT */}
      <div className="flex-1 bg-slate-900/90 rounded-2xl p-2.5 flex flex-col justify-between border border-slate-800/80 shadow-inner min-h-35">
        <div className="overflow-y-auto flex-1 text-xs flex flex-col gap-1.5 pr-1 max-h-36">
          {Array.isArray(messages) &&
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`leading-relaxed ${msg.sender === "Hệ thống" ? "text-amber-400/90 italic font-medium" : msg.type === "TEAM" ? "text-emerald-300" : "text-slate-200"}`}
              >
                {msg.type === "TEAM" && (
                  <span className="text-[9px] font-black mr-1 bg-emerald-950 border border-emerald-800 px-1 py-0.2 rounded text-emerald-400">
                    [ĐỘI]
                  </span>
                )}
                <b
                  className={
                    msg.type === "TEAM"
                      ? "text-emerald-400 font-black"
                      : "text-amber-400 font-black"
                  }
                >
                  {msg.sender}:
                </b>{" "}
                <span className="wrap-break-words font-medium">
                  {typeof filterBadWords === "function"
                    ? filterBadWords(msg.text)
                    : msg.text}
                </span>
              </div>
            ))}
          <div ref={chatEndRef} />
        </div>

        <form
          onSubmit={handleSend}
          className="flex gap-1.5 mt-2 pt-2 border-t border-slate-800/60"
        >
          {showChatToggle && (
            <button
              type="button"
              onClick={() =>
                setChatType((prev) => (prev === "ALL" ? "TEAM" : "ALL"))
              }
              className={`shrink-0 px-2 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition active:scale-95 border ${chatType === "TEAM" ? "bg-emerald-950 border-emerald-700 text-emerald-400" : "bg-slate-800 border-slate-600 text-slate-300"}`}
            >
              {chatType === "TEAM" ? "🏠 Đội" : "🌍 All"}
            </button>
          )}
          <input
            type="text"
            placeholder={
              chatType === "TEAM" ? "Chat với đồng đội..." : "Gửi tin nhắn..."
            }
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            maxLength={60}
            className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition"
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
