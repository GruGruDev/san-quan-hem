import { useEffect, useState } from "react";
import {
  SHOPS as DEFAULT_SHOPS,
  SHOP_OUTLINE,
  rotateShape,
} from "../constants/game";
import { playSFX } from "../utils/sound";

export default function GameBoard({
  gameState,
  myBoard,
  setMyBoard,
  opponentHits,
  selectedShop,
  orientation, // Nhận từ BottomPanel (Được tận dụng làm Trigger Xoay)
  previewIndex,
  setPreviewIndex,
  isMyTurn,
  shotPending = false,
  onFireShot,
  recentShot,
  showTaunt = true,
  soundEnabled = true,
  equippedCosmetics = [],
  shops = DEFAULT_SHOPS,
  boardSize = 8,
  opponentAimingIndex,
  onAimShot,
}) {
  const isSetup = gameState === "SETUP";
  const isPlaying = gameState === "PLAYING";
  const [aimingIndex, setAimingIndex] = useState(null);

  // Xử lý Xoay 4 hướng (0, 1, 2, 3) từ nút đổi Orientation của App.jsx
  const [rot, setRot] = useState(0);
  useEffect(() => {
    if (isSetup) setRot((r) => (r + 1) % 4);
  }, [orientation]);

  const currentShopObj = shops.find((s) => s.id === selectedShop) || shops[0];
  const cosmeticSlots = Object.fromEntries(
    equippedCosmetics.map((c) => [c.slot, c.itemId]),
  );

  const getShopSkinStyle = (shopId) => {
    if (cosmeticSlots.shop_skin === "shop_cavien_neon" && shopId === "cavien")
      return { filter: "hue-rotate(135deg) saturate(1.8)" };
    if (cosmeticSlots.shop_skin === "shop_trasua_mint" && shopId === "trasua")
      return { filter: "hue-rotate(70deg) saturate(1.5)" };
    return undefined;
  };

  const getOccupiedIndices = (startIndex, shopObj, rotation) => {
    if (
      startIndex === null ||
      startIndex < 0 ||
      startIndex >= boardSize * boardSize
    )
      return null;
    const shape = rotateShape(shopObj.shape || [[1]], rotation);
    const rows = shape.length;
    const cols = shape[0].length;

    let startRow = Math.floor(startIndex / boardSize);
    let startCol = startIndex % boardSize;

    if (startCol + cols > boardSize) startCol = boardSize - cols;
    if (startRow + rows > boardSize) startRow = boardSize - rows;

    const indices = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (shape[r][c] === 1)
          indices.push((startRow + r) * boardSize + (startCol + c));
      }
    }
    return indices;
  };

  const checkPlacementValid = (indices) => {
    if (!indices) return false;
    return !indices.some(
      (idx) => myBoard[idx] !== null && myBoard[idx].shopId !== selectedShop,
    );
  };

  const previewIndices =
    isSetup && previewIndex !== null
      ? getOccupiedIndices(previewIndex, currentShopObj, rot)
      : null;
  const isPreviewValid = checkPlacementValid(previewIndices);

  const handleSetupCellClick = (index) => {
    if (!isSetup) return;
    setPreviewIndex(index);
    playSFX("pop.mp3", soundEnabled, 0.4);
  };

  const handlePointerEnter = (index) => {
    if (!isSetup) return;
    if (previewIndex !== null) setPreviewIndex(index);
  };

  const handleOpponentCellClick = (index, status) => {
    if (!isMyTurn || shotPending || status !== null || aimingIndex !== null)
      return;
    playSFX("pop.mp3", soundEnabled, 0.5);
    setAimingIndex(index);
    if (onAimShot) onAimShot(index);
    setTimeout(() => {
      onFireShot(index);
      setAimingIndex(null);
    }, 1000);
  };

  const isSunkExplosion = recentShot && recentShot.type === "SUNK";

  // Render Lưới Bàn Cờ (Tái sử dụng cho cả Nhà và Địch)
  const renderGrid = (boardData, isOpponentBoard) => (
    <div
      className="absolute inset-0 grid gap-px w-full h-full p-[8.5%]"
      style={{
        gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${boardSize}, minmax(0, 1fr))`,
      }}
    >
      {boardData.map((cell, index) => {
        // Biến dùng chung
        const isPreview = !isOpponentBoard && previewIndices?.includes(index);
        const isAiming = isOpponentBoard && aimingIndex === index;
        const isOpponentAimingHere =
          !isOpponentBoard && opponentAimingIndex === index;
        const hitStatus = isOpponentBoard ? cell : cell?.shot;

        return (
          <button
            key={index}
            onClick={() =>
              isOpponentBoard
                ? handleOpponentCellClick(index, hitStatus)
                : handleSetupCellClick(index)
            }
            onPointerEnter={() => !isOpponentBoard && handlePointerEnter(index)}
            disabled={
              isOpponentBoard &&
              (shotPending || aimingIndex !== null || hitStatus !== null)
            }
            className={`w-full h-full flex items-center justify-center relative border border-white/10 rounded-sm transition-all overflow-visible
              ${isOpponentBoard && hitStatus === null && !shotPending && aimingIndex === null && isMyTurn ? "hover:bg-yellow-400/20 cursor-pointer active:scale-90" : ""}
              ${!isOpponentBoard && isPreview && isPreviewValid ? "bg-emerald-500/50 border-2 border-emerald-300 cursor-pointer" : ""}
              ${!isOpponentBoard && isPreview && !isPreviewValid ? "bg-rose-500/50 border-2 border-rose-300 cursor-pointer" : ""}
              ${!isOpponentBoard && cell && cell.shopId ? `outline-solid outline-2 -outline-offset-2 ${SHOP_OUTLINE[cell.shopId] || "outline-yellow-400"}` : ""}
            `}
          >
            {/* Render Quán (Chỉ sân nhà) */}
            {!isOpponentBoard && cell && cell.icon && (
              <img
                src={cell.icon}
                alt="Shop"
                className="w-[85%] h-[85%] object-contain drop-shadow-md z-10 pointer-events-none"
                style={getShopSkinStyle(cell.shopId)}
              />
            )}
            {!isOpponentBoard && !cell?.shopId && isPreview && (
              <img
                src={currentShopObj.icon}
                alt="Preview"
                className="w-[80%] h-[80%] object-contain opacity-70 z-10 animate-pulse pointer-events-none"
                style={getShopSkinStyle(selectedShop)}
              />
            )}

            {/* Kính ngắm địch trên sân nhà */}
            {!isOpponentBoard && isOpponentAimingHere && (
              <img
                src="/vitri.png"
                className="absolute inset-0 w-[120%] h-[120%] left-[-10%] top-[-10%] max-w-none object-contain z-30 animate-ping opacity-90 pointer-events-none drop-shadow-[0_0_8px_rgba(255,0,0,0.8)]"
                alt="Aim"
              />
            )}

            {/* Kính ngắm của bạn trên sân địch */}
            {isOpponentBoard && (hitStatus === null || isAiming) && (
              <img
                src="/vitri.png"
                alt="Target"
                className={`w-[85%] h-[85%] object-contain transition-all pointer-events-none ${isAiming ? "opacity-100 scale-110 z-30 animate-ping" : "opacity-0 group-hover:opacity-100 z-10"}`}
              />
            )}

            {/* Hiệu ứng Trúng / Trượt */}
            {hitStatus === "HIT" && (
              <img
                src="/trung.png"
                alt="Hit"
                className="absolute inset-0 w-[120%] h-[120%] object-contain z-20 pointer-events-none animate-bounce"
              />
            )}
            {hitStatus === "HIT" &&
              cosmeticSlots.hit_effect === "hit_spark" && (
                <span className="absolute inset-0 z-30 flex items-center justify-center text-xl text-amber-200 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)] animate-ping pointer-events-none">
                  ✦
                </span>
              )}

            {hitStatus === "MISS" && (
              <img
                src="/khongtrung.png"
                alt="Miss"
                className="absolute inset-0 w-[90%] h-[90%] object-contain z-20 opacity-80 pointer-events-none"
              />
            )}
            {hitStatus === "MISS" &&
              cosmeticSlots.miss_effect === "miss_ripple" && (
                <span className="absolute inset-0 z-30 flex items-center justify-center text-lg text-cyan-200 animate-pulse pointer-events-none">
                  ≈
                </span>
              )}

            {/* Taunt text chung */}
            {showTaunt && recentShot && recentShot.index === index && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none whitespace-nowrap animate-float-up">
                <span
                  className={`text-[11px] font-black px-2 py-0.5 rounded-full shadow-lg border uppercase ${recentShot.type === "SUNK" ? "bg-purple-600 text-yellow-300 border-yellow-400 scale-125" : recentShot.type === "HIT" ? "bg-red-600 text-white border-red-400" : "bg-slate-800 text-blue-300 border-slate-600"}`}
                >
                  {recentShot.text}
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-10 w-full h-full items-center justify-center p-2">
      {/* KHUNG BÀN CỜ SÂN NHÀ */}
      <div
        className={`relative aspect-square w-full max-w-[24rem] xl:max-w-lg bg-slate-900 rounded-2xl p-1 shadow-2xl border-2 border-slate-700 transition-all duration-500
        ${isPlaying && isMyTurn ? "hidden md:block opacity-40 scale-95" : "block opacity-100 scale-100"} 
        ${isSunkExplosion && !isMyTurn ? "animate-shake" : ""}`}
      >
        <div className="absolute -top-7 left-0 right-0 text-center font-black text-emerald-400 uppercase tracking-widest drop-shadow">
          🏠 Trận địa nhà
        </div>
        <img
          src="/bg8x8.png"
          alt="Map"
          className="absolute inset-0 w-full h-full object-fill rounded-xl pointer-events-none"
        />
        {renderGrid(myBoard, false)}

        {/* Tọa độ (Ngắn gọn) */}
        <div
          aria-hidden="true"
          className="absolute grid pointer-events-none text-[9px] font-black text-amber-200"
          style={{
            top: "2%",
            left: "8.5%",
            right: "8.5%",
            height: "6.5%",
            gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: boardSize }, (_, i) => (
            <span key={i} className="flex items-center justify-center">
              {i + 1}
            </span>
          ))}
        </div>
        <div
          aria-hidden="true"
          className="absolute grid pointer-events-none text-[9px] font-black text-amber-200"
          style={{
            top: "8.5%",
            bottom: "8.5%",
            left: "1%",
            width: "7.5%",
            gridTemplateRows: `repeat(${boardSize}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: boardSize }, (_, i) => (
            <span key={i} className="flex items-center justify-center">
              {String.fromCharCode(65 + i)}
            </span>
          ))}
        </div>

        {isSunkExplosion && !isMyTurn && (
          <div className="absolute inset-0 z-50 flex items-center justify-center mix-blend-screen">
            <img
              src="/explosion.gif"
              className="w-[200%] h-[200%] max-w-none opacity-95"
            />
          </div>
        )}
      </div>

      {/* KHUNG BÀN CỜ ĐỐI THỦ (Chỉ hiện khi PLAYING) */}
      {isPlaying && (
        <div
          className={`relative aspect-square w-full max-w-[24rem] xl:max-w-lg bg-slate-900 rounded-2xl p-1 shadow-2xl border-2 border-slate-700 transition-all duration-500
          ${isPlaying && !isMyTurn ? "hidden md:block opacity-40 scale-95" : "block opacity-100 scale-100"} 
          ${isSunkExplosion && isMyTurn ? "animate-shake" : ""}`}
        >
          <div className="absolute -top-7 left-0 right-0 text-center font-black text-rose-400 uppercase tracking-widest drop-shadow">
            🎯 Trận địa địch
          </div>
          <img
            src="/bg8x8.png"
            alt="Map"
            className="absolute inset-0 w-full h-full object-fill rounded-xl pointer-events-none"
          />
          {renderGrid(opponentHits, true)}

          {/* Tọa độ */}
          <div
            aria-hidden="true"
            className="absolute grid pointer-events-none text-[9px] font-black text-amber-200"
            style={{
              top: "2%",
              left: "8.5%",
              right: "8.5%",
              height: "6.5%",
              gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: boardSize }, (_, i) => (
              <span key={i} className="flex items-center justify-center">
                {i + 1}
              </span>
            ))}
          </div>
          <div
            aria-hidden="true"
            className="absolute grid pointer-events-none text-[9px] font-black text-amber-200"
            style={{
              top: "8.5%",
              bottom: "8.5%",
              left: "1%",
              width: "7.5%",
              gridTemplateRows: `repeat(${boardSize}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: boardSize }, (_, i) => (
              <span key={i} className="flex items-center justify-center">
                {String.fromCharCode(65 + i)}
              </span>
            ))}
          </div>

          {isSunkExplosion && isMyTurn && (
            <div className="absolute inset-0 z-50 flex items-center justify-center mix-blend-screen">
              <img
                src="/explosion.gif"
                className="w-[200%] h-[200%] max-w-none opacity-95"
              />
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes floatUp { 0% { opacity: 0; transform: translate(-50%, 0) scale(0.8); } 20% { opacity: 1; transform: translate(-50%, -10px) scale(1.1); } 80% { opacity: 1; transform: translate(-50%, -18px) scale(1); } 100% { opacity: 0; transform: translate(-50%, -25px) scale(0.9); } }
        .animate-float-up { animation: floatUp 1.8s ease-out forwards; }
        @keyframes shake { 0%, 100% { transform: translateX(0) translateY(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-8px) translateY(5px) rotate(-1.5deg); } 20%, 40%, 60%, 80% { transform: translateX(8px) translateY(-5px) rotate(1.5deg); } }
        .animate-shake { animation: shake 2.5s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>
    </div>
  );
}
