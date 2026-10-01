import { useState } from "react";

export default function ResultScreen({
  isWinner,
  gameId,
  canReport = false,
  opponents = [],
  onReport,
  winnerBoards = [],
  shops = [],
  boardSize = 8,
  onRematch,
  onLeave,
}) {
  const [selectedBoardIndex, setSelectedBoardIndex] = useState(0);
  const [reportedPlayer, setReportedPlayer] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [reportStatus, setReportStatus] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const winnerBoard = winnerBoards[selectedBoardIndex];

  const submitReport = async (event) => {
    event.preventDefault();
    if (!onReport || !gameId || !reportReason.trim()) return;
    setReportBusy(true);
    setReportStatus("");
    try {
      await onReport({ reportedPlayer, reason: reportReason.trim() });
      setReportStatus("Đã gửi báo cáo.");
      setReportReason("");
    } catch (error) {
      setReportStatus(error.message || "Không gửi được báo cáo.");
    } finally {
      setReportBusy(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-start overflow-y-auto bg-black/90 p-3 text-center animate-fade-in">
      <div className="my-auto flex w-full max-w-sm flex-col items-center py-2">
        <div className="w-24 h-24 relative flex items-center justify-center mb-4">
          <img
            src={isWinner ? "/trung.png" : "/khongtrung.png"}
            className="w-full h-full object-contain animate-bounce"
            alt="Result"
          />
        </div>

        <h2
          className={`text-3xl font-black uppercase tracking-wider ${isWinner ? "text-yellow-400" : "text-red-500"}`}
        >
          {isWinner ? "CHIẾN THẮNG!" : "THẤT BẠI!"}
        </h2>

        <p className="text-xs text-slate-300 max-w-62.5 font-medium leading-relaxed my-3">
          {isWinner
            ? "🎉 BẠN ĐÃ ĐÁNH SẬP TOÀN BỘ QUÁN ĐỐI THỦ!"
            : "😭 BẠN ĐÃ BỊ ĐÁNH SẬP TOÀN BỘ QUÁN!"}
        </p>

        {winnerBoard && (
          <section className="my-2 w-full rounded-lg border border-amber-400/50 bg-slate-950/80 p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-left">
                <h3 className="text-xs font-black uppercase tracking-wide text-amber-200">
                  Sơ đồ quán đội thắng
                </h3>
                <p className="text-[10px] text-slate-300">
                  {winnerBoard.name || "Người chơi chiến thắng"}
                </p>
              </div>
              {winnerBoards.length > 1 && (
                <div className="flex gap-1">
                  {winnerBoards.map((board, index) => (
                    <button
                      key={`${board.name}-${index}`}
                      type="button"
                      onClick={() => setSelectedBoardIndex(index)}
                      aria-pressed={selectedBoardIndex === index}
                      className={`max-w-24 truncate rounded border px-2 py-1 text-[10px] font-bold ${selectedBoardIndex === index ? "border-amber-300 bg-amber-400 text-slate-950" : "border-slate-700 text-slate-300"}`}
                    >
                      {board.name || `Bản đồ ${index + 1}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mx-auto grid aspect-square w-full max-w-60 grid-cols-[1.1rem_minmax(0,1fr)] grid-rows-[1.1rem_minmax(0,1fr)]">
              <span />
              <div
                aria-hidden="true"
                className="grid text-[8px] font-black text-amber-200"
                style={{
                  gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: boardSize }, (_, index) => (
                  <span
                    key={index}
                    className="flex items-center justify-center"
                  >
                    {index + 1}
                  </span>
                ))}
              </div>
              <div
                aria-hidden="true"
                className="grid text-[8px] font-black text-amber-200"
                style={{
                  gridTemplateRows: `repeat(${boardSize}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: boardSize }, (_, index) => (
                  <span
                    key={index}
                    className="flex items-center justify-center"
                  >
                    {String.fromCharCode(65 + index)}
                  </span>
                ))}
              </div>
              <div
                role="img"
                aria-label={`Bản đồ chiến thắng, ${boardSize} hàng và ${boardSize} cột`}
                className="grid aspect-square overflow-hidden border border-orange-400 bg-slate-900/70"
                style={{
                  gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
                }}
              >
                {winnerBoard.board.map((cell, index) => {
                  const shop = shops.find((entry) => entry.id === cell?.shopId);
                  return (
                    <div
                      key={index}
                      className="relative flex items-center justify-center border border-orange-400/50"
                      title={`${String.fromCharCode(65 + Math.floor(index / boardSize))}/${(index % boardSize) + 1}`}
                    >
                      {shop && (
                        <img
                          src={shop.icon}
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      )}
                      {cell?.shot === "HIT" && (
                        <span className="absolute inset-0 flex items-center justify-center bg-red-950/50 text-[10px] font-black text-white">
                          ×
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {canReport && gameId && (
          <details className="my-2 w-full border-t border-slate-700 pt-3 text-left">
            <summary className="cursor-pointer text-xs font-bold text-rose-300">
              Báo cáo trận đấu
            </summary>
            <form onSubmit={submitReport} className="mt-3 space-y-2">
              {opponents.length > 0 && (
                <label className="block text-[10px] font-bold text-slate-400">
                  Người chơi liên quan
                  <select
                    value={reportedPlayer}
                    onChange={(event) => setReportedPlayer(event.target.value)}
                    className="mt-1 w-full border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white"
                  >
                    <option value="">Chọn nếu cần</option>
                    {opponents.map((opponent) => (
                      <option key={opponent.socketId} value={opponent.name}>
                        {opponent.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block text-[10px] font-bold text-slate-400">
                Lý do báo cáo
                <textarea
                  value={reportReason}
                  onChange={(event) => setReportReason(event.target.value)}
                  maxLength={1000}
                  required
                  rows={3}
                  className="mt-1 w-full resize-y border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-white"
                  placeholder="Mô tả hành vi đáng ngờ hoặc vi phạm…"
                />
              </label>
              {reportStatus && (
                <p role="status" className="text-[10px] text-amber-200">
                  {reportStatus}
                </p>
              )}
              <button
                disabled={reportBusy}
                className="border border-rose-500/50 px-3 py-2 text-[10px] font-black text-rose-200 disabled:opacity-50"
              >
                {reportBusy ? "Đang gửi…" : "Gửi báo cáo"}
              </button>
            </form>
          </details>
        )}

        <div className="flex w-full max-w-xs flex-col gap-3 mt-2">
          <button
            onClick={onRematch}
            className="w-full bg-linear-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white font-black py-3.5 rounded-xl shadow-lg active:scale-95 transition text-sm uppercase tracking-wider"
          >
            🔄 CHƠI LẠI VỚI ĐỐI THỦ
          </button>

          <button
            onClick={onLeave}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl transition text-xs uppercase"
          >
            RỜI SẢNH VỀ MÀN HÌNH CHÍNH
          </button>
        </div>
      </div>
    </div>
  );
}
