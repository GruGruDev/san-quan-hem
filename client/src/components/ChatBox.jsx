import { useEffect, useRef, useState } from "react";
import { filterBadWords } from "../constants/game";

export default function ChatBox({
  onSendChat,
  messages = [],
  showChatToggle = false,
}) {
  const [chatInput, setChatInput] = useState("");
  const [chatType, setChatType] = useState("ALL");
  const [isExpanded, setIsExpanded] = useState(false);
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

  return (
    <div className="w-full bg-slate-900/95 border-t border-slate-800/80 p-2 shrink-0 z-30">
      <div className="max-w-md md:max-w-2xl mx-auto flex flex-col gap-1.5">
        {/* Toggle Xem tin nhắn */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between text-[10px] font-bold text-slate-400 px-1 py-0.5 cursor-pointer"
        >
          <span>💬 Nhật ký trận đấu ({messages.length})</span>
          <span className="text-amber-400">
            {isExpanded ? "▼ Thu gọn" : "▲ Mở rộng"}
          </span>
        </button>

        {/* Khung xem tin nhắn (Hiện khi bấm Mở rộng) */}
        {isExpanded && (
          <div className="overflow-y-auto max-h-28 text-xs flex flex-col gap-1 p-2 bg-slate-950 rounded-xl border border-slate-800 shadow-inner">
            {Array.isArray(messages) &&
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`leading-relaxed text-[11px] ${
                    msg.sender === "Hệ thống"
                      ? "text-amber-400/90 italic font-medium"
                      : msg.type === "TEAM"
                        ? "text-emerald-300"
                        : "text-slate-200"
                  }`}
                >
                  {msg.type === "TEAM" && (
                    <span className="text-[8px] font-black mr-1 bg-emerald-950 border border-emerald-800 px-1 rounded text-emerald-400">
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
                  <span className="break-words font-medium">
                    {typeof filterBadWords === "function"
                      ? filterBadWords(msg.text)
                      : msg.text}
                  </span>
                </div>
              ))}
            <div ref={chatEndRef} />
          </div>
        )}

        {/* Ô Nhập Tin Nhắn (Luôn nằm cố định ở đáy) */}
        <form onSubmit={handleSend} className="flex gap-1.5">
          {showChatToggle && (
            <button
              type="button"
              onClick={() =>
                setChatType((prev) => (prev === "ALL" ? "TEAM" : "ALL"))
              }
              className={`shrink-0 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition border cursor-pointer ${
                chatType === "TEAM"
                  ? "bg-emerald-950 border-emerald-700 text-emerald-400"
                  : "bg-slate-800 border-slate-600 text-slate-300"
              }`}
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
            className="bg-amber-500 hover:bg-yellow-400 active:scale-95 text-slate-950 font-black px-4 py-1.5 rounded-xl text-xs uppercase tracking-wider transition shrink-0 cursor-pointer"
          >
            GỬI
          </button>
        </form>
      </div>
    </div>
  );
}
