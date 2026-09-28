import { useEffect, useState } from "react";
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
  onFireShot,
  recentShot,
  soundEnabled = true,
  shops = DEFAULT_SHOPS,
}) {
  const isSetup = gameState === "SETUP";
  const isPlaying = gameState === "PLAYING";
  const [isDragging, setIsDragging] = useState(false);
  const [aimingIndex, setAimingIndex] = useState(null);

  const currentShopObj = shops.find((s) => s.id === selectedShop) || shops[0];

  useEffect(() => {
    if (recentShot) {
      if (recentShot.type === "SUNK") {
        // Cố tình đẩy âm thanh lớn hơn khi nổ quán
        playSFX("sizzling-pan.mp3", soundEnabled, 1.0);
      } else if (recentShot.type === "HIT") {
        playSFX("sizzling-pan.mp3", soundEnabled, 0.8);
      } else if (recentShot.type === "MISS") {
        playSFX("waterdrop.mp3", soundEnabled, 0.6);
      }
    }
  }, [recentShot, soundEnabled]);

  const getOccupiedIndices = (startIndex, size, isHorizontal) => {
    if (startIndex === null || startIndex < 0 || startIndex >= 64) return null;
    let row = Math.floor(startIndex / 8);
    let col = startIndex % 8;

    if (isHorizontal && col + size > 8) col = 8 - size;
    if (!isHorizontal && row + size > 8) row = 8 - size;

    const adjustedIndex = row * 8 + col;
    const indices = [];

    for (let i = 0; i < size; i++) {
      indices.push(isHorizontal ? adjustedIndex + i : adjustedIndex + i * 8);
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

  const handlePointerDown = (index) => {
    if (!isSetup) return;
    setIsDragging(true);
    setPreviewIndex(index);
    playSFX("pop.mp3", soundEnabled, 0.4);
  };

  const handlePointerEnter = (index) => {
    if (!isSetup) return;
    if (isDragging || previewIndex !== null) {
      setPreviewIndex(index);
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleOpponentCellClick = (index, status) => {
    if (!isMyTurn || status !== null || aimingIndex !== null) return;
    playSFX("pop.mp3", soundEnabled, 0.5);
    setAimingIndex(index);
    setTimeout(() => {
      onFireShot(index);
      setAimingIndex(null);
    }, 300);
  };

  // Xác định xem có đang nổ quán không để rung màn hình
  const isSunkExplosion = recentShot && recentShot.type === "SUNK";

  return (
    <div
      // THÊM CLASS animate-shake VÀO KHUNG BÀN CỜ
      className={`relative w-full aspect-square max-w-[360px] bg-slate-900 rounded-2xl p-1 shadow-2xl border-2 border-slate-700 select-none touch-none overflow-visible transition-transform ${
        isSunkExplosion ? "animate-shake" : ""
      }`}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <img
        src="/bg8x8.png"
        alt="Map"
        className="absolute inset-0 w-full h-full object-fill rounded-xl pointer-events-none"
      />

      <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 gap-[1px] w-full h-full p-[8.5%]">
        {/* LƯỚI NHÀ BẠN */}
        {(isSetup || (isPlaying && !isMyTurn)) &&
          myBoard.map((cell, index) => {
            const isPreview = previewIndices?.includes(index);

            return (
              <button
                key={`my-${index}`}
                onPointerDown={() => handlePointerDown(index)}
                onPointerEnter={() => handlePointerEnter(index)}
                className={`
                  w-full h-full flex items-center justify-center relative border border-white/10 rounded-sm transition-all overflow-visible cursor-pointer
                  ${isPreview && isPreviewValid ? "bg-emerald-500/50 border-2 border-emerald-300" : ""}
                  ${isPreview && !isPreviewValid ? "bg-rose-500/50 border-2 border-rose-300" : ""}
                  ${cell && cell.shopId ? `outline outline-2 -outline-offset-2 ${SHOP_OUTLINE[cell.shopId] || "outline-yellow-400"}` : ""}
                `}
              >
                {cell && cell.icon && (
                  <img
                    src={cell.icon}
                    alt="Shop"
                    className="w-[85%] h-[85%] object-contain drop-shadow-md z-10 pointer-events-none"
                  />
                )}

                {!cell?.shopId && isPreview && (
                  <img
                    src={currentShopObj.icon}
                    alt="Preview"
                    className="w-[80%] h-[80%] object-contain opacity-70 z-10 animate-pulse pointer-events-none"
                  />
                )}

                {cell?.shot === "HIT" && (
                  <img
                    src="/trung.png"
                    alt="Hit"
                    className="absolute inset-0 w-full h-full object-contain z-20 pointer-events-none animate-bounce"
                  />
                )}

                {cell?.shot === "MISS" && (
                  <img
                    src="/khongtrung.png"
                    alt="Miss"
                    className="absolute inset-0 w-full h-full object-contain z-20 opacity-80 pointer-events-none"
                  />
                )}

                {/* 💥 HIỆU ỨNG GIF NỔ KHI QUÁN NHÀ MÌNH BỊ SẬP */}
                {recentShot &&
                  recentShot.index === index &&
                  recentShot.type === "SUNK" && (
                    <img
                      src="/explosion.gif"
                      alt="Explosion"
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300%] h-[300%] object-contain z-50 pointer-events-none mix-blend-screen"
                    />
                  )}

                {/* Floating Taunt Text */}
                {recentShot && recentShot.index === index && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none whitespace-nowrap animate-float-up">
                    <span
                      className={`text-[11px] font-black px-2 py-0.5 rounded-full shadow-lg border uppercase ${
                        recentShot.type === "SUNK"
                          ? "bg-purple-600 text-yellow-300 border-yellow-400 scale-125 transition-transform"
                          : recentShot.type === "HIT"
                            ? "bg-red-600 text-white border-red-400"
                            : "bg-slate-800 text-blue-300 border-slate-600"
                      }`}
                    >
                      {recentShot.text}
                    </span>
                  </div>
                )}
              </button>
            );
          })}

        {/* LƯỚI ĐỐI THỦ */}
        {isPlaying &&
          isMyTurn &&
          opponentHits.map((status, index) => {
            const isAiming = aimingIndex === index;

            return (
              <button
                key={`opp-${index}`}
                onClick={() => handleOpponentCellClick(index, status)}
                className={`
                  w-full h-full flex items-center justify-center relative border border-white/10 rounded-sm transition-all group overflow-visible
                  ${status === null ? "hover:bg-yellow-400/20 active:bg-yellow-400/30 cursor-pointer active:scale-90" : ""}
                `}
              >
                {(status === null || isAiming) && (
                  <img
                    src="/vitri.png"
                    alt="Target"
                    className={`w-[85%] h-[85%] object-contain transition-all duration-150 pointer-events-none ${
                      isAiming
                        ? "opacity-100 scale-110 z-30 animate-ping"
                        : "opacity-0 group-hover:opacity-100 group-active:opacity-100 z-10"
                    }`}
                  />
                )}

                {status === "HIT" && (
                  <img
                    src="/trung.png"
                    alt="Trúng"
                    className="w-[120%] h-[120%] object-contain drop-shadow-lg z-20 animate-bounce pointer-events-none"
                  />
                )}

                {status === "MISS" && (
                  <img
                    src="/khongtrung.png"
                    alt="Trượt"
                    className="w-[90%] h-[90%] object-contain opacity-80 z-20 pointer-events-none"
                  />
                )}

                {/* 💥 HIỆU ỨNG GIF NỔ KHI MÌNH BẮN SẬP QUÁN ĐỐI THỦ */}
                {recentShot &&
                  recentShot.index === index &&
                  recentShot.type === "SUNK" && (
                    <img
                      src="/explosion.gif"
                      alt="Explosion"
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350%] h-[350%] object-contain z-50 pointer-events-none mix-blend-screen"
                    />
                  )}

                {/* Floating Taunt Text */}
                {recentShot && recentShot.index === index && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none whitespace-nowrap animate-float-up">
                    <span
                      className={`text-[11px] font-black px-2 py-0.5 rounded-full shadow-lg border uppercase ${
                        recentShot.type === "SUNK"
                          ? "bg-purple-600 text-yellow-300 border-yellow-400 scale-125 transition-transform"
                          : recentShot.type === "HIT"
                            ? "bg-red-600 text-white border-red-400"
                            : "bg-slate-800 text-blue-300 border-slate-600"
                      }`}
                    >
                      {recentShot.text}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
      </div>

      {/* Style Keyframes cho Floating Text & Rung Màn Hình */}
      <style>{`
        @keyframes floatUp {
          0% { opacity: 0; transform: translate(-50%, 0) scale(0.8); }
          20% { opacity: 1; transform: translate(-50%, -10px) scale(1.1); }
          80% { opacity: 1; transform: translate(-50%, -18px) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -25px) scale(0.9); }
        }
        .animate-float-up {
          animation: floatUp 1.8s ease-out forwards;
        }

        /* Hiệu ứng rung giật khi nổ quán */
        @keyframes shake {
          0%, 100% { transform: translateX(0) translateY(0); }
          20% { transform: translateX(-4px) translateY(2px) rotate(-1deg); }
          40% { transform: translateX(4px) translateY(-2px) rotate(1deg); }
          60% { transform: translateX(-4px) translateY(-2px) rotate(-1deg); }
          80% { transform: translateX(4px) translateY(2px) rotate(1deg); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
}
