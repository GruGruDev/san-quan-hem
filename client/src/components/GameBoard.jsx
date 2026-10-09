import { useState } from "react";
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
  rotation = 0, // Nhận góc xoay 0, 1, 2, 3 từ App.jsx
  previewIndex,
  setPreviewIndex,
  isMyTurn,
  isMyTeamTurn,
  shotPending = false,
  onFireShot,
  recentShot,
  showTaunt = true,
  soundEnabled = true,
  equippedCosmetics = [],
  shops = DEFAULT_SHOPS,
  boardSize = 8,
  opponentAimingIndex,
  aimingData,
  onAimShot,
  team,
}) {
  const isSetup = gameState === "SETUP";
  const isPlaying = gameState === "PLAYING";
  const [aimingIndex, setAimingIndex] = useState(null);

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

  // Tính tọa độ chiếm giữ chính xác theo Ma Trận Tetris Shape & Góc xoay
  const getOccupiedIndices = (startIndex, shopObj, rotDegree) => {
    if (
      startIndex === null ||
      startIndex < 0 ||
      startIndex >= boardSize * boardSize
    )
      return null;
    const shape = rotateShape(shopObj.shape || [[1]], rotDegree);
    const rows = shape.length;
    const cols = shape[0].length;

    let startRow = Math.floor(startIndex / boardSize);
    let startCol = startIndex % boardSize;

    if (startCol + cols > boardSize) startCol = boardSize - cols;
    if (startRow + rows > boardSize) startRow = boardSize - rows;

    const indices = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (shape[r][c] === 1) {
          indices.push((startRow + r) * boardSize + (startCol + c));
        }
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
      ? getOccupiedIndices(previewIndex, currentShopObj, rotation)
      : null;
  const isPreviewValid = checkPlacementValid(previewIndices);

  // XỬ LÝ CLICK ĐẶT QUÁN CỐ ĐỊNH (KHÔNG DÍNH CHUỘT)
  const handleSetupCellClick = (index) => {
    if (!isSetup) return;

    // LƯU CỐ ĐỊNH
    if (
      previewIndex === index ||
      (previewIndices && previewIndices.includes(index))
    ) {
      if (isPreviewValid && previewIndices) {
        playSFX("pop.mp3", soundEnabled, 0.6);
        const newBoard = myBoard.map((cell) =>
          cell && cell.shopId === selectedShop ? null : cell,
        );
        previewIndices.forEach((idx) => {
          newBoard[idx] = {
            shopId: currentShopObj.id,
            icon: currentShopObj.icon,
            name: currentShopObj.name,
          };
        });
        setMyBoard(newBoard);
        setPreviewIndex(null);
        return;
      }
    }

    // Chọn vị trí xem trước cố định
    playSFX("pop.mp3", soundEnabled, 0.4);
    setPreviewIndex(index);
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

  // Xác định Trận địa nào là Main (Chính giữa) và nào là Minimap (Góc)
  const isAttackingPhase = isPlaying && isMyTeamTurn;

  // Render Lưới Bàn Cờ (Tái sử dụng cho cả Main Board và Minimap)
  const renderGrid = (boardData, isOpponentBoard, isMinimap = false) => (
    <div
      className="absolute inset-0 grid gap-px w-full h-full p-[8.5%]"
      style={{
        gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${boardSize}, minmax(0, 1fr))`,
      }}
    >
      {boardData.map((cell, index) => {
        const isPreview = !isOpponentBoard && previewIndices?.includes(index);
        const isAiming = isOpponentBoard && aimingIndex === index;
        const isOpponentAimingHere =
          !isOpponentBoard &&
          (opponentAimingIndex === index ||
            (aimingData?.targetTeam === team &&
              aimingData?.targetIndex === index));
        const hitStatus = isOpponentBoard ? cell : cell?.shot;

        return (
          <button
            key={index}
            type="button"
            onClick={() => {
              if (isMinimap) return; // Không cho phép click trên Minimap
              isOpponentBoard
                ? handleOpponentCellClick(index, hitStatus)
                : handleSetupCellClick(index);
            }}
            disabled={
              isMinimap ||
              (isOpponentBoard &&
                (shotPending || aimingIndex !== null || hitStatus !== null))
            }
            className={`w-full h-full flex items-center justify-center relative border border-white/10 rounded-sm transition-all overflow-visible
              ${isOpponentBoard && hitStatus === null && !shotPending && aimingIndex === null && isMyTurn && !isMinimap ? "hover:bg-amber-400/20 active:bg-amber-400/30 cursor-crosshair" : ""}
              ${!isOpponentBoard && isPreview && isPreviewValid && !isMinimap ? "bg-emerald-500/50 border-2 border-emerald-300 cursor-pointer animate-pulse" : ""}
              ${!isOpponentBoard && isPreview && !isPreviewValid && !isMinimap ? "bg-rose-500/50 border-2 border-rose-300 cursor-pointer" : ""}
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
            {!isOpponentBoard && !cell?.shopId && isPreview && !isMinimap && (
              <img
                src={currentShopObj.icon}
                alt="Preview"
                className="w-[80%] h-[80%] object-contain opacity-70 z-10 animate-pulse pointer-events-none"
                style={getShopSkinStyle(selectedShop)}
              />
            )}

            {/* Kính ngắm địch đang chĩa vào sân nhà */}
            {!isOpponentBoard && isOpponentAimingHere && !isMinimap && (
              <img
                src="/vitri.png"
                className="absolute inset-0 w-[120%] h-[120%] left-[-10%] top-[-10%] max-w-none object-contain z-30 animate-ping opacity-90 pointer-events-none drop-shadow-[0_0_8px_rgba(255,0,0,0.8)]"
                alt="Aim"
              />
            )}

            {/* Kính ngắm của bạn chĩa sang sân địch */}
            {isOpponentBoard &&
              (hitStatus === null || isAiming) &&
              !isMinimap && (
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
                className={`absolute inset-0 object-contain z-20 pointer-events-none ${isMinimap ? "w-full h-full" : "w-[120%] h-[120%] animate-bounce"}`}
              />
            )}
            {hitStatus === "HIT" &&
              cosmeticSlots.hit_effect === "hit_spark" &&
              !isMinimap && (
                <span className="absolute inset-0 z-30 flex items-center justify-center text-xl text-amber-200 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)] animate-ping pointer-events-none">
                  ✦
                </span>
              )}

            {hitStatus === "MISS" && (
              <img
                src="/khongtrung.png"
                alt="Miss"
                className={`absolute inset-0 object-contain z-20 opacity-80 pointer-events-none ${isMinimap ? "w-[70%] h-[70%] m-auto" : "w-[90%] h-[90%]"}`}
              />
            )}

            {/* Taunt text - Chỉ hiện trên Main Board */}
            {showTaunt &&
              recentShot &&
              recentShot.index === index &&
              !isMinimap && (
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
    <div className="relative w-full h-full flex items-center justify-center p-2 md:p-6">
      {/* ---------------- BẢNG SETUP (CHỈ HIỆN SÂN NHÀ DẠNG TO) ---------------- */}
      {isSetup && (
        <div className="relative aspect-square w-full max-w-[28rem] md:max-w-2xl bg-slate-900/90 rounded-3xl p-1 shadow-2xl border-2 border-slate-700/80">
          <div className="absolute -top-8 left-0 right-0 text-center font-black text-sm text-emerald-400 uppercase tracking-widest drop-shadow">
            🏠 TRẬN ĐỊA NHÀ (ĐANG XẾP QUÁN)
          </div>
          <img
            src="/bg8x8.png"
            alt="Map"
            className="absolute inset-0 w-full h-full object-fill rounded-2xl pointer-events-none"
          />
          {renderGrid(myBoard, false, false)}

          {/* Tọa độ */}
          <div
            aria-hidden="true"
            className="absolute grid pointer-events-none text-[10px] md:text-xs font-black text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]"
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
            className="absolute grid pointer-events-none text-[10px] md:text-xs font-black text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]"
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
        </div>
      )}

      {/* ---------------- BẢNG PLAYING (CÓ MAIN BOARD + MINIMAP) ---------------- */}
      {isPlaying && (
        <>
          {/* MAIN BOARD (CHIẾM GIỮA MÀN HÌNH TÙY THEO LƯỢT) */}
          <div
            className={`relative aspect-square w-full max-w-[28rem] md:max-w-[36rem] xl:max-w-[42rem] bg-slate-900/90 rounded-3xl p-1 shadow-2xl border-2 border-slate-700/80 transition-all duration-500 ${
              isSunkExplosion &&
              ((!isAttackingPhase && !isMyTurn) ||
                (isAttackingPhase && isMyTurn))
                ? "animate-shake"
                : ""
            }`}
          >
            <div
              className={`absolute -top-8 left-0 right-0 text-center font-black text-sm uppercase tracking-widest drop-shadow ${
                !isAttackingPhase ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {!isAttackingPhase ? "🏠 TRẬN ĐỊA NHÀ" : "🎯 TRẬN ĐỊA ĐỊCH"}
            </div>
            <img
              src="/bg8x8.png"
              alt="Map"
              className="absolute inset-0 w-full h-full object-fill rounded-2xl pointer-events-none"
            />

            {!isAttackingPhase
              ? renderGrid(myBoard, false, false)
              : renderGrid(opponentHits, true, false)}

            {/* Tọa độ Main Board */}
            <div
              aria-hidden="true"
              className="absolute grid pointer-events-none text-[10px] md:text-sm font-black text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]"
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
              className="absolute grid pointer-events-none text-[10px] md:text-sm font-black text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]"
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

            {isSunkExplosion && (
              <div className="absolute inset-0 z-50 flex items-center justify-center mix-blend-screen pointer-events-none">
                <img
                  src="/explosion.gif"
                  className="w-[180%] h-[180%] max-w-none opacity-95"
                  alt="Boom"
                />
              </div>
            )}
          </div>

          {/* MINIMAP (GÓC TRÊN BÊN PHẢI) */}
          <div className="absolute top-2 right-2 md:top-6 md:right-6 w-24 md:w-36 xl:w-48 aspect-square bg-slate-900 rounded-xl p-0.5 shadow-2xl border-2 border-slate-600 hover:scale-[1.8] md:hover:scale-[2] origin-top-right transition-transform duration-300 z-40 opacity-90 hover:opacity-100 group">
            <div
              className={`absolute -top-5 left-0 right-0 text-center font-black text-[9px] md:text-[10px] uppercase tracking-wider drop-shadow ${
                isAttackingPhase ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {isAttackingPhase ? "🏠 Sân nhà" : "🎯 Sân địch"}
            </div>
            <img
              src="/bg8x8.png"
              alt="Map"
              className="absolute inset-0 w-full h-full object-fill rounded-lg pointer-events-none"
            />

            {isAttackingPhase
              ? renderGrid(myBoard, false, true)
              : renderGrid(opponentHits, true, true)}
          </div>
        </>
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
