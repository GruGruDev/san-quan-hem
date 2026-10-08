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
  onOpenTutorial, // THÊM PROP NÀY CHO NÚT HUẤN LUYỆN
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
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-slate-950 select-none font-sans">
      <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
        {/* HÌNH NỀN BG COZY VIỆT NAM */}
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url('/bg.png')` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-amber-950/40 to-slate-950/90 backdrop-blur-[1px]" />
        </div>

        {/* HEADER BAR */}
        <div className="relative z-10 p-4 flex justify-between items-center px-4 pt-5">
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

          <div className="text-center flex flex-col items-center">
            <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest shadow mb-0.5">
              Góc Phố Ăn Vặt
            </div>
            <h1 className="text-xl font-black text-amber-300 tracking-wider uppercase drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)]">
              SĂN QUÁN HẺM
            </h1>
          </div>

          {/* Cụm Nút Chức Năng Mở Rộng */}
          <div className="flex gap-1.5 flex-wrap justify-end max-w-[100px]">
            <button
              onClick={onOpenTutorial}
              className="w-10 h-10 bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-500/50 rounded-2xl flex items-center justify-center text-emerald-300 font-black text-base shadow-lg active:scale-95 transition backdrop-blur-md animate-pulse"
              title="Huấn Luyện Tân Thủ"
            >
              🎓
            </button>
            <button
              onClick={onOpenDonate}
              className="w-10 h-10 bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-500/50 rounded-2xl flex items-center justify-center text-cyan-200 font-black text-base shadow-lg active:scale-95 transition backdrop-blur-md"
              title="Cửa hàng & nạp Hẻm Coin"
            >
              🛍️
            </button>
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

        {announcement && (
          <div
            role="status"
            className="relative z-10 mx-4 border-l-2 border-amber-300 bg-slate-950/85 px-3 py-2 text-left text-xs font-bold text-amber-100 shadow-lg"
          >
            {announcement}
          </div>
        )}

        {/* NỘI DUNG SẢNH CHỜ */}
        <div className="relative z-10 flex-1 p-5 flex flex-col items-center justify-between text-center">
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
            <p className="text-xs text-amber-100/70 leading-relaxed max-w-65 font-medium">
              Thưởng thức ly trà sữa, đĩa cá viên chiên và sẵn sàng giăng bẫy
              đối thủ trong hẻm nhỏ!
            </p>
          </div>

          <div className="w-full max-w-xs flex flex-col gap-3 my-auto">
            {currentUser ? (
              <div className="bg-slate-950/80 border-2 border-amber-500/40 rounded-2xl p-3 flex items-center justify-between backdrop-blur-md shadow-lg">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shadow-inner">
                    {userRank.icon}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="flex items-center gap-1 text-xs font-black text-amber-100">
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

            {currentUser && (
              <button
                type="button"
                onClick={onOpenCommunity}
                className="w-full border border-amber-500/40 bg-slate-950/80 px-3 py-2.5 text-xs font-black text-amber-200 transition hover:bg-amber-950/60 rounded-xl"
              >
                👥 HỒ SƠ · BẠN BÈ · LỊCH SỬ
              </button>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
              {connectionError && (
                <p className="rounded-lg border border-rose-500/30 bg-rose-950/70 px-3 py-2 text-[10px] font-bold text-rose-200">
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
                    className="w-full px-5 py-3 bg-slate-950/80 border-2 border-amber-500/40 rounded-2xl text-center text-amber-100 font-bold text-xs focus:border-amber-400 focus:bg-slate-950 focus:outline-none placeholder-amber-200/40 shadow-inner backdrop-blur-md transition"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
                    ✍️
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 rounded-xl border border-amber-500/20 bg-slate-950/80 p-1">
                {["1v1", "2v2"].map((matchMode) => (
                  <button
                    key={matchMode}
                    type="button"
                    aria-pressed={selectedMode === matchMode}
                    onClick={() => setSelectedMode(matchMode)}
                    className={`rounded-lg py-2 text-[11px] font-black transition ${selectedMode === matchMode ? "bg-amber-400 text-slate-950" : "text-slate-300 hover:bg-slate-800"}`}
                  >
                    {matchMode} · {matchMode === "2v2" ? "12×12" : "8×8"}
                  </button>
                ))}
              </div>

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

              <button
                type="button"
                onClick={onOpenPrivateRoom}
                className="w-full py-2.5 bg-slate-900/90 hover:bg-slate-800 border border-amber-500/30 text-amber-300 font-black rounded-xl text-xs uppercase tracking-wider shadow backdrop-blur-md transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>🔑</span> TẠO PHÒNG / NHẬP MÃ HẺM
              </button>
            </form>
          </div>

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
