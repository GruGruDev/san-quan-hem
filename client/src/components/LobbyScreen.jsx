import { useState } from "react";
import { APP_VERSION, getPlayerRank } from "../constants/game";

export default function LobbyScreen({
  onFindMatch,
  onOpenSettings,
  onOpenGuide,
  onOpenLeaderboard,
  onOpenAuth,
  currentUser,
  onLogout,
}) {
  const [nameInput, setNameInput] = useState("");

  const userWins = currentUser?.wins || 0;
  const userRank = getPlayerRank(userWins);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Ưu tiên tên hiển thị tài khoản đã đăng nhập, nếu chưa có thì lấy tên nhập từ form
    const finalName =
      currentUser?.displayName || nameInput.trim() || "Phượt Thủ Hẻm";
    onFindMatch(finalName);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-2 select-none font-sans">
      {/* Khung Mô Phỏng Màn Hình Mobile */}
      <div className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border-4 border-amber-900/60 flex flex-col h-[850px] max-h-screen relative">
        {/* HÌNH NỀN BG COZY VIỆT NAM (/bg.png) */}
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url('/bg.png')` }}
        >
          {/* Lớp Overlay phủ màu ánh đèn vàng cozy về đêm */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-amber-950/40 to-slate-950/90 backdrop-blur-[1px]" />
        </div>

        {/* HEADER BAR */}
        <div className="relative z-10 p-4 flex justify-between items-center px-4 pt-5">
          {/* Nút Cài Đặt */}
          <button
            onClick={onOpenSettings}
            className="w-10 h-10 bg-slate-900/80 hover:bg-amber-900/60 border border-amber-500/40 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition backdrop-blur-md group"
            title="Cài Đặt"
          >
            <img
              src="/loa.png"
              alt="Sound"
              className="w-5 h-5 object-contain group-hover:rotate-12 transition"
            />
          </button>

          {/* Logo Bảng Hiệu */}
          <div className="text-center flex flex-col items-center">
            <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest shadow mb-0.5">
              Góc Phố Ăn Vặt
            </div>
            <h1 className="text-xl font-black text-amber-300 tracking-wider uppercase drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)]">
              SĂN QUÁN HẺM
            </h1>
          </div>

          {/* Cụm Nút BXH + Hướng Dẫn */}
          <div className="flex gap-1.5">
            <button
              onClick={onOpenLeaderboard}
              className="w-10 h-10 bg-slate-900/80 hover:bg-amber-900/60 border border-amber-500/40 rounded-2xl flex items-center justify-center text-amber-300 font-black text-base shadow-lg active:scale-95 transition backdrop-blur-md"
              title="Bảng Xếp Hạng"
            >
              🏆
            </button>
            <button
              onClick={onOpenGuide}
              className="w-10 h-10 bg-slate-900/80 hover:bg-amber-900/60 border border-amber-500/40 rounded-2xl flex items-center justify-center text-amber-300 font-black text-base shadow-lg active:scale-95 transition backdrop-blur-md"
              title="Hướng Dẫn"
            >
              📖
            </button>
          </div>
        </div>

        {/* NỘI DUNG SẢNH CHỜ */}
        <div className="relative z-10 flex-1 p-5 flex flex-col items-center justify-between text-center">
          {/* Bảng Đèn Cổ Động Trận Đấu */}
          <div className="w-full bg-slate-900/80 border border-amber-500/30 rounded-3xl p-4 backdrop-blur-md shadow-2xl flex flex-col items-center gap-2 mt-1">
            <div className="w-20 h-20 relative flex items-center justify-center">
              <img
                src="/khungvang.png"
                className="absolute inset-0 w-full h-full object-contain animate-spin"
                style={{ animationDuration: "12s" }}
                alt="Khung"
              />
              <img
                src="/cavienchien.png"
                className="w-12 h-12 object-contain animate-bounce z-10"
                alt="Icon"
              />
            </div>

            <h2 className="text-xl font-black text-amber-200 tracking-wide uppercase">
              ĐẠI CHIẾN ĂN VẶT
            </h2>
            <p className="text-xs text-amber-100/70 leading-relaxed max-w-[260px] font-medium">
              Thưởng thức ly trà sữa, đĩa cá viên chiên và sẵn sàng giăng bẫy
              đối thủ trong hẻm nhỏ!
            </p>
          </div>

          {/* KHU VỰC THÔNG TIN TÀI KHOẢN HOẶC ĐĂNG NHẬP */}
          <div className="w-full max-w-xs flex flex-col gap-3 my-auto">
            {currentUser ? (
              <div className="bg-slate-950/80 border-2 border-amber-500/40 rounded-2xl p-3 flex items-center justify-between backdrop-blur-md shadow-lg">
                <div className="flex items-center gap-2.5">
                  {/* Icon Rank Hẻm */}
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shadow-inner">
                    {userRank.icon}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-black text-amber-100">
                      {currentUser.displayName}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider ${userRank.color}`}
                    >
                      {userRank.title} ({userWins} Thắng)
                    </span>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="text-[11px] text-rose-400 font-bold hover:underline px-2 py-1 bg-rose-950/40 rounded-lg border border-rose-800/40"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="w-full py-3 bg-slate-900/90 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg backdrop-blur-md transition active:scale-95 flex items-center justify-center gap-2"
              >
                <span>🔑</span> ĐĂNG NHẬP / ĐĂNG KÝ
              </button>
            )}

            {/* FORM TÌM TRẬN */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {!currentUser && (
                <div className="relative w-full">
                  <input
                    type="text"
                    placeholder="Hoặc nhập tên chơi nhanh..."
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    maxLength={15}
                    className="w-full px-5 py-3 bg-slate-950/80 border-2 border-amber-500/40 rounded-2xl text-center text-amber-100 font-bold text-xs focus:border-amber-400 focus:bg-slate-950 focus:outline-none placeholder-amber-200/40 shadow-inner backdrop-blur-md transition"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
                    ✍️
                  </span>
                </div>
              )}

              {/* Nút Bắt Đầu Tìm Trận */}
              <button
                type="submit"
                className="group relative w-full h-14 rounded-2xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 p-0.5 shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95 transition-all duration-200"
              >
                <div className="w-full h-full bg-slate-950/20 rounded-[14px] flex items-center justify-center gap-2 group-hover:bg-transparent transition">
                  <span className="text-xl">🛵</span>
                  <span className="font-black text-base text-slate-950 tracking-wider uppercase drop-shadow">
                    VÀO HẺM SĂN GÀ
                  </span>
                </div>
              </button>
            </form>
          </div>

          {/* FOOTER HIỂN THỊ VERSION */}
          <div className="flex items-center gap-2 text-[10px] text-amber-200/50 font-bold tracking-widest uppercase bg-slate-950/60 px-3 py-1 rounded-full border border-amber-500/10 backdrop-blur-sm">
            <span>☕ COZY STREET VIBE</span>
            <span>•</span>
            <span>{APP_VERSION}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
