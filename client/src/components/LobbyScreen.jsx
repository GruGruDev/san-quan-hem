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

  // Ép kích thước nhỏ hơn chút trên mobile (w-9 h-9) để vừa 1 hàng
  const headerBtnClass =
    "w-9 h-9 md:w-11 md:h-11 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/50 rounded-xl flex items-center justify-center text-slate-300 hover:text-amber-400 shadow-md active:scale-95 transition-all backdrop-blur-sm shrink-0";

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-y-auto bg-slate-950 select-none font-sans">
      {/* BACKGROUND */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: `url('/bg.png')` }}
      >
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/50 to-slate-950" />
      </div>

      {/* HEADER */}
      <header className="relative z-10 w-full max-w-6xl mx-auto p-3 md:p-8 pt-5 md:pt-6 flex justify-between items-start shrink-0 gap-1">
        {/* CỘT TRÁI: Cài đặt */}
        <div className="flex justify-start shrink-0">
          <button
            onClick={onOpenSettings}
            className={headerBtnClass}
            title="Cài Đặt"
          >
            <img
              src="/loa.png"
              alt="Sound"
              className="w-5 h-5 md:w-6 md:h-6 object-contain opacity-80"
            />
          </button>
        </div>

        {/* CỘT GIỮA: LOGO & TITLE */}
        <div className="text-center flex flex-col items-center relative shrink-0">
          <div className="absolute -top-4 -right-1 md:-top-5 md:-right-6 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[8px] md:text-[10px] font-black px-2 py-0.5 rounded-sm uppercase tracking-widest rotate-3 shadow-[2px_2px_0_rgba(0,0,0,0.5)] border border-amber-200/50 z-10 whitespace-nowrap">
            Góc Phố Ăn Vặt
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-white tracking-tight whitespace-nowrap drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
            SĂN QUÁN HẺM
          </h1>
        </div>

        {/* CỘT PHẢI: NÚT CHỨC NĂNG (Dùng flex-nowrap để cấm rớt dòng) */}
        <div className="flex gap-1 md:gap-2 items-center flex-nowrap justify-end shrink-0">
          <button
            onClick={onOpenTutorial}
            className={`${headerBtnClass} !w-auto px-2 md:px-3 border-emerald-700/50 bg-emerald-950/30 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/50`}
            title="Huấn Luyện Tân Thủ"
          >
            <span className="text-sm md:text-base">🎓</span>
            <span className="hidden lg:inline ml-1.5 text-xs font-bold uppercase tracking-wider">
              Huấn Luyện
            </span>
          </button>
          <button
            onClick={onOpenDonate}
            className={headerBtnClass}
            title="Cửa hàng & Nạp"
          >
            <span className="text-sm md:text-base">🛍️</span>
          </button>
          <button
            onClick={onOpenLeaderboard}
            className={headerBtnClass}
            title="Bảng Xếp Hạng"
          >
            <span className="text-sm md:text-base">🏆</span>
          </button>
          <button
            onClick={onOpenGuide}
            className={headerBtnClass}
            title="Hướng Dẫn"
          >
            <span className="text-sm md:text-base">📖</span>
          </button>
        </div>
      </header>

      {/* THÔNG BÁO TỪ SERVER */}
      {announcement && (
        <div className="relative z-10 max-w-4xl mx-auto w-full px-4 mb-2 mt-2 md:mt-0">
          <div
            role="status"
            className="border-l-4 border-amber-500 bg-slate-900/90 backdrop-blur-md p-3 rounded-r-xl text-left text-xs font-medium text-slate-200 shadow-lg"
          >
            <span className="animate-pulse mr-1">🔔</span> {announcement}
          </div>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-10 my-auto">
        {/* === CỘT TRÁI (BANNER & PROFILE) === */}
        <div className="w-full lg:w-1/2 flex flex-col gap-4 max-w-md lg:max-w-none">
          {/* BANNER ĐẠI CHIẾN */}
          <div className="w-full bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center gap-3">
            <div className="w-20 h-20 relative flex items-center justify-center">
              <img
                src="/khungvang.png"
                className="absolute inset-0 w-full h-full object-contain opacity-80"
                alt="Khung"
              />
              <img
                src="/cavienchien.png"
                className="w-12 h-12 object-contain z-10 drop-shadow-lg"
                alt="Icon"
              />
            </div>

            <h2 className="text-xl md:text-2xl font-black text-amber-400 tracking-wide uppercase drop-shadow">
              Đại Chiến Ăn Vặt
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium px-4">
              Thưởng thức ly trà sữa, đĩa cá viên chiên và cùng đồng đội giăng
              bẫy đối thủ trên địa bàn!
            </p>
          </div>

          {/* PROFILE / AUTH (Đã Fix: Cho 2 nút dàn hàng ngang đều nhau trên mobile) */}
          {currentUser ? (
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-3 md:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between shadow-xl gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center text-2xl shadow-inner shrink-0">
                  {userRank.icon}
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <div className="flex items-center gap-1">
                    <span
                      className="text-sm font-black text-white tracking-wide truncate"
                      title={currentUser.displayName}
                    >
                      {currentUser.displayName}
                    </span>
                    {currentUser.isDonor && (
                      <span
                        className="text-amber-400 shrink-0"
                        title="Người ủng hộ"
                      >
                        ✨
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider drop-shadow-md truncate ${userRank.color}`}
                  >
                    {userRank.title} ({userWins} Thắng)
                  </span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={onOpenCommunity}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-indigo-950/50 hover:bg-indigo-900 border border-indigo-500/30 text-indigo-300 font-bold rounded-xl text-[10px] uppercase tracking-wider active:scale-95 transition whitespace-nowrap text-center"
                >
                  👥 Bạn Bè
                </button>
                <button
                  onClick={onLogout}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-rose-950/50 hover:bg-rose-900 border border-rose-500/30 text-rose-300 font-bold rounded-xl text-[10px] uppercase tracking-wider active:scale-95 transition whitespace-nowrap text-center"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="w-full py-4 bg-slate-900/80 backdrop-blur-md hover:bg-slate-800 border border-slate-700/50 text-amber-400 font-bold rounded-2xl text-sm tracking-wide shadow-xl transition active:scale-95 flex items-center justify-center gap-2"
            >
              <span>🔑</span> Đăng nhập / Đăng ký tài khoản
            </button>
          )}
        </div>

        {/* === CỘT PHẢI (CHỌN MODE & MATCHMAKING) === */}
        <div className="w-full lg:w-1/2 flex flex-col max-w-md lg:max-w-none">
          <form
            onSubmit={handleSubmit}
            className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5 md:p-6 shadow-2xl flex flex-col gap-4"
          >
            <h3 className="text-sm font-black text-amber-400 tracking-widest uppercase text-center border-b border-slate-800 pb-3">
              🎮 Chọn chế độ thực chiến
            </h3>

            {/* Lỗi kết nối */}
            {connectionError && (
              <p className="rounded-xl border border-rose-800/50 bg-rose-950/80 px-3 py-2.5 text-center text-xs font-semibold text-rose-100 shadow-inner">
                {connectionError}
              </p>
            )}

            {/* Khung nhập tên khách */}
            {!currentUser && (
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Hoặc nhập tên chơi nhanh..."
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  maxLength={15}
                  className="w-full px-5 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-center text-white font-bold text-sm focus:border-amber-500 focus:outline-none placeholder-slate-600 shadow-inner transition"
                />
              </div>
            )}

            {/* CHỌN MODE */}
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-950 p-1.5 shadow-inner">
              <button
                type="button"
                onClick={() => setSelectedMode("1v1")}
                className={`rounded-lg py-3 md:py-4 transition-all flex flex-col items-center gap-1 ${
                  selectedMode === "1v1"
                    ? "bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                <span className="text-sm md:text-base font-black uppercase tracking-wider">
                  ⚔️ 1V1 Đơn đấu
                </span>
                <span
                  className={`text-[10px] font-bold ${selectedMode === "1v1" ? "text-amber-900" : "opacity-60"}`}
                >
                  Bàn 8×8 (3 Quán)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMode("2v2")}
                className={`rounded-lg py-3 md:py-4 transition-all flex flex-col items-center gap-1 ${
                  selectedMode === "2v2"
                    ? "bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                <span className="text-sm md:text-base font-black uppercase tracking-wider">
                  👥 2V2 Đồng đội
                </span>
                <span
                  className={`text-[10px] font-bold ${selectedMode === "2v2" ? "text-amber-900" : "opacity-60"}`}
                >
                  Bàn 12×12 (4 Quán)
                </span>
              </button>
            </div>

            {/* NÚT TÌM TRẬN CHÍNH */}
            <button
              type="submit"
              className="w-full h-14 md:h-16 mt-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-slate-950 font-black text-lg md:text-xl uppercase tracking-widest shadow-[0_6px_20px_rgba(245,158,11,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span className="text-2xl drop-shadow-md">🛵</span>
              VÀO HẺM SĂN GÀ
            </button>

            {/* NÚT PHÒNG KÍN */}
            <button
              type="button"
              onClick={onOpenPrivateRoom}
              className="w-full py-3.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-500 font-bold rounded-xl text-xs uppercase tracking-wider shadow-inner transition active:scale-95 flex items-center justify-center gap-2"
            >
              <span>🔑</span> Tạo phòng / Nhập mã hẻm kín
            </button>
          </form>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full p-4 flex justify-center shrink-0">
        <div className="flex items-center gap-2 text-[9px] md:text-[10px] text-slate-500 font-bold tracking-widest uppercase bg-slate-900/80 backdrop-blur-md px-5 py-2 rounded-full border border-slate-800 shadow-md">
          <span>☕ Tactical Alley Arena</span>
          <span>•</span>
          <span>{APP_VERSION}</span>
        </div>
      </footer>
    </div>
  );
}
