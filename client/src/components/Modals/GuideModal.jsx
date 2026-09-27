export default function GuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border-2 border-slate-700 w-full max-w-xs rounded-2xl p-5 text-white flex flex-col gap-3 shadow-2xl">
        <h3 className="text-lg font-black text-yellow-400 text-center uppercase tracking-wide">
          LẬT KÈO SĂN QUÁN
        </h3>

        <div className="text-xs text-slate-300 flex flex-col gap-2 leading-relaxed">
          <p>
            1. <b>Đặt quán:</b> Chọn quán, xoay Ngang/Dọc và đặt đủ 3 quán vào
            hẻm.
          </p>
          <p>
            2. <b>Bắn lượt:</b> Chọn ô trên map đối thủ để bắn dò vị trí.
          </p>
          <p>
            3. <b>Thưởng lượt:</b> Bắn <b>TRÚNG</b> được thưởng thêm phát nữa;
            Bắn <b>TRƯỢT</b> chuyển lượt.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black py-2.5 rounded-xl transition mt-2"
        >
          ĐÃ HIỂU!
        </button>
      </div>
    </div>
  );
}
