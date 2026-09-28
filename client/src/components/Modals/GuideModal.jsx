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
            1. <b>Chọn trận:</b> 1v1 dùng map 8×8 với quán 2/3/4 ô; 2v2 dùng map
            10×10 với quán 2/3/4/5 ô.
          </p>
          <p>
            2. <b>Đặt quán:</b> Chọn quán, xoay ngang/dọc rồi đặt đủ quán trên
            bàn của bạn. Có thể đổi phe trước khi bất kỳ ai sẵn sàng.
          </p>
          <p>
            3. <b>Bắn lượt:</b> Hai đội luân phiên; trong 2v2, lượt kế tiếp
            chuyển qua đồng đội. Chọn một bàn đối thủ để ngắm.
          </p>
          <p>
            4. <b>Thưởng lượt:</b> Bắn <b>TRÚNG</b> được bắn tiếp; bắn
            <b> TRƯỢT</b> chuyển lượt. Người hết toàn bộ quán bị loại; đội thắng
            khi hạ hết bàn đối phương.
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
