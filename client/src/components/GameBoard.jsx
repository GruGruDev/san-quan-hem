import { useState } from "react";
import { SHOPS as DEFAULT_SHOPS, SHOP_OUTLINE } from "../constants/game";
import { playSFX } from "../utils/sound";

export default function GameBoard({
  gameState,
  myBoard,
  setMyBoard,
  opponentHits,
  selectedShop,
  orientation,
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

  const currentShopObj = shops.find((s) => s.id === selectedShop) || shops[0];
  const cosmeticSlots = Object.fromEntries(
    equippedCosmetics.map((cosmetic) => [cosmetic.slot, cosmetic.itemId]),
  );

  const getShopSkinStyle = (shopId) => {
    if (cosmeticSlots.shop_skin === "shop_cavien_neon" && shopId === "cavien")
      return { filter: "hue-rotate(135deg) saturate(1.8)" };
    if (cosmeticSlots.shop_skin === "shop_trasua_mint" && shopId === "trasua")
      return { filter: "hue-rotate(70deg) saturate(1.5)" };
    return undefined;
  };

  const getOccupiedIndices = (startIndex, size, isHorizontal) => {
    if (
      startIndex === null ||
      startIndex < 0 ||
      startIndex >= boardSize * boardSize ||
      size > boardSize
    )
      return null;
    let row = Math.floor(startIndex / boardSize);
    let col = startIndex % boardSize;

    if (isHorizontal && col + size > boardSize) col = boardSize - size;
    if (!isHorizontal && row + size > boardSize) row = boardSize - size;

    const adjustedIndex = row * boardSize + col;
    const indices = [];

    for (let i = 0; i < size; i++) {
      indices.push(
        isHorizontal ? adjustedIndex + i : adjustedIndex + i * boardSize,
      );
    }
    return indices;
  };

  const checkPlacementValid = (indices) => {
    if (!indices) return false;
    return !indices.some((idx) => {
      const cell = myBoard[idx];
      return cell !== null && cell.shopId !== selectedShop;
    });
  };

  const previewIndices =
    isSetup && previewIndex !== null
      ? getOccupiedIndices(
          previewIndex,
          currentShopObj.size,
          orientation === "HORIZONTAL",
        )
      : null;
  const isPreviewValid = checkPlacementValid(previewIndices);

  const handleSetupCellClick = (index) => {
    if (!isSetup) return;
    setPreviewIndex(index);
    playSFX("pop.mp3", soundEnabled, 0.4);
  };

  const handlePointerEnter = (index) => {
    if (!isSetup) return;
    if (previewIndex !== null) setPreviewIndex(index); // Cho phép kéo rẽ nhánh xem preview dễ dàng hơn
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

  return (
    <div
      className={`relative aspect-square max-h-full max-w-full bg-slate-900 rounded-2xl p-1 shadow-2xl border-2 border-slate-700 select-none touch-manipulation overflow-visible transition-transform ${isSunkExplosion ? "animate-shake" : ""}`}
      style={{ width: "min(100%, 35rem, max(12rem, calc(100dvh - 20rem)))" }} // Mở rộng không gian hiển thị cho PC
    >
      <img
        src="/bg8x8.png"
        alt="Map"
        className="absolute inset-0 w-full h-full object-fill rounded-xl pointer-events-none"
      />

      <div
        className="absolute inset-0 grid gap-px w-full h-full p-[8.5%]"
        style={{
          gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${boardSize}, minmax(0, 1fr))`,
        }}
      >
        {/* LƯỚI NHÀ BẠN (TRONG LÚC SETUP HOẶC CHỜ LƯỢT ĐỊCH) */}
        {(isSetup || (isPlaying && !isMyTurn)) &&
          myBoard.map((cell, index) => {
            const isPreview = previewIndices?.includes(index);
            const isOpponentAimingHere = opponentAimingIndex === index;

            return (
              <button
                key={`my-${index}`}
                onClick={() => handleSetupCellClick(index)}
                onPointerEnter={() => handlePointerEnter(index)}
                title={`Hẻm ${String.fromCharCode(65 + Math.floor(index / boardSize))}/${(index % boardSize) + 1}`}
                aria-label={`Hẻm ${String.fromCharCode(65 + Math.floor(index / boardSize))}, số ${(index % boardSize) + 1}`}
                className={`w-full h-full flex items-center justify-center relative border border-white/10 rounded-sm transition-all overflow-visible cursor-pointer
                  ${isPreview && isPreviewValid ? "bg-emerald-500/50 border-2 border-emerald-300" : ""}
                  ${isPreview && !isPreviewValid ? "bg-rose-500/50 border-2 border-rose-300" : ""}
                  ${cell && cell.shopId ? `outline-solid outline-2 -outline-offset-2 ${SHOP_OUTLINE[cell.shopId] || "outline-yellow-400"}` : ""}
                `}
              >
                {cell && cell.icon && (
                  <img
                    src={cell.icon}
                    alt="Shop"
                    className="w-[85%] h-[85%] object-contain drop-shadow-md z-10 pointer-events-none"
                    style={getShopSkinStyle(cell.shopId)}
                  />
                )}
                {!cell?.shopId && isPreview && (
                  <img
                    src={currentShopObj.icon}
                    alt="Preview"
                    className="w-[80%] h-[80%] object-contain opacity-70 z-10 animate-pulse pointer-events-none"
                    style={getShopSkinStyle(selectedShop)}
                  />
                )}

                {isOpponentAimingHere && (
                  <img
                    src="/vitri.png"
                    className="absolute inset-0 w-[120%] h-[120%] left-[-10%] top-[-10%] max-w-none object-contain z-30 animate-ping opacity-90 pointer-events-none drop-shadow-[0_0_8px_rgba(255,0,0,0.8)]"
                    alt="Opponent Aiming"
                  />
                )}

                {cell?.shot === "HIT" && (
                  <img
                    src="/trung.png"
                    alt="Hit"
                    className="absolute inset-0 w-full h-full object-contain z-20 pointer-events-none animate-bounce"
                  />
                )}
                {cell?.shot === "HIT" &&
                  cosmeticSlots.hit_effect === "hit_spark" && (
                    <span className="absolute inset-0 z-30 flex items-center justify-center text-xl text-amber-200 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)] animate-ping pointer-events-none">
                      ✦
                    </span>
                  )}

                {cell?.shot === "MISS" && (
                  <img
                    src="/khongtrung.png"
                    alt="Miss"
                    className="absolute inset-0 w-full h-full object-contain z-20 opacity-80 pointer-events-none"
                  />
                )}
                {cell?.shot === "MISS" &&
                  cosmeticSlots.miss_effect === "miss_ripple" && (
                    <span className="absolute inset-0 z-30 flex items-center justify-center text-lg text-cyan-200 animate-pulse pointer-events-none">
                      ≈
                    </span>
                  )}

                {recentShot?.type === "SUNK" &&
                  recentShot.index === index &&
                  cosmeticSlots.sunk_effect === "sunk_fireworks" && (
                    <span className="absolute inset-0 z-40 flex items-center justify-center text-2xl text-amber-300 animate-ping pointer-events-none">
                      ✹
                    </span>
                  )}

                {showTaunt && recentShot && recentShot.index === index && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none whitespace-nowrap animate-float-up">
                    <span
                      className={`text-[11px] font-black px-2 py-0.5 rounded-full shadow-lg border uppercase ${recentShot.type === "SUNK" ? "bg-purple-600 text-yellow-300 border-yellow-400 scale-125 transition-transform" : recentShot.type === "HIT" ? "bg-red-600 text-white border-red-400" : "bg-slate-800 text-blue-300 border-slate-600"}`}
                    >
                      {recentShot.text}
                    </span>
                  </div>
                )}
              </button>
            );
          })}

        {/* LƯỚI ĐỐI THỦ (KHI ĐẾN LƯỢT BẠN BẮN) */}
        {isPlaying &&
          isMyTurn &&
          opponentHits.map((status, index) => {
            const isAiming = aimingIndex === index;

            return (
              <button
                key={`opp-${index}`}
                onClick={() => handleOpponentCellClick(index, status)}
                title={`Hẻm ${String.fromCharCode(65 + Math.floor(index / boardSize))}/${(index % boardSize) + 1}`}
                disabled={
                  shotPending || aimingIndex !== null || status !== null
                }
                className={`w-full h-full flex items-center justify-center relative border border-white/10 rounded-sm transition-all group overflow-visible ${status === null && !shotPending && aimingIndex === null ? "hover:bg-yellow-400/20 active:bg-yellow-400/30 cursor-pointer active:scale-90" : ""}`}
              >
                {(status === null || isAiming) && (
                  <img
                    src="/vitri.png"
                    alt="Target"
                    className={`w-[85%] h-[85%] object-contain transition-all duration-150 pointer-events-none ${isAiming ? "opacity-100 scale-110 z-30 animate-ping" : "opacity-0 group-hover:opacity-100 group-active:opacity-100 z-10"}`}
                  />
                )}

                {status === "HIT" && (
                  <img
                    src="/trung.png"
                    alt="Trúng"
                    className="w-[120%] h-[120%] object-contain drop-shadow-lg z-20 animate-bounce pointer-events-none"
                  />
                )}
                {status === "HIT" &&
                  cosmeticSlots.hit_effect === "hit_spark" && (
                    <span className="absolute inset-0 z-30 flex items-center justify-center text-xl text-amber-200 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)] animate-ping pointer-events-none">
                      ✦
                    </span>
                  )}

                {status === "MISS" && (
                  <img
                    src="/khongtrung.png"
                    alt="Trượt"
                    className="w-[90%] h-[90%] object-contain opacity-80 z-20 pointer-events-none"
                  />
                )}
                {status === "MISS" &&
                  cosmeticSlots.miss_effect === "miss_ripple" && (
                    <span className="absolute inset-0 z-30 flex items-center justify-center text-lg text-cyan-200 animate-pulse pointer-events-none">
                      ≈
                    </span>
                  )}

                {recentShot?.type === "SUNK" &&
                  recentShot.index === index &&
                  cosmeticSlots.sunk_effect === "sunk_fireworks" && (
                    <span className="absolute inset-0 z-40 flex items-center justify-center text-2xl text-amber-300 animate-ping pointer-events-none">
                      ✹
                    </span>
                  )}

                {showTaunt && recentShot && recentShot.index === index && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none whitespace-nowrap animate-float-up">
                    <span
                      className={`text-[11px] font-black px-2 py-0.5 rounded-full shadow-lg border uppercase ${recentShot.type === "SUNK" ? "bg-purple-600 text-yellow-300 border-yellow-400 scale-125 transition-transform" : recentShot.type === "HIT" ? "bg-red-600 text-white border-red-400" : "bg-slate-800 text-blue-300 border-slate-600"}`}
                    >
                      {recentShot.text}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
      </div>

      {/* TỌA ĐỘ TRỤC NGANG (1, 2, 3...) */}
      <div
        aria-hidden="true"
        className="absolute grid pointer-events-none text-[9px] font-black text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]"
        style={{
          top: "2%",
          left: "8.5%",
          right: "8.5%",
          height: "6.5%",
          gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: boardSize }, (_, index) => (
          <span key={index} className="flex items-center justify-center">
            {index + 1}
          </span>
        ))}
      </div>

      {/* TỌA ĐỘ TRỤC DỌC (A, B, C...) */}
      <div
        aria-hidden="true"
        className="absolute grid pointer-events-none text-[9px] font-black text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]"
        style={{
          top: "8.5%",
          bottom: "8.5%",
          left: "1%",
          width: "7.5%",
          gridTemplateRows: `repeat(${boardSize}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: boardSize }, (_, index) => (
          <span key={index} className="flex items-center justify-center">
            {String.fromCharCode(65 + index)}
          </span>
        ))}
      </div>

      {isSunkExplosion && (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center mix-blend-screen overflow-hidden rounded-xl">
          <img
            src="/explosion.gif"
            alt="Boom"
            className="w-[200%] h-[200%] max-w-none object-cover opacity-95"
          />
        </div>
      )}

      <style>{`
        @keyframes floatUp { 0% { opacity: 0; transform: translate(-50%, 0) scale(0.8); } 20% { opacity: 1; transform: translate(-50%, -10px) scale(1.1); } 80% { opacity: 1; transform: translate(-50%, -18px) scale(1); } 100% { opacity: 0; transform: translate(-50%, -25px) scale(0.9); } }
        .animate-float-up { animation: floatUp 1.8s ease-out forwards; }
        @keyframes shake { 0%, 100% { transform: translateX(0) translateY(0); } 5%, 15%, 25%, 35%, 45%, 55%, 65%, 75%, 85%, 95% { transform: translateX(-8px) translateY(5px) rotate(-1.5deg); } 10%, 20%, 30%, 40%, 50%, 60%, 70%, 80%, 90% { transform: translateX(8px) translateY(-5px) rotate(1.5deg); } }
        .animate-shake { animation: shake 2.5s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>
    </div>
  );
}
