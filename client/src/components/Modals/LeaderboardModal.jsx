import { useEffect, useState } from "react";
import { getPlayerRank } from "../../constants/game";
import { apiUrl } from "../../utils/api";

export default function LeaderboardModal({ isOpen, onClose }) {
  const [tab, setTab] = useState("ALL_TIME"); // ALL_TIME | WEEKLY
  const [leaderboardState, setLeaderboardState] = useState({
    tab: null,
    data: [],
    error: false,
  });
  const loading = leaderboardState.tab !== tab;
  const leaderboardData = loading ? [] : leaderboardState.data;

  // Fetch dữ liệu BXH khi mở Modal hoặc đổi tab
  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    const period = tab === "WEEKLY" ? "?period=week" : "";
    fetch(apiUrl(`/api/leaderboard${period}`), { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Leaderboard request failed");
        return res.json();
      })
      .then((data) => {
        setLeaderboardState({
          tab,
          data: Array.isArray(data) ? data : [],
          error: false,
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLeaderboardState({ tab, data: [], error: true });
        }
      });

    return () => controller.abort();
  }, [isOpen, tab]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="w-full max-w-sm bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 relative">
        {/* Nút Đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-slate-800 hover:bg-slate-700 text-amber-200 rounded-full font-bold flex items-center justify-center border border-amber-500/30 transition active:scale-95"
        >
          ✕
        </button>

        {/* Tiêu đề Modal */}
        <div className="text-center mt-1">
          <div className="inline-block bg-linear-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-widest shadow mb-1">
            Bảng Vàng Hẻm Realtime
          </div>
          <h2 className="text-xl font-black text-amber-300 tracking-wider uppercase drop-shadow">
            🏆 CAO THỦ SĂN QUÁN
          </h2>
        </div>

        {/* Tab Chuyển Đổi */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
          <button
            onClick={() => setTab("ALL_TIME")}
            className={`flex-1 py-1.5 text-xs font-black rounded-lg transition ${
              tab === "ALL_TIME"
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-amber-200"
            }`}
          >
            🔥 Bảng Cao Thủ
          </button>
          <button
            onClick={() => setTab("WEEKLY")}
            className={`flex-1 py-1.5 text-xs font-black rounded-lg transition ${
              tab === "WEEKLY"
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-amber-200"
            }`}
          >
            ⭐ Đua Top Tuần
          </button>
        </div>

        {/* Danh Sách BXH */}
        <div className="flex flex-col gap-2 min-h-65 max-h-85 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center my-auto text-amber-300 gap-2 py-10">
              <span className="animate-spin text-2xl">⏳</span>
              <span className="text-xs font-bold">
                Đang tải danh sách cao thủ...
              </span>
            </div>
          ) : leaderboardData.length === 0 ? (
            <div className="flex flex-col items-center justify-center my-auto text-slate-400 text-xs font-bold gap-1 py-10">
              {leaderboardState.error ? (
                <span>Không tải được bảng xếp hạng. Vui lòng thử lại.</span>
              ) : (
                <>
                  <span>🛵 Chưa có dữ liệu cao thủ!</span>
                  <span className="text-[10px] opacity-70">
                    Hãy là người đầu tiên thắng trận!
                  </span>
                </>
              )}
            </div>
          ) : (
            leaderboardData.map((item, index) => {
              const isTop1 = index === 0;
              const isTop2 = index === 1;
              const isTop3 = index === 2;

              const wins = item.wins || 0;
              const matches = item.matches || 0;
              const winRate =
                matches > 0 ? ((wins / matches) * 100).toFixed(1) + "%" : "0%";

              const rankInfo = getPlayerRank(wins);

              return (
                <div
                  key={item._id || item.id || index}
                  className={`flex items-center justify-between p-2.5 rounded-2xl border transition ${
                    isTop1
                      ? "bg-linear-to-r from-amber-500/20 via-yellow-500/10 to-transparent border-yellow-400/60 shadow-lg shadow-yellow-500/10"
                      : isTop2
                        ? "bg-slate-800/80 border-slate-400/40"
                        : isTop3
                          ? "bg-slate-800/60 border-amber-800/40"
                          : "bg-slate-950/60 border-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Badge Huy chương / Thứ hạng */}
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        isTop1
                          ? "bg-yellow-400 text-slate-950 shadow-md shadow-yellow-500/50"
                          : isTop2
                            ? "bg-slate-300 text-slate-950"
                            : isTop3
                              ? "bg-amber-700 text-amber-100"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {isTop1
                        ? "🥇"
                        : isTop2
                          ? "🥈"
                          : isTop3
                            ? "🥉"
                            : `#${index + 1}`}
                    </div>

                    {/* Tên & Học vị Rank Hẻm */}
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-black text-amber-100 tracking-wide flex items-center gap-1">
                        {item.displayName || item.name || "Phượt Thủ"}
                        <span className="text-xs">{rankInfo.icon}</span>
                      </span>
                      <span
                        className={`text-[10px] font-bold ${rankInfo.color}`}
                      >
                        {rankInfo.title}
                      </span>
                    </div>
                  </div>

                  {/* Thống kê trận thắng & tỷ lệ thắng */}
                  <div className="text-right shrink-0">
                    <div className="text-xs font-black text-emerald-400">
                      {wins}{" "}
                      <span className="text-[10px] text-slate-400 font-normal">
                        thắng
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold">
                      Tỉ lệ: <span className="text-amber-300">{winRate}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Nút Đóng */}
        <button
          onClick={onClose}
          className="w-full bg-slate-800 hover:bg-slate-700 text-amber-200 font-bold py-2.5 rounded-xl border border-amber-500/20 text-xs transition active:scale-95 mt-1"
        >
          ĐÓNG
        </button>
      </div>
    </div>
  );
}
