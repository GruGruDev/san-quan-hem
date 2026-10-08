import { useEffect, useState } from "react";
import { APP_VERSION, getPlayerRank } from "../constants/game";
import { apiUrl } from "../utils/api";

export default function LobbyScreen({
  onFindMatch,
  onOpenSettings,
  onOpenGuide,
  onOpenLeaderboard,
  onOpenAuth,
  onOpenDonate,
  onOpenPrivateRoom,
  onOpenCommunity,
  onOpenTutorial,
  currentUser,
  onLogout,
  connectionError,
}) {
  const [nameInput, setNameInput] = useState("");
  const [selectedMode, setSelectedMode] = useState("1v1");
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(apiUrl("/api/announcements"), { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setAnnouncement(data?.announcement || ""))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const userWins = currentUser?.wins || 0;
  const userRank = getPlayerRank(userWins);

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalName =
      currentUser?.displayName || nameInput.trim() || "Phượt Thủ Hẻm";
    onFindMatch(finalName, selectedMode);
  };

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-y-auto bg-slate-950 select-none font-sans">
      {/* BACKGROUND PHỦ FULL MÀN HÌNH PC */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-700 pointer-events-none"
        style={{ backgroundImage: `url('/bg.png')` }}
      >
        {/* Lớp Overlay phủ màu ánh đèn vàng cozy về đêm */}
        <div className="absolute inset-0 bg-linear-to-b from-slate-950/85 via-amber-950/50 to-slate-950/95 backdrop-blur-[2px]" />
      </div>

      {/* HEADER BAR CHUNG */}
      <header className="relative z-10 w-full max-w-6xl mx-auto p-4 md:px-8 pt-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSettings}
            className="w-11 h-11 bg-slate-900/80 hover:bg-amber-900/60 border border-amber-500/40 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition backdrop-blur-md group"
            title="Cài Đặt"
          >
            <img
              src="/loa.png"
              alt="Sound"
              className="w-6 h-6 object-contain group-hover:rotate-12 transition"
            />
          </button>

          <div className="hidden sm:flex flex-col text-left">
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
              Góc Phố Ăn Vặt
            </span>
            <span className="text-xs font-bold text-slate-300">
              Săn Quán Hẻm Việt Nam
            </span>
          </div>
        </div>

        {/* LOGO BẢNG HIỆU CỤM GIỮA */}
        <div className="text-center flex flex-col items-center">
          <div className="bg-linear-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 text-[9px] font-black px-3 py-0.5 rounded-full uppercase tracking-widest shadow mb-0.5">
            Góc Phố Ăn Vặt
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-amber-300 tracking-wider uppercase drop-shadow-[0_2px_12px_rgba(245,158,11,0.6)]">
            SĂN QUÁN HẺM
          </h1>
        </div>

        {/* CỤM NÚT CHỨC NĂNG BÊN PHẢI HEADER */}
        <div className="flex gap-2 items-center">
          <button
            onClick={onOpenTutorial}
            className="h-11 px-3 bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-500/50 rounded-2xl flex items-center gap-1.5 text-emerald-300 font-black text-xs uppercase shadow-lg active:scale-95 transition backdrop-blur-md animate-pulse"
            title="Huấn Luyện Tân Thủ"
          >
            <span className="text-base">🎓</span>
            <span className="hidden md:inline">Huấn Luyện</span>
          </button>
          <button
            onClick={onOpenDonate}
            className="w-11 h-11 bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-500/50 rounded-2xl flex items-center justify-center text-cyan-200 font-black text-base shadow-lg active:scale-95 transition backdrop-blur-md"
            title="Cửa hàng & Nạp Hẻm Coin"
          >
            🛍️
          </button>
          <button
            onClick={onOpenLeaderboard}
            className="w-11 h-11 bg-slate-900/80 hover:bg-amber-900/60 border border-amber-500/40 rounded-2xl flex items-center justify-center text-amber-300 font-black text-base shadow-lg active:scale-95 transition backdrop-blur-md"
            title="Bảng Xếp Hạng"
          >
            🏆
          </button>
          <button
            onClick={onOpenGuide}
            className="w-11 h-11 bg-slate-900/80 hover:bg-amber-900/60 border border-amber-500/40 rounded-2xl flex items-center justify-center text-amber-300 font-black text-base shadow-lg active:scale-95 transition backdrop-blur-md"
            title="Hướng Dẫn"
          >
            📖
          </button>
        </div>
      </header>

      {/* THÔNG BÁO GLOBAL HỆ THỐNG */}
      {announcement && (
        <div className="relative z-10 max-w-4xl mx-auto w-full px-4 my-2">
          <div
            role="status"
            className="border-l-4 border-amber-400 bg-slate-950/80 p-3 rounded-r-2xl text-left text-xs font-bold text-amber-100 shadow-xl backdrop-blur-md"
          >
            🔔 {announcement}
          </div>
        </div>
      )}

      {/* BỐ CỤC CHÍNH RESPONSIVE: MOBILE LÀ DỌC, DESKTOP CHIA 2 CỘT */}
      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 my-auto">
        {/* CỘT 1 (DESKTOP TRÁI): HERO & PROFILE CARD */}
        <div className="w-full md:w-1/2 flex flex-col gap-4 max-w-md md:max-w-none">
          {/* BANNER ĐÈN CỔ ĐỘNG */}
          <div className="w-full bg-slate-900/80 border-2 border-amber-500/30 rounded-3xl p-6 backdrop-blur-md shadow-2xl flex flex-col items-center text-center gap-3">
            <div className="w-24 h-24 relative flex items-center justify-center">
              <img
                src="/khungvang.png"
                className="absolute inset-0 w-full h-full object-contain animate-spin"
                style={{ animationDuration: "12s" }}
                alt="Khung"
              />
              <img
                src="/cavienchien.png"
                className="w-14 h-14 object-contain animate-bounce z-10"
                alt="Icon"
              />
            </div>

            <h2 className="text-2xl font-black text-amber-200 tracking-wide uppercase drop-shadow">
              ĐẠI CHIẾN ĂN VẶT 2V2
            </h2>
            <p className="text-xs md:text-sm text-amber-100/80 leading-relaxed font-medium">
              Thưởng thức ly trà sữa, đĩa cá viên chiên và cùng đồng đội giăng
              bẫy đối thủ trên bàn cờ khổng lồ 12x12!
            </p>
          </div>

          {/* CARD TÀI KHOẢN KHI ĐÃ ĐĂNG NHẬP */}
          {currentUser ? (
            <div className="bg-slate-950/80 border-2 border-amber-500/40 rounded-2xl p-4 flex items-center justify-between backdrop-blur-md shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shadow-inner">
                  {userRank.icon}
                </div>
                <div className="flex flex-col text-left">
                  <span className="flex items-center gap-1.5 text-sm font-black text-amber-100">
                    {currentUser.displayName}
                    {currentUser.isDonor && (
                      <span
                        className="animate-pulse text-amber-300 drop-shadow-[0_0_6px_rgba(253,224,71,0.9)]"
                        title="Người ủng hộ Săn Quán Hẻm"
                      >
                        ✨
                      </span>
                    )}
                  </span>
                  <span
                    className={`text-xs font-black uppercase tracking-wider ${userRank.color}`}
                  >
                    {userRank.title} ({userWins} Thắng)
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onOpenCommunity}
                  className="px-3 py-2 bg-blue-950/60 border border-blue-700/60 hover:bg-blue-900 text-blue-200 font-bold rounded-xl text-xs active:scale-95 transition"
                >
                  👥 Bạn Bè
                </button>
                <button
                  onClick={onLogout}
                  className="px-3 py-2 bg-rose-950/60 border border-rose-800/60 hover:bg-rose-900 text-rose-300 font-bold rounded-xl text-xs active:scale-95 transition"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="w-full py-4 bg-slate-900/90 hover:bg-slate-800 border-2 border-amber-500/40 text-amber-300 font-black rounded-2xl text-sm uppercase tracking-wider shadow-xl backdrop-blur-md transition active:scale-95 flex items-center justify-center gap-2"
            >
              <span>🔑</span> ĐĂNG NHẬP / ĐĂNG KÝ TÀI KHOẢN
            </button>
          )}
        </div>

        {/* CỘT 2 (DESKTOP PHẢI): BẢNG TÌM TRẬN & CHỌN CHẾ ĐỘ */}
        <div className="w-full md:w-1/2 flex flex-col gap-4 max-w-md md:max-w-none">
          <form
            onSubmit={handleSubmit}
            className="bg-slate-900/90 border-2 border-amber-500/30 rounded-3xl p-6 backdrop-blur-md shadow-2xl flex flex-col gap-4"
          >
            <h3 className="text-sm font-black text-amber-400 uppercase tracking-widest text-center border-b border-slate-800 pb-2">
              🎮 CHỌN CHẾ ĐỘ THỰC CHIẾN
            </h3>

            {connectionError && (
              <p className="rounded-xl border border-rose-500/30 bg-rose-950/80 px-3 py-2 text-center text-xs font-bold text-rose-200">
                {connectionError}
              </p>
            )}

            {!currentUser && (
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Hoặc nhập tên chơi nhanh..."
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  maxLength={15}
                  className="w-full px-5 py-3.5 bg-slate-950/90 border-2 border-amber-500/40 rounded-2xl text-center text-amber-100 font-bold text-sm focus:border-amber-400 focus:bg-slate-950 focus:outline-none placeholder-amber-200/40 shadow-inner backdrop-blur-md transition"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm">
                  ✍️
                </span>
              </div>
            )}

            {/* CỤM NÚT CHỌN CHẾ ĐỘ 1V1 HOẶC 2V2 */}
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-amber-500/30 bg-slate-950 p-1.5">
              <button
                type="button"
                aria-pressed={selectedMode === "1v1"}
                onClick={() => setSelectedMode("1v1")}
                className={`rounded-xl py-3 text-xs font-black transition-all flex flex-col items-center gap-1 ${
                  selectedMode === "1v1"
                    ? "bg-amber-400 text-slate-950 shadow-lg scale-[1.02]"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <span className="text-sm">⚔️ 1V1 ĐƠN ĐẤU</span>
                <span className="text-[10px] opacity-80">Bàn 8×8 (3 Quán)</span>
              </button>

              <button
                type="button"
                aria-pressed={selectedMode === "2v2"}
                onClick={() => setSelectedMode("2v2")}
                className={`rounded-xl py-3 text-xs font-black transition-all flex flex-col items-center gap-1 ${
                  selectedMode === "2v2"
                    ? "bg-amber-400 text-slate-950 shadow-lg scale-[1.02]"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <span className="text-sm">👥 2V2 ĐỒNG ĐỘI</span>
                <span className="text-[10px] opacity-80">
                  Bàn 12×12 (4 Quán)
                </span>
              </button>
            </div>

            {/* NÚT VÀO HẺM SĂN GÀ */}
            <button
              type="submit"
              className="group relative w-full h-16 rounded-2xl bg-linear-to-r from-amber-500 via-yellow-400 to-amber-500 p-0.5 shadow-[0_0_25px_rgba(245,158,11,0.5)] active:scale-95 transition-all duration-200 mt-1"
            >
              <div className="w-full h-full bg-slate-950/10 rounded-[14px] flex items-center justify-center gap-3 group-hover:bg-transparent transition">
                <span className="text-2xl animate-bounce">🛵</span>
                <span className="font-black text-lg text-slate-950 tracking-wider uppercase drop-shadow">
                  VÀO HẺM SĂN GÀ
                </span>
              </div>
            </button>

            {/* NÚT TẠO PHÒNG KÍN */}
            <button
              type="button"
              onClick={onOpenPrivateRoom}
              className="w-full py-3.5 bg-slate-950 hover:bg-slate-800 border-2 border-amber-500/30 text-amber-300 font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
            >
              <span>🔑</span> TẠO PHÒNG / NHẬP MÃ HẺM KÍN
            </button>
          </form>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full p-4 flex justify-center shrink-0">
        <div className="flex items-center gap-2 text-[10px] text-amber-200/60 font-bold tracking-widest uppercase bg-slate-950/80 px-4 py-1.5 rounded-full border border-amber-500/20 backdrop-blur-md shadow-lg">
          <span>☕ COZY STREET VIBE</span>
          <span>•</span>
          <span>{APP_VERSION}</span>
        </div>
      </footer>
    </div>
  );
}
