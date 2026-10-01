export default function DonateModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  // Link VietQR chuẩn hóa theo thông tin Ngân hàng Timo của bạn
  const vietQrUrl =
    "https://img.vietqr.io/image/timo-9021299047706-compact2.png?accountName=NGUYEN%20TRI%20TAI&addInfo=unghotacgia";

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="w-full max-w-sm bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 relative text-center">
        {/* Nút Đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-slate-800 hover:bg-slate-700 text-amber-200 rounded-full font-bold flex items-center justify-center border border-amber-500/30 transition active:scale-95"
        >
          ✕
        </button>

        {/* Tiêu đề */}
        <div className="mt-1">
          <div className="inline-block bg-linear-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-widest shadow mb-1">
            Góc Đại Gia Hẻm
          </div>
          <h2 className="text-xl font-black text-amber-300 tracking-wider uppercase drop-shadow">
            💖 ỦNG HỘ DỰ ÁN
          </h2>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-medium">
          Mỗi ly trà sữa ủng hộ sẽ giúp tác giả{" "}
          <b className="text-amber-400">NGUYỄN TRÍ TÀI</b> duy trì Server & phát
          triển thêm nhiều tính năng mới!
        </p>

        {/* Khung Mã QR Donate */}
        <div className="bg-slate-950 p-3 rounded-2xl border border-amber-500/30 flex flex-col items-center gap-2 shadow-inner">
          <div className="w-48 h-48 bg-white rounded-xl p-1.5 flex items-center justify-center shadow">
            <img
              src={vietQrUrl}
              alt="Mã VietQR Timo NGUYEN TRI TAI"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
          <div className="flex flex-col items-center text-[11px] font-bold text-slate-300">
            <span className="text-amber-400 font-black">
              Ngân hàng số Timo (Ban Viet Bank)
            </span>
            <span>
              Chủ TK: <b className="text-white">NGUYEN TRI TAI</b>
            </span>
            <span>
              Số TK: <b className="text-amber-300 font-mono">9021299047706</b>
            </span>
          </div>
        </div>

        {/* Quyền Lợi */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-2.5 text-left text-[11px] text-amber-200 font-medium flex flex-col gap-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-300">
            <span>💎</span> Quyền lợi "Đại Gia Hẻm":
          </div>
          <span>• Gắn huy hiệu lấp lánh tại Sảnh Chờ.</span>
          <span>• Tên được vinh danh trong mục Tri Ân.</span>
          <span>• Số tiền ủng hộ không được công khai.</span>
        </div>

        {/* Nút Đóng */}
        <button
          onClick={onClose}
          className="w-full bg-linear-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-slate-950 font-black py-3 rounded-xl shadow-lg active:scale-95 transition text-xs uppercase tracking-wider"
        >
          CẢM ƠN BẠN RẤT NHIỀU!
        </button>
      </div>
    </div>
  );
}
