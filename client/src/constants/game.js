export const APP_VERSION = "v1.4 - Tetris Update";

// 5 loại quán ăn với hình dạng Tetris (0: rỗng, 1: có quán)
export const ALL_SHOPS = [
  {
    id: "cavien",
    name: "Xe Cá Viên",
    size: 2,
    shape: [[1, 1]],
    icon: "/cavienchien.png",
  }, // Đường thẳng
  {
    id: "trasua",
    name: "Trà Sữa",
    size: 3,
    shape: [
      [1, 1],
      [1, 0],
    ],
    icon: "/trasua.png",
  }, // Chữ L nhỏ
  {
    id: "bunrieu",
    name: "Bún Riêu",
    size: 4,
    shape: [
      [1, 1, 1],
      [0, 1, 0],
    ],
    icon: "/bunrieu.png",
  }, // Chữ T
  {
    id: "quanoc",
    name: "Quán Ốc",
    size: 4,
    shape: [
      [1, 0],
      [1, 0],
      [1, 1],
    ],
    icon: "/donuong.png",
  }, // Chữ L vừa
  {
    id: "quannhau",
    name: "Quán Nhậu",
    size: 5,
    shape: [
      [1, 0, 0],
      [1, 0, 0],
      [1, 1, 1],
    ],
    icon: "/quannhau.png",
  }, // Chữ L bự
];

export const SHOPS = ALL_SHOPS.slice(0, 3);
// 2v2 Lấy đúng 4 quán: 2, 3, 4(Ốc), 5
export const TWO_VS_TWO_SHOPS = [
  ALL_SHOPS[0],
  ALL_SHOPS[1],
  ALL_SHOPS[3],
  ALL_SHOPS[4],
];
export const BOARD_SIZES = { "1v1": 8, "2v2": 12 };

export const SHOP_OUTLINE = {
  cavien: "outline-amber-400",
  trasua: "outline-pink-400",
  bunrieu: "outline-orange-400",
  quanoc: "outline-emerald-400",
  quannhau: "outline-red-400",
  quannhau5: "outline-red-400",
};

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
    "bắn gió à?",
    "trượt vỏ chuối!",
  ],
  HIT: [
    "đây rồi!",
    "búuu!",
    "tao biết ngay",
    "chạy đằng trời",
    "lượm lúa",
    "dính đạn",
    "trúng phóc",
    "nổ hũ!",
    "ăn tiền!",
    "xèo xèo thơm phức",
  ],
  SUNK: [
    "sập tiệm!",
    "về vườn!",
    "giải tán quán!",
    "bay màu!",
    "rút phích cắm luôn!",
    "phá sản rồi em!",
    "ra bờ đê nằm!",
    "cháy nhà ra mặt chuột!",
  ],
};

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

// Hàm xoay ma trận 90 độ
export const rotateShape = (shape, times) => {
  let result = shape;
  for (let i = 0; i < times % 4; i++) {
    result = result[0].map((_, index) =>
      result.map((row) => row[index]).reverse(),
    );
  }
  return result;
};
