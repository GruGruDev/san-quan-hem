export const APP_VERSION = "v1.1";

export const SHOPS = [
  { id: "cavien", name: "Xe Cá Viên Chiên", size: 2, icon: "/cavienchien.png" },
  { id: "trasua", name: "Tiệm Trà Sữa", size: 3, icon: "/trasua.png" },
  { id: "quannhau", name: "Quán Nhậu / Ốc", size: 4, icon: "/quannhau.png" },
];

export const SHOP_OUTLINE = {
  cavien: "outline-amber-400",
  trasua: "outline-pink-400",
  quannhau: "outline-red-400",
};

// Kho câu thoại floating text theo từng trạng thái
export const TAUNT_TEXTS = {
  MISS: [
    "biết đường không?",
    "lỏ rồi",
    "mù mắt",
    "hẻm vắng tèo",
    "bắn đi đâu đấy?",
    "gà quá",
    "ảo thật đấy",
    "non và xanh",
    "bắn lại đi",
  ],
  HIT: [
    "đây rồi!",
    "búuu!",
    "tao biết ngay",
    "chết me m",
    "chạy đằng trời",
    "lượm lúa",
    "dính đạn",
    "trúng phóc",
    "đúng ổ luôn",
  ],
  SUNK: [
    "chạn tao đi!",
    "tới đi!",
    "gáy nữa đi?",
    "sập tiệm!",
    "về vườn!",
    "giải tán quán!",
    "bay màu!",
    "mất mối làm ăn!",
  ],
};
