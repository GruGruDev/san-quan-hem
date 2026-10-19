import { SHOPS as DEFAULT_SHOPS } from "../constants/game";

export default function BottomPanel({
  gameState,
  selectedShop,
  onSelectShop,
  rotation = 0,
  onRotate,
  onResetBoard,
  myBoard,
  onConfirmPlaceShop,
  isPreviewValid,
  onReady,
  shops = DEFAULT_SHOPS,
}) {
  const isSetup = gameState === "SETUP";
  if (!isSetup) return null;

  const currentShopObj = shops.find((s) => s.id === selectedShop) || shops[0];
  const placedShopIds = new Set(myBoard.filter(Boolean).map((c) => c.shopId));
  const isAllPlaced = shops.every((s) => placedShopIds.has(s.id));
  const rotationDegrees = ["0°", "90°", "180°", "270°"];

  return (
    <div className="w-full flex flex-col p-2 md:p-3 bg-slate-900/90 select-none border-b border-slate-800/80 shrink-0">
      <div className="flex flex-col gap-2.5 bg-slate-950/80 p-2.5 md:p-3 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider">
            📦 Kho Quán ({placedShopIds.size}/{shops.length})
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={onRotate}
              className="bg-indigo-600/90 hover:bg-indigo-500 active:scale-95 text-white font-black text-[11px] px-2.5 py-1 rounded-xl shadow border border-indigo-400/40 transition flex items-center gap-1 cursor-pointer"
            >
              🔄 Xoay ({rotationDegrees[rotation % 4]})
            </button>
            <button
              type="button"
              onClick={onResetBoard}
              className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-[11px] px-2 py-1 rounded-xl border border-slate-700 transition cursor-pointer"
              title="Đặt lại từ đầu"
            >
              ↩️
            </button>
          </div>
        </div>

        {/* Danh Sách Lựa Chọn Quán */}
        <div className="grid grid-cols-3 gap-2">
          {shops.map((shop) => {
            const isPlaced = placedShopIds.has(shop.id);
            const isSelected = selectedShop === shop.id;

            return (
              <button
                key={shop.id}
                type="button"
                onClick={() => onSelectShop(shop.id)}
                className={`relative aspect-4/3 md:aspect-square rounded-xl p-1 flex flex-col items-center justify-center transition border-2 cursor-pointer ${
                  isSelected
                    ? "bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20 scale-102"
                    : isPlaced
                      ? "bg-slate-950/60 border-emerald-600/40 opacity-40"
                      : "bg-slate-950 border-slate-800 opacity-80 hover:opacity-100 hover:border-slate-600"
                }`}
              >
                <img
                  src={shop.icon}
                  alt={shop.name}
                  className="w-[75%] h-[75%] object-contain pointer-events-none"
                />
                <span className="absolute -bottom-1 -right-1 bg-slate-950 text-amber-400 border border-slate-700 text-[9px] font-black px-1.5 py-0.2 rounded-full">
                  {shop.size} ô
                </span>
                {isPlaced && (
                  <span className="absolute -top-1 -left-1 bg-emerald-500 text-slate-950 text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Nút Chốt Vị Trí / Sẵn Sàng */}
        {!isAllPlaced ? (
          <button
            type="button"
            onClick={onConfirmPlaceShop}
            disabled={!isPreviewValid}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black py-2 rounded-xl shadow-lg active:scale-95 transition text-xs uppercase tracking-wider cursor-pointer"
          >
            📌 Đặt {currentShopObj.name.toUpperCase()} Cố Định
          </button>
        ) : (
          <button
            type="button"
            onClick={onReady}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white font-black py-2.5 rounded-xl shadow-lg active:scale-95 transition text-xs uppercase tracking-wider animate-pulse cursor-pointer"
          >
            🚀 SẴN SÀNG VÀO TRẬN!
          </button>
        )}
      </div>
    </div>
  );
}
