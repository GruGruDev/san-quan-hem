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
    <div className="relative flex min-h-dvh w-full flex-col overflow-y-auto bg-[#1a120b] select-none font-sans">
      {/* BACKGROUND */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: `url('/bg.png')` }}
      >
        {/* Overlay ấm, ít lạnh */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a120b]/80 via-[#2a1a0f]/55 to-[#1a120b]/92" />
      </div>

      {/* HEADER */}
      <header className="relative z-10 w-full max-w-6xl mx-auto p-4 md:px-8 pt-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSettings}
            className="w-11 h-11 bg-[#23180f] hover:bg-[#2e2116] border border-[#8b5a2b]/70 rounded-lg flex items-center justify-center shadow-[2px_2px_0_rgba(0,0,0,0.35)] active:translate-y-0.5 active:shadow-none transition group"
            title="Cài Đặt"
          >
            <img
              src="/loa.png"
              alt="Sound"
              className="w-6 h-6 object-contain group-hover:rotate-12 transition"
            />
          </button>

          <div className="hidden sm:flex flex-col text-left">
            <span className="text-[10px] font-bold text-[#c9a227] uppercase tracking-wide">
              Góc Phố Ăn Vặt
            </span>
            <span className="text-xs font-semibold text-[#c4a574]">
              Săn Quán Hẻm Việt Nam
            </span>
          </div>
        </div>

        {/* LOGO */}
        <div className="text-center flex flex-col items-center">
          <div className="bg-[#c9a227] text-[#1a120b] text-[9px] font-bold px-2.5 py-0.5 rounded-sm uppercase tracking-wide mb-1">
            Góc Phố Ăn Vặt
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#f5e6c8] tracking-tight">
            SĂN QUÁN HẺM
          </h1>
        </div>

        {/* NÚT CHỨC NĂNG */}
        <div className="flex gap-2 items-center">
          <button
            onClick={onOpenTutorial}
            className="h-11 px-3 bg-[#1f3d2a] hover:bg-[#254a33] border border-[#3d7a52]/70 rounded-lg flex items-center gap-1.5 text-[#a7f3d0] font-bold text-xs shadow-[2px_2px_0_rgba(0,0,0,0.35)] active:translate-y-0.5 active:shadow-none transition"
            title="Huấn Luyện Tân Thủ"
          >
            <span className="text-base">🎓</span>
            <span className="hidden md:inline">Huấn Luyện</span>
          </button>
          <button
            onClick={onOpenDonate}
            className="w-11 h-11 bg-[#1a2e33] hover:bg-[#223840] border border-[#3d6b73]/70 rounded-lg flex items-center justify-center text-cyan-200 text-base shadow-[2px_2px_0_rgba(0,0,0,0.35)] active:translate-y-0.5 active:shadow-none transition"
            title="Cửa hàng & Nạp Hẻm Coin"
          >
            🛍️
          </button>
          <button
            onClick={onOpenLeaderboard}
            className="w-11 h-11 bg-[#23180f] hover:bg-[#2e2116] border border-[#8b5a2b]/70 rounded-lg flex items-center justify-center text-[#c9a227] text-base shadow-[2px_2px_0_rgba(0,0,0,0.35)] active:translate-y-0.5 active:shadow-none transition"
            title="Bảng Xếp Hạng"
          >
            🏆
          </button>
          <button
            onClick={onOpenGuide}
            className="w-11 h-11 bg-[#23180f] hover:bg-[#2e2116] border border-[#8b5a2b]/70 rounded-lg flex items-center justify-center text-[#c9a227] text-base shadow-[2px_2px_0_rgba(0,0,0,0.35)] active:translate-y-0.5 active:shadow-none transition"
            title="Hướng Dẫn"
          >
            📖
          </button>
        </div>
      </header>

      {/* THÔNG BÁO */}
      {announcement && (
        <div className="relative z-10 max-w-4xl mx-auto w-full px-4 my-2">
          <div
            role="status"
            className="border-l-4 border-[#c9a227] bg-[#23180f]/95 p-3 rounded-r-lg text-left text-xs font-semibold text-[#f5e6c8] shadow-[2px_2px_0_rgba(0,0,0,0.3)]"
          >
            🔔 {announcement}
          </div>
        </div>
      )}

      {/* MAIN */}
      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10 my-auto">
        {/* CỘT TRÁI */}
        <div className="w-full md:w-1/2 flex flex-col gap-4 max-w-md md:max-w-none">
          {/* BANNER */}
          <div className="w-full bg-[#23180f]/95 border border-[#8b5a2b]/60 rounded-xl p-5 shadow-[3px_3px_0_rgba(0,0,0,0.4)] flex flex-col items-center text-center gap-3">
            <div className="w-24 h-24 relative flex items-center justify-center">
              <img
                src="/khungvang.png"
                className="absolute inset-0 w-full h-full object-contain opacity-90"
                alt="Khung"
              />
              <img
                src="/cavienchien.png"
                className="w-14 h-14 object-contain z-10"
                alt="Icon"
              />
            </div>

            <h2 className="text-xl md:text-2xl font-black text-[#f5e6c8] tracking-tight">
              ĐẠI CHIẾN ĂN VẶT
            </h2>
            <p className="text-xs md:text-sm text-[#c4a574] leading-relaxed">
              Thưởng thức ly trà sữa, đĩa cá viên chiên và cùng đồng đội giăng
              bẫy đối thủ trên địa bàn!
            </p>
          </div>

          {/* PROFILE / AUTH */}
          {currentUser ? (
            <div className="bg-[#23180f]/95 border border-[#8b5a2b]/60 rounded-xl p-4 flex items-center justify-between shadow-[3px_3px_0_rgba(0,0,0,0.35)]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[#3d2b1a] border border-[#8b5a2b]/50 flex items-center justify-center text-2xl">
                  {userRank.icon}
                </div>
                <div className="flex flex-col text-left">
                  <span className="flex items-center gap-1.5 text-sm font-bold text-[#f5e6c8]">
                    {currentUser.displayName}
                    {currentUser.isDonor && (
                      <span
                        className="text-[#c9a227]"
                        title="Người ủng hộ Săn Quán Hẻm"
                      >
                        ✨
                      </span>
                    )}
                  </span>
                  <span
                    className={`text-xs font-bold uppercase tracking-wide ${userRank.color}`}
                  >
                    {userRank.title} ({userWins} Thắng)
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onOpenCommunity}
                  className="px-3 py-2 bg-[#1a2a3a] border border-[#3d5a73]/60 hover:bg-[#223548] text-blue-200 font-semibold rounded-lg text-xs active:translate-y-0.5 transition"
                >
                  👥 Bạn Bè
                </button>
                <button
                  onClick={onLogout}
                  className="px-3 py-2 bg-[#3a1a1a] border border-[#7a3d3d]/60 hover:bg-[#4a2222] text-rose-300 font-semibold rounded-lg text-xs active:translate-y-0.5 transition"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="w-full py-3.5 bg-[#23180f] hover:bg-[#2e2116] border border-[#8b5a2b]/70 text-[#c9a227] font-bold rounded-xl text-sm tracking-wide shadow-[3px_3px_0_rgba(0,0,0,0.35)] transition active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-2"
            >
              <span>🔑</span> Đăng nhập / Đăng ký tài khoản
            </button>
          )}
        </div>

        {/* CỘT PHẢI */}
        <div className="w-full md:w-1/2 flex flex-col gap-4 max-w-md md:max-w-none">
          <form
            onSubmit={handleSubmit}
            className="bg-[#23180f]/95 border border-[#8b5a2b]/60 rounded-xl p-5 shadow-[3px_3px_0_rgba(0,0,0,0.4)] flex flex-col gap-4"
          >
            <h3 className="text-sm font-bold text-[#c9a227] tracking-wide text-center border-b border-[#3d2b1a] pb-2">
              🎮 Chọn chế độ thực chiến
            </h3>

            {connectionError && (
              <p className="rounded-lg border border-rose-700/50 bg-[#3a1a1a]/90 px-3 py-2 text-center text-xs font-semibold text-rose-200">
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
                  className="w-full px-5 py-3.5 bg-[#1a120b] border border-[#8b5a2b]/60 rounded-lg text-center text-[#f5e6c8] font-semibold text-sm focus:border-[#c9a227] focus:outline-none placeholder-[#8b7355] shadow-inner transition"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm opacity-70">
                  ✍️
                </span>
              </div>
            )}

            {/* CHỌN MODE */}
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-[#8b5a2b]/40 bg-[#1a120b] p-1.5">
              <button
                type="button"
                aria-pressed={selectedMode === "1v1"}
                onClick={() => setSelectedMode("1v1")}
                className={`rounded-md py-3 text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                  selectedMode === "1v1"
                    ? "bg-[#e85d04] text-[#1a120b] shadow-[2px_2px_0_#9a3412]"
                    : "text-[#c4a574] hover:bg-[#2a1f15] hover:text-[#f5e6c8]"
                }`}
              >
                <span className="text-sm">⚔️ 1V1 Đơn đấu</span>
                <span className="text-[10px] opacity-80">Bàn 8×8 (3 Quán)</span>
              </button>

              <button
                type="button"
                aria-pressed={selectedMode === "2v2"}
                onClick={() => setSelectedMode("2v2")}
                className={`rounded-md py-3 text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                  selectedMode === "2v2"
                    ? "bg-[#e85d04] text-[#1a120b] shadow-[2px_2px_0_#9a3412]"
                    : "text-[#c4a574] hover:bg-[#2a1f15] hover:text-[#f5e6c8]"
                }`}
              >
                <span className="text-sm">👥 2V2 Đồng đội</span>
                <span className="text-[10px] opacity-80">
                  Bàn 12×12 (4 Quán)
                </span>
              </button>
            </div>

            {/* NÚT CHÍNH */}
            <button
              type="submit"
              className="w-full h-14 rounded-lg bg-[#e85d04] hover:bg-[#f48c06] text-[#1a120b] font-black text-lg tracking-wide shadow-[0_4px_0_#9a3412] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2"
            >
              <span className="text-xl">🛵</span>
              <span>VÀO HẺM SĂN GÀ</span>
            </button>

            {/* NÚT PHÒNG KÍN */}
            <button
              type="button"
              onClick={onOpenPrivateRoom}
              className="w-full py-3.5 bg-[#1a120b] hover:bg-[#2a1f15] border border-[#8b5a2b]/50 text-[#c9a227] font-bold rounded-lg text-xs tracking-wide shadow-[2px_2px_0_rgba(0,0,0,0.3)] transition active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-2"
            >
              <span>🔑</span> Tạo phòng / Nhập mã hẻm kín
            </button>
          </form>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 w-full p-4 flex justify-center shrink-0">
        <div className="flex items-center gap-2 text-[10px] text-[#8b7355] font-semibold tracking-wide uppercase bg-[#23180f]/90 px-4 py-1.5 rounded-full border border-[#8b5a2b]/30 shadow-[1px_1px_0_rgba(0,0,0,0.3)]">
          <span>☕ Cozy Street Vibe</span>
          <span>•</span>
          <span>{APP_VERSION}</span>
        </div>
      </footer>
    </div>
  );
}
