export default function SurrenderVoteModal({ initiatorName, onVote }) {
  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="w-full max-w-sm bg-slate-900 border-2 border-rose-500/50 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center relative animate-pop-in">
        <div className="w-16 h-16 bg-rose-950/80 border-2 border-rose-500/50 rounded-2xl flex items-center justify-center text-3xl mb-4 animate-bounce">
          🏳️
        </div>

        <h2 className="text-xl font-black text-rose-400 tracking-wider uppercase drop-shadow mb-2">
          BỎ PHIẾU ĐẦU HÀNG
        </h2>

        <p className="text-sm text-slate-300 font-medium leading-relaxed mb-6">
          Đồng đội <b className="text-amber-400">{initiatorName}</b> đang muốn
          giương cờ trắng đầu hàng. <br />
          <br />
          Nếu bạn đồng ý, toàn bộ Đội sẽ bị xử thua. Bạn có muốn bỏ cuộc không?
        </p>

        <div className="flex gap-3 w-full">
          <button
            onClick={() => onVote(true)}
            className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-95 transition"
          >
            Có, Đầu hàng
          </button>
          <button
            onClick={() => onVote(false)}
            className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-95 transition"
          >
            Không, Chiến tiếp!
          </button>
        </div>
      </div>
    </div>
  );
}
