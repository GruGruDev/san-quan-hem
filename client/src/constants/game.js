export const APP_VERSION = "v1.2";

// 5 loại quán ăn trong hẻm
export const ALL_SHOPS = [
  { id: "cavien", name: "Xe Cá Viên Chiên", size: 2, icon: "/cavienchien.png" },
  { id: "trasua", name: "Tiệm Trà Sữa", size: 3, icon: "/trasua.png" },
  { id: "bunrieu", name: "Gánh Bún Riêu", size: 3, icon: "/bunrieu.png" },
  { id: "quanoc", name: "Quán Ốc Quen", size: 4, icon: "/donuong.png" },
  { id: "quannhau", name: "Khu Nhậu Vỉa Hè", size: 5, icon: "/quannhau.png" },
];

// Mặc định 3 quán chuẩn nếu không nhận được dữ liệu xoay từ Server
export const SHOPS = ALL_SHOPS.slice(0, 3);

export const SHOP_OUTLINE = {
  cavien: "outline-amber-400",
  trasua: "outline-pink-400",
  bunrieu: "outline-orange-400",
  quanoc: "outline-emerald-400",
  quannhau: "outline-red-400",
};

// Kho câu thoại floating text chọc quêGen Z siêu đa dạng
export const TAUNT_TEXTS = {
  MISS: [
    // Kho thoại gốc & bổ sung thêm
    "biết đường không?",
    "lỏ rồi",
    "mù mắt",
    "hẻm vắng tèo",
    "bắn đi đâu đấy?",
    "gà quá",
    "ảo thật đấy",
    "non và xanh",
    "bắn lại đi",
    "ủa a lô?",
    "google maps bó tay",
    "nghỉ bán rồi em",
    "ngõ cụt rồi!",
    "chó rượt kìa!",
    "mù đường thực sự",
    "bắn gió à?",
    "nhìn lại bản đồ đi",
    "tay nghề yếu quá",
    "trượt vỏ chuối!",
    "hẻm này nhà trống!",
    "sờ vào tường à?",
    "bắn trúng không khí",
    "nhà người ta đi vắng",
    "ngố rừng về phố",
    "hụt ăn rồi!",
  ],
  HIT: [
    // Kho thoại gốc & bổ sung thêm
    "đây rồi!",
    "búuu!",
    "tao biết ngay",
    "chết me m",
    "chạy đằng trời",
    "lượm lúa",
    "dính đạn",
    "trúng phóc",
    "đúng ổ luôn",
    "nổ hũ!",
    "bắn chuẩn đét!",
    "mất mối ăn rồi!",
    "ăn tiền!",
    "chạy đi đâu con sâu",
    "thấy chưa?",
    "ngon lành cạ đào",
    "đúng điểm nóng!",
    "trúng chóc luôn",
    "xèo xèo thơm phức",
    "đã tay chưa!",
    "gần sập rồi đó",
    "chạy sao thoát!",
    "gãy cánh rồi nhé",
    "dính chấu!",
  ],
  SUNK: [
    // Kho thoại gốc & bổ sung thêm
    "chạn tao đi!",
    "tới đi!",
    "gáy nữa đi?",
    "sập tiệm!",
    "về vườn!",
    "giải tán quán!",
    "bay màu!",
    "mất mối làm ăn!",
    "càn quét sạch quán!",
    "đã đánh sập!",
    "mất sổ gạo rồi!",
    "trả mặt bằng gấp!",
    "dẹp tiệm nghỉ bán!",
    "cháy nhà ra mặt chuột!",
    "rút phích cắm luôn!",
    "khỏi buôn bán gì nữa!",
    "phá sản rồi em!",
    "trắng tay trong hẻm!",
    "ra bờ đê nằm!",
    "bay luôn quán gu ruột!",
  ],
};

// Tính toán Rank theo số trận thắng
export const getPlayerRank = (wins = 0) => {
  if (wins >= 35)
    return { title: "Thực Thần", icon: "👑", color: "text-amber-300" };
  if (wins >= 20)
    return { title: "Thổ Địa", icon: "🗺️", color: "text-purple-400" };
  if (wins >= 10)
    return { title: "Dân Chơi", icon: "🕶️", color: "text-emerald-400" };
  if (wins >= 4)
    return { title: "Gà Mờ", icon: "🐣", color: "text-yellow-400" };
  return { title: "Mù Đường", icon: "🛵", color: "text-slate-400" };
};

// Bộ lọc từ ngữ nhạy cảm sang Emoji đồ ăn
const BAD_WORDS_MAP = {
  vãi: "🍿",
  vcl: "🧋",
  chửi: "🍢",
  đù: "🍜",
  đm: "🍡",
  dm: "🍡",
  vl: "🥤",
};

export const filterBadWords = (text = "") => {
  let filtered = text;
  Object.keys(BAD_WORDS_MAP).forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    filtered = filtered.replace(regex, BAD_WORDS_MAP[word]);
  });
  return filtered;
};
