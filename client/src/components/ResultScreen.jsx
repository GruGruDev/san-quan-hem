export default function ResultScreen({ isWinner, onRematch, onLeave }) {
  return (
    <div className="absolute inset-0 bg-black/85 z-50 flex flex-col items-center justify-center p-4 text-center animate-fade-in">
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

      <p className="text-xs text-slate-300 max-w-[250px] font-medium leading-relaxed my-3">
        {isWinner
          ? "🎉 BẠN ĐÃ ĐÁNH SẬP TOÀN BỘ QUÁN ĐỐI THỦ!"
          : "😭 BẠN ĐÃ BỊ ĐÁNH SẬP TOÀN BỘ QUÁN!"}
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
        <button
          onClick={onRematch}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white font-black py-3.5 rounded-xl shadow-lg active:scale-95 transition text-sm uppercase tracking-wider"
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
  );
}
