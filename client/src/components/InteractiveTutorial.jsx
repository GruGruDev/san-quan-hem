import { useEffect, useMemo, useRef, useState } from "react";
import { playSFX } from "../utils/sound";

const GRID_SIZE = 8;

// Kích thước bàn cờ ưu tiên điện thoại: vừa chiều rộng VÀ chiều cao thực của màn hình (dvh).
// Nếu màn hình quá thấp, vùng nội dung sẽ tự cuộn thay vì làm bàn cờ nhỏ hơn 260px.
const SETUP_BOARD_SIZE = "clamp(260px, min(92vw, calc(100dvh - 430px)), 360px)";
const ENEMY_BOARD_SIZE = "clamp(260px, min(94vw, calc(100dvh - 380px)), 400px)";

const detectCoarsePointer = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(pointer: coarse)").matches;

// Quán dùng cho Tutorial (Chỉ 2 quán cho nhanh gọn)
const TUTORIAL_SHOPS = [
  { id: "cavien", name: "Xe Cá Viên", size: 2, icon: "/cavienchien.png" },
  { id: "trasua", name: "Xe Trà Sữa", size: 3, icon: "/trasua.png" },
];

// Quán của Bot (fix cứng để dễ biểu diễn)
// Cá Viên: 18, 19 (ngang) | Trà Sữa: 45, 53, 61 (dọc)
const BOT_SHOPS = [
  {
    id: "cavien",
    name: "Xe Cá Viên",
    icon: "/cavienchien.png",
    size: 2,
    rot: 0,
    indices: [18, 19],
  },
  {
    id: "trasua",
    name: "Xe Trà Sữa",
    icon: "/trasua.png",
    size: 3,
    rot: 1,
    indices: [45, 53, 61],
  },
];
const BOT_SHIPS_INDICES = BOT_SHOPS.flatMap((s) => s.indices);
const TOTAL_CELLS = BOT_SHIPS_INDICES.length; // 5 ô mỗi bên

// CSS Icon vươn dài ra đúng ô
const getShopStyle = (size, rot) => {
  if (size === 2 && rot === 0) return "w-[195%] h-[90%] left-[2.5%]";
  if (size === 2 && rot === 1) return "w-[90%] h-[195%] top-[2.5%]";
  if (size === 3 && rot === 0) return "w-[295%] h-[90%] left-[2.5%]";
  if (size === 3 && rot === 1) return "w-[90%] h-[295%] top-[2.5%]";
  return "w-[90%] h-[90%]";
};

// Các ô quán sẽ chiếm khi đặt từ startIndex (chỉ gồm ô nằm trong bàn)
const getPlacementCells = (startIndex, size, rot) => {
  const r = Math.floor(startIndex / GRID_SIZE);
  const c = startIndex % GRID_SIZE;
  const cells = [];
  let inBounds = true;
  for (let i = 0; i < size; i++) {
    const tr = rot === 0 ? r : r + i;
    const tc = rot === 0 ? c + i : c;
    if (tr >= GRID_SIZE || tc >= GRID_SIZE) {
      inBounds = false;
      continue;
    }
    cells.push(tr * GRID_SIZE + tc);
  }
  return { cells, inBounds };
};

// Trả về mảng ô nếu đặt hợp lệ, ngược lại trả về null
const getValidPlacement = (board, startIndex, size, rot) => {
  const { cells, inBounds } = getPlacementCells(startIndex, size, rot);
  if (!inBounds) return null; // Tràn viền
  if (cells.some((idx) => board[idx] !== null)) return null; // Đè quán cũ
  return cells;
};

const isEnemyShopSunk = (board, shop) =>
  shop.indices.every((i) => board[i] === "HIT");

const isPlayerShopSunk = (board, shopId) => {
  const cells = board.filter((c) => c?.shopId === shopId);
  return cells.length > 0 && cells.every((c) => c.shot === "HIT");
};

export default function InteractiveTutorial({
  onComplete,
  soundEnabled,
  sfxVolume,
}) {
  const [phase, setPhase] = useState("WELCOME"); // WELCOME, SETUP, PLAYING, FINISHED
  const [guideText, setGuideText] = useState(
    "Chào mừng đến Săn Quán Hẻm! Chơi thử 1 ván siêu tốc với Bot để nắm rõ luật nhé.",
  );
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // Thiết bị nhập: cảm ứng (điện thoại/máy tính bảng) hay chuột
  const [isTouch, setIsTouch] = useState(detectCoarsePointer);
  const isTouchRef = useRef(isTouch);

  // --- STATES SETUP ---
  const [myBoard, setMyBoard] = useState(Array(64).fill(null));
  const [currentShopIdx, setCurrentShopIdx] = useState(0);
  const [rotation, setRotation] = useState(0); // 0: Ngang, 1: Dọc
  // Ô đang xem trước: chuột thì là ô đang rê qua, cảm ứng thì là ô vừa chạm
  const [previewIdx, setPreviewIdx] = useState(null);

  // --- STATES PLAYING ---
  const [enemyBoard, setEnemyBoard] = useState(Array(64).fill(null));
  const [turn, setTurn] = useState("PLAYER"); // PLAYER, BOT
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [showExplosion, setShowExplosion] = useState(false);

  const finishTimerRef = useRef(null);
  const allPlaced = currentShopIdx >= TUTORIAL_SHOPS.length;

  // Lời chào (trình duyệt di động có thể chặn âm thanh trước lần chạm đầu tiên, không sao)
  useEffect(() => {
    playSFX("success jingle.mp3", soundEnabled, sfxVolume);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dọn timer khi component bị đóng giữa chừng (ví dụ bấm Bỏ qua lúc đang nổ)
  useEffect(() => {
    return () => {
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    };
  }, []);

  // Ghi nhận loại thiết bị ở lần chạm/click gần nhất (bắt ở pha capture nên luôn chạy trước click)
  const handlePointerDown = (e) => {
    const touch = e.pointerType !== "mouse";
    isTouchRef.current = touch;
    setIsTouch((prev) => (prev === touch ? prev : touch));
  };

  // --- XEM TRƯỚC KHI ĐẶT QUÁN ---
  const preview = useMemo(() => {
    if (phase !== "SETUP" || previewIdx === null || allPlaced) return null;
    const shop = TUTORIAL_SHOPS[currentShopIdx];
    const { cells } = getPlacementCells(previewIdx, shop.size, rotation);
    const ok = Boolean(
      getValidPlacement(myBoard, previewIdx, shop.size, rotation),
    );
    return { cells: new Set(cells), ok };
  }, [phase, previewIdx, allPlaced, currentShopIdx, rotation, myBoard]);

  const getSetupIntro = () => {
    const shop = TUTORIAL_SHOPS[0];
    return isTouchRef.current
      ? `BƯỚC 1: XẾP QUÁN. Bấm 1 ô trên Sân Nhà để xem trước ${shop.name} (${shop.size} ô), bấm lần nữa để đặt. Nút XOAY đổi hướng.`
      : `BƯỚC 1: XẾP QUÁN. Chọn 1 ô trên Sân Nhà để đặt ${shop.name} (${shop.size} ô). Nút XOAY đổi hướng, ô xanh là đặt được, ô đỏ là không.`;
  };

  const getPendingHint = (idx, rot) => {
    const shop = TUTORIAL_SHOPS[currentShopIdx];
    const ok = Boolean(getValidPlacement(myBoard, idx, shop.size, rot));
    return ok
      ? "👆 Bấm lần nữa vào ô đó (hoặc nút ĐẶT QUÁN) để đặt. Muốn đổi hướng thì bấm XOAY."
      : "❌ Vị trí này tràn viền hoặc đè quán khác. Chọn ô khác hoặc bấm XOAY.";
  };

  const handleNextPhase = (nextPhase) => {
    playSFX("pop.mp3", soundEnabled, sfxVolume);
    setPhase(nextPhase);
    setPreviewIdx(null);
    if (nextPhase === "SETUP") {
      setGuideText(getSetupIntro());
    } else if (nextPhase === "PLAYING") {
      playSFX("success jingle.mp3", soundEnabled, sfxVolume);
      setGuideText(
        "VÀO TRẬN! Bot giấu 2 quán (tổng 5 ô) trên Sân Địch. Bấm vào 1 ô để bắn.",
      );
    }
  };

  // --- LOGIC XẾP QUÁN ---
  const handleRotate = () => {
    playSFX("pop.mp3", soundEnabled, sfxVolume);
    const nextRot = rotation === 0 ? 1 : 0;
    setRotation(nextRot);
    // Đang xem trước trên cảm ứng: cập nhật lời nhắc theo hướng mới
    if (isTouchRef.current && previewIdx !== null && !allPlaced) {
      setGuideText(getPendingHint(previewIdx, nextRot));
    }
  };

  const handleReset = () => {
    playSFX("pop.mp3", soundEnabled, sfxVolume);
    setMyBoard(Array(64).fill(null));
    setCurrentShopIdx(0);
    setRotation(0);
    setPreviewIdx(null);
    setGuideText("Đã dọn dẹp. Hãy xếp lại Xe Cá Viên nào!");
  };

  const handlePlaceShop = (index) => {
    if (phase !== "SETUP" || allPlaced || index === null) return;

    const shop = TUTORIAL_SHOPS[currentShopIdx];
    const indices = getValidPlacement(myBoard, index, shop.size, rotation);

    if (!indices) {
      playSFX("waterdrop.mp3", soundEnabled, sfxVolume);
      setGuideText(
        "❌ Không đặt được! Quán tràn ra ngoài hoặc đè lên quán khác.",
      );
      return;
    }

    playSFX("pop.mp3", soundEnabled, sfxVolume);
    const newBoard = [...myBoard];
    indices.forEach((idx, i) => {
      newBoard[idx] = {
        shopId: shop.id,
        isHead: i === 0, // Đánh dấu ô đầu tiên để render icon
        icon: shop.icon,
        rot: rotation,
        size: shop.size,
      };
    });
    setMyBoard(newBoard);
    setCurrentShopIdx((prev) => prev + 1);
    setPreviewIdx(null);

    if (currentShopIdx + 1 < TUTORIAL_SHOPS.length) {
      const next = TUTORIAL_SHOPS[currentShopIdx + 1];
      setGuideText(
        `Tốt lắm! 💡 Đừng xếp các quán dính sát nhau. Giờ đặt tiếp ${next.name} (${next.size} ô).`,
      );
    } else {
      setGuideText(
        "Đội hình sẵn sàng! Bấm ↩️ để xếp lại, hoặc bấm SẴN SÀNG để khiêu chiến Bot.",
      );
    }
  };

  // Bấm vào 1 ô của Sân Nhà khi xếp quán
  // - Chuột: đặt ngay (đã có xem trước khi rê chuột)
  // - Cảm ứng: bấm lần 1 để xem trước, bấm lần 2 (vào ô đó hoặc bất kỳ ô nào của quán đang xem trước) để đặt
  const handleSetupCellClick = (index) => {
    if (phase !== "SETUP" || allPlaced) return;

    if (!isTouchRef.current || previewIdx === index) {
      handlePlaceShop(index);
      return;
    }
    if (preview?.ok && preview.cells.has(index)) {
      handlePlaceShop(previewIdx);
      return;
    }

    playSFX("pop.mp3", soundEnabled, sfxVolume);
    setPreviewIdx(index);
    setGuideText(getPendingHint(index, rotation));
  };

  // --- LOGIC CHIẾN ĐẤU VỚI BOT ---
  const handlePlayerShoot = (index) => {
    // Khóa khi đang nổ để người chơi không bắn thêm trong lúc chờ kết thúc
    if (
      phase !== "PLAYING" ||
      turn !== "PLAYER" ||
      showExplosion ||
      enemyBoard[index] !== null
    )
      return;

    const isHit = BOT_SHIPS_INDICES.includes(index);
    const newEnemyBoard = [...enemyBoard];

    if (isHit) {
      playSFX("pop.mp3", soundEnabled, sfxVolume);
      newEnemyBoard[index] = "HIT";
      setEnemyBoard(newEnemyBoard);
      const newScore = playerScore + 1;
      setPlayerScore(newScore);

      if (newScore === TOTAL_CELLS) {
        setShowExplosion(true);
        setGuideText("💥💥 PHÁT BOM CUỐI CÙNG!");
        finishTimerRef.current = setTimeout(() => {
          playSFX("success jingle.mp3", soundEnabled, sfxVolume);
          setPhase("FINISHED");
          setGuideText(
            "🏆 BẠN ĐÃ TIÊU DIỆT TOÀN BỘ QUÁN CỦA BOT! Chúc mừng bạn tốt nghiệp.",
          );
        }, 1200);
        return;
      }

      const justSunk = BOT_SHOPS.find(
        (s) =>
          !isEnemyShopSunk(enemyBoard, s) && isEnemyShopSunk(newEnemyBoard, s),
      );
      if (justSunk) {
        setGuideText(
          `🔥 ĐÃ ĐÁNH SẬP ${justSunk.name.toUpperCase()}! Bạn vẫn được bắn tiếp, hãy tìm quán còn lại.`,
        );
      } else {
        setGuideText(
          "💥 TRÚNG RỒI! Bắn trúng được BẮN TIẾP. Quán nằm thẳng hàng, hãy thử các ô kề bên (trên, dưới, trái, phải)!",
        );
      }
    } else {
      playSFX("waterdrop.mp3", soundEnabled, sfxVolume);
      newEnemyBoard[index] = "MISS";
      setEnemyBoard(newEnemyBoard);
      setTurn("BOT");
      setGuideText("💦 Trượt rồi! Bạn MẤT LƯỢT. Chờ Bot bắn...");
    }
  };

  // Bot Auto Shoot
  useEffect(() => {
    if (phase !== "PLAYING" || turn !== "BOT") return;

    const timer = setTimeout(() => {
      // Tìm ô chưa bắn
      const candidates = [];
      myBoard.forEach((cell, idx) => {
        if (!cell?.shot) candidates.push(idx);
      });

      // Đây là bài tập hướng dẫn nên Bot KHÔNG được thắng:
      // khi chỉ còn đúng 1 ô quán của người chơi chưa bị bắn, Bot sẽ né ô đó.
      const remainingShipCells = candidates.filter(
        (idx) => myBoard[idx]?.shopId,
      );
      const pool =
        remainingShipCells.length === 1
          ? candidates.filter((idx) => idx !== remainingShipCells[0])
          : candidates;

      if (pool.length === 0) {
        setTurn("PLAYER");
        return;
      }

      const randomIdx = pool[Math.floor(Math.random() * pool.length)];
      const isHit = Boolean(myBoard[randomIdx]?.shopId);
      const newMyBoard = [...myBoard];

      if (isHit) {
        playSFX("pop.mp3", soundEnabled, sfxVolume);
        newMyBoard[randomIdx] = { ...newMyBoard[randomIdx], shot: "HIT" };
        setMyBoard(newMyBoard);
        setBotScore((prev) => prev + 1);

        const justSunk = TUTORIAL_SHOPS.find(
          (s) =>
            !isPlayerShopSunk(myBoard, s.id) &&
            isPlayerShopSunk(newMyBoard, s.id),
        );
        setGuideText(
          justSunk
            ? `⚠️ ${justSunk.name} của bạn đã bị đánh sập! Bot được bắn tiếp.`
            : "⚠️ BÁO ĐỘNG! Bot bắn trúng quán của bạn và được bắn tiếp!",
        );
        // Bot tiếp tục lượt (turn vẫn là BOT, effect chạy lại do myBoard đổi)
      } else {
        playSFX("waterdrop.mp3", soundEnabled, sfxVolume);
        newMyBoard[randomIdx] = {
          ...(newMyBoard[randomIdx] || {}),
          shot: "MISS",
        };
        setMyBoard(newMyBoard);
        setTurn("PLAYER");
        setGuideText(
          "🛡️ Bot bắn hụt! Tới lượt bạn. (Trận thật mỗi lượt chỉ có 25 giây nhé.)",
        );
      }
    }, 1500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, phase, myBoard]);

  const sunkEnemyShops = BOT_SHOPS.filter((s) =>
    isEnemyShopSunk(enemyBoard, s),
  );

  // --- NÚT HÀNH ĐỘNG CHÍNH Ở MÀN XẾP QUÁN ---
  const canConfirmPlacement = isTouch && !allPlaced && Boolean(preview?.ok);
  const primaryEnabled = allPlaced || canConfirmPlacement;
  const primaryLabel = allPlaced
    ? "🚀 SẴN SÀNG!"
    : canConfirmPlacement
      ? "✅ ĐẶT QUÁN"
      : isTouch
        ? "👆 Chọn 1 ô trên sân"
        : `Hãy đặt đủ ${TUTORIAL_SHOPS.length} quán`;
  const primaryColor = allPlaced
    ? "bg-emerald-500 text-slate-950 animate-pulse"
    : canConfirmPlacement
      ? "bg-amber-400 text-slate-950"
      : "bg-slate-800 text-slate-500 opacity-60";

  // --- RENDER BÀN CỜ CHUẨN UI ---
  const renderGrid = (board, { isEnemy = false, showPreview = false } = {}) => (
    <div
      className="absolute inset-0 grid gap-px w-full h-full p-[8.5%]"
      style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
      onPointerLeave={(e) => {
        // Chỉ chuột mới xóa xem trước khi rời bàn; cảm ứng giữ lại để bấm lần 2
        if (showPreview && e.pointerType === "mouse") setPreviewIdx(null);
      }}
    >
      {board.map((cell, i) => {
        const previewState =
          showPreview && preview?.cells.has(i)
            ? preview.ok
              ? "ok"
              : "bad"
            : null;
        const sunkShop = isEnemy
          ? sunkEnemyShops.find((s) => s.indices[0] === i)
          : null;

        return (
          <div
            key={i}
            aria-label={`Ô hàng ${Math.floor(i / GRID_SIZE) + 1} cột ${(i % GRID_SIZE) + 1}`}
            onClick={() =>
              isEnemy ? handlePlayerShoot(i) : handleSetupCellClick(i)
            }
            onPointerEnter={(e) => {
              if (showPreview && !allPlaced && e.pointerType === "mouse")
                setPreviewIdx(i);
            }}
            className={`relative w-full h-full border border-white/10 rounded-sm transition-all flex items-center justify-center overflow-visible
              ${isEnemy && turn === "PLAYER" && !showExplosion && cell === null ? "hover:bg-rose-500/30 cursor-crosshair" : ""}
              ${showPreview && !allPlaced ? "cursor-pointer" : ""}
              ${
                previewState === "ok"
                  ? "bg-emerald-400/40"
                  : previewState === "bad"
                    ? "bg-rose-500/40"
                    : !isEnemy && cell?.shopId
                      ? "bg-emerald-900/40 outline-solid outline-2 -outline-offset-2 outline-emerald-400"
                      : "bg-slate-800/80"
              }
            `}
          >
            {/* Sân Nhà: Render Icon Quán */}
            {!isEnemy && cell?.isHead && (
              <img
                src={cell.icon}
                alt=""
                draggable={false}
                className={`absolute z-10 object-contain drop-shadow-md pointer-events-none ${getShopStyle(cell.size, cell.rot)}`}
              />
            )}

            {/* Sân Địch: Lộ icon quán khi đã bị đánh sập */}
            {sunkShop && (
              <img
                src={sunkShop.icon}
                alt={sunkShop.name}
                draggable={false}
                className={`absolute z-10 object-contain drop-shadow-md pointer-events-none grayscale opacity-70 ${getShopStyle(sunkShop.size, sunkShop.rot)}`}
              />
            )}

            {/* Sân Nhà: Bị Bot Bắn */}
            {!isEnemy && cell?.shot === "MISS" && (
              <img
                src="/khongtrung.png"
                alt="Trượt"
                draggable={false}
                className="absolute inset-0 w-[80%] h-[80%] m-auto object-contain opacity-80 z-20 pointer-events-none"
              />
            )}
            {!isEnemy && cell?.shot === "HIT" && (
              <img
                src="/trung.png"
                alt="Trúng"
                draggable={false}
                className="absolute inset-0 w-[120%] h-[120%] m-auto object-contain z-30 pointer-events-none animate-bounce"
              />
            )}

            {/* Sân Địch: Mình Bắn */}
            {isEnemy && cell === "MISS" && (
              <img
                src="/khongtrung.png"
                alt="Trượt"
                draggable={false}
                className="absolute inset-0 w-[80%] h-[80%] m-auto object-contain opacity-80 z-20 pointer-events-none"
              />
            )}
            {isEnemy && cell === "HIT" && (
              <img
                src="/trung.png"
                alt="Trúng"
                draggable={false}
                className="absolute inset-0 w-[120%] h-[120%] m-auto object-contain z-30 pointer-events-none animate-bounce"
              />
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      className="absolute inset-0 z-[110] bg-slate-950/95 backdrop-blur-xl animate-fade-in select-none touch-manipulation overscroll-contain [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]"
      onPointerDownCapture={handlePointerDown}
    >
      {/* Vùng cuộn: nếu màn hình quá thấp thì cuộn dọc thay vì bị cắt nội dung */}
      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className="min-h-full flex flex-col items-center justify-center gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {/* Thanh trên: nút Bỏ qua (nằm trong luồng nên không đè lên khung hướng dẫn) */}
          <div className="w-full max-w-lg flex justify-end min-h-[40px]">
            {phase !== "FINISHED" && (
              <button
                onClick={() => {
                  playSFX("pop.mp3", soundEnabled, sfxVolume);
                  setShowSkipConfirm(true);
                }}
                className="min-h-[40px] bg-slate-800/80 border border-slate-600 text-slate-300 font-bold px-4 rounded-xl text-xs hover:bg-slate-700 hover:text-white active:scale-95 transition backdrop-blur-md"
              >
                Bỏ qua ⏭️
              </button>
            )}
          </div>

          {/* --- KHUNG HỘI THOẠI TRỢ LÝ (chiều cao cố định để bàn cờ không bị nhảy khi đổi chữ) --- */}
          <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-3 md:p-4 w-full max-w-lg shadow-[0_0_30px_rgba(245,158,11,0.15)] flex flex-col items-center text-center z-30">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg animate-bounce">👩‍🏫</span>
              <h3 className="text-amber-400 font-black uppercase tracking-wider text-xs md:text-sm">
                Hệ Thống Huấn Luyện
              </h3>
            </div>
            <p
              className="text-slate-200 text-[13px] md:text-sm font-medium leading-relaxed min-h-[5rem] md:min-h-[2.5rem] flex items-center justify-center"
              aria-live="polite"
            >
              {guideText}
            </p>
          </div>

          {/* --- MÀN HÌNH WELCOME & FINISHED --- */}
          {(phase === "WELCOME" || phase === "FINISHED") && (
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 md:p-6 w-full max-w-lg text-center animate-pop-in shadow-2xl">
              <div className="text-5xl md:text-6xl mb-4 drop-shadow-lg">
                {phase === "WELCOME" ? "🎓" : "🏆"}
              </div>

              {phase === "FINISHED" && (
                <div className="text-left bg-slate-950 p-4 rounded-xl border border-slate-800 mb-5 space-y-3">
                  <p className="text-sm">
                    <b className="text-emerald-400">✅ Mẹo giấu quán:</b> Rải
                    rác sát góc, đổi hướng linh hoạt.
                  </p>
                  <p className="text-sm">
                    <b className="text-amber-400">🎯 Bắn trúng bắn tiếp:</b> Tận
                    dụng rà quét hình dáng quán địch.
                  </p>
                  <p className="text-sm">
                    <b className="text-rose-400">⏱️ Luật 25 giây:</b> Quá giờ,
                    hệ thống tự thả bom bừa bãi!
                  </p>
                  <p className="text-sm">
                    <b className="text-blue-400">🤝 Chế độ 2v2:</b> Bạn và đồng
                    đội chung 1 bàn cờ 12x12 siêu to.
                  </p>
                </div>
              )}

              <button
                onClick={
                  phase === "WELCOME"
                    ? () => handleNextPhase("SETUP")
                    : onComplete
                }
                className="w-full min-h-[48px] bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-white font-black py-3.5 rounded-xl uppercase tracking-wider active:scale-95 transition shadow-lg animate-pulse"
              >
                {phase === "WELCOME"
                  ? "Vào Thực Chiến 🚀"
                  : "HOÀN TẤT HUẤN LUYỆN"}
              </button>
            </div>
          )}

          {/* --- MÀN HÌNH SETUP (XẾP QUÁN) --- */}
          {phase === "SETUP" && (
            <div
              className="flex flex-col md:flex-row gap-3 md:gap-6 w-full items-center justify-center animate-fade-in"
              style={{ "--board": SETUP_BOARD_SIZE }}
            >
              {/* Sân Nhà (trên cùng trên điện thoại) */}
              <div className="order-1 md:order-2 w-full max-w-[var(--board)] flex flex-col items-center gap-1.5">
                <span className="font-black text-xs text-emerald-400 uppercase drop-shadow">
                  🏠 Sân Nhà Của Bạn
                </span>
                <div className="relative w-full aspect-square bg-slate-900 rounded-2xl p-1 border-2 border-slate-700 shadow-2xl">
                  <img
                    src="/bg8x8.png"
                    alt=""
                    draggable={false}
                    className="absolute inset-0 w-full h-full object-fill rounded-xl pointer-events-none"
                  />
                  {renderGrid(myBoard, { showPreview: true })}
                </div>
              </div>

              {/* Bảng điều khiển (gọn, nằm ngay dưới bàn cờ để ngón cái với tới) */}
              <div className="order-2 md:order-1 w-full max-w-[var(--board)] md:max-w-none md:w-56 bg-slate-900 border border-slate-700 p-3 md:p-4 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-20 shrink-0 flex items-center justify-center bg-amber-500/10 border-2 border-amber-400/50 rounded-xl p-1">
                    {!allPlaced ? (
                      <img
                        src={TUTORIAL_SHOPS[currentShopIdx].icon}
                        alt={TUTORIAL_SHOPS[currentShopIdx].name}
                        draggable={false}
                        className="h-full object-contain drop-shadow-md animate-pulse"
                      />
                    ) : (
                      <span className="text-lg">✔️</span>
                    )}
                  </div>
                  <div className="text-left min-w-0">
                    <div className="text-[10px] font-black text-slate-400 uppercase">
                      {allPlaced
                        ? "Đã xếp đủ"
                        : `Đang xếp ${currentShopIdx + 1}/${TUTORIAL_SHOPS.length}`}
                    </div>
                    <div className="text-sm font-black text-amber-300 truncate">
                      {allPlaced
                        ? "Sẵn sàng khiêu chiến Bot"
                        : `${TUTORIAL_SHOPS[currentShopIdx].name} · ${TUTORIAL_SHOPS[currentShopIdx].size} ô`}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleRotate}
                    className="flex-1 min-h-[44px] bg-indigo-600 hover:bg-indigo-500 active:scale-95 font-black text-xs rounded-xl shadow transition text-white"
                  >
                    🔄 XOAY ({rotation === 0 ? "Ngang" : "Dọc"})
                  </button>
                  <button
                    onClick={handleReset}
                    aria-label="Đặt lại"
                    title="Đặt lại"
                    className="w-12 min-h-[44px] bg-slate-800 hover:bg-slate-700 active:scale-95 font-black text-sm rounded-xl transition text-white"
                  >
                    ↩️
                  </button>
                </div>

                <button
                  onClick={() =>
                    allPlaced
                      ? handleNextPhase("PLAYING")
                      : handlePlaceShop(previewIdx)
                  }
                  disabled={!primaryEnabled}
                  className={`w-full min-h-[48px] font-black rounded-xl text-xs uppercase active:scale-95 transition shadow-lg ${primaryColor}`}
                >
                  {primaryLabel}
                </button>
              </div>
            </div>
          )}

          {/* --- MÀN HÌNH PLAYING (CHIẾN ĐẤU VỚI BOT) --- */}
          {phase === "PLAYING" && (
            <div
              className="flex flex-col md:flex-row gap-3 md:gap-6 w-full items-center justify-center animate-fade-in"
              style={{ "--board": ENEMY_BOARD_SIZE }}
            >
              {/* Sân Địch Lớn (trên cùng trên điện thoại) */}
              <div className="order-1 md:order-2 w-full max-w-[var(--board)] flex flex-col items-center gap-1.5">
                <span
                  className={`px-4 py-1 rounded-full font-black text-xs uppercase border-2 bg-slate-950 ${turn === "PLAYER" ? "text-amber-400 border-amber-500 animate-pulse" : "text-rose-400 border-rose-500"}`}
                >
                  {turn === "PLAYER"
                    ? "⏱️ LƯỢT BẠN BẮN"
                    : "⏳ ĐỊCH ĐANG NGẮM..."}
                </span>
                <div
                  className={`relative w-full aspect-square bg-slate-900 rounded-2xl p-1 border-2 shadow-2xl transition-all ${turn === "PLAYER" ? "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]" : "border-rose-500 shadow-[0_0_20px_rgba(225,29,72,0.3)]"} ${showExplosion ? "animate-shake" : ""}`}
                >
                  <img
                    src="/bg8x8.png"
                    alt=""
                    draggable={false}
                    className="absolute inset-0 w-full h-full object-fill rounded-xl pointer-events-none"
                  />
                  {renderGrid(enemyBoard, { isEnemy: true })}

                  {/* Hiệu ứng Nổ */}
                  {showExplosion && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center mix-blend-screen pointer-events-none">
                      <img
                        src="/explosion.gif"
                        alt=""
                        className="w-[140%] h-[140%] md:w-[180%] md:h-[180%] object-cover opacity-90"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Hàng dưới: Sân Nhà thu nhỏ + bảng điểm (một hàng ngang để tiết kiệm chiều cao) */}
              <div className="order-2 md:order-1 w-full max-w-sm md:max-w-none md:w-auto flex flex-row md:flex-col items-center justify-center gap-3 md:gap-4">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <span className="font-black text-[9px] text-emerald-400 uppercase drop-shadow">
                    🏠 Sân Nhà
                  </span>
                  <div className="relative w-24 md:w-48 aspect-square bg-slate-900 rounded-xl p-0.5 border-2 border-slate-700 shadow-xl opacity-80 pointer-events-none">
                    <img
                      src="/bg8x8.png"
                      alt=""
                      draggable={false}
                      className="absolute inset-0 w-full h-full object-fill rounded-lg pointer-events-none"
                    />
                    {renderGrid(myBoard)}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-[10px] md:text-[11px] font-black uppercase min-w-0">
                  <span className="px-3 py-1.5 rounded-full bg-slate-900 border border-amber-500/50 text-amber-300 whitespace-nowrap">
                    🎯 Bạn trúng {playerScore}/{TOTAL_CELLS}
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-slate-900 border border-rose-500/50 text-rose-300 whitespace-nowrap">
                    ⚠️ Bị trúng {botScore}/{TOTAL_CELLS}
                  </span>
                  <span className="text-[10px] normal-case text-slate-400 font-bold leading-snug">
                    💥 Trúng = bắn tiếp
                    <br />
                    💦 Trượt = mất lượt
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL XÁC NHẬN BỎ QUA (nằm ngoài vùng cuộn để luôn phủ kín màn hình) */}
      {showSkipConfirm && (
        <div className="absolute inset-0 z-[130] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border-2 border-slate-700 rounded-3xl p-5 md:p-6 text-center shadow-2xl">
            <h3 className="text-xl font-black text-amber-400 mb-2 uppercase">
              Chắc chắn bỏ qua?
            </h3>
            <p className="text-sm text-slate-300 mb-6 font-medium">
              Khóa huấn luyện này chỉ mất 1 phút thôi, giúp bạn làm quen 100% cơ
              chế chiến đấu và tránh bị ăn hành oan uổng đấy!
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={onComplete}
                className="w-full min-h-[48px] bg-amber-500 hover:bg-yellow-400 text-slate-950 font-black py-3 rounded-xl text-xs uppercase tracking-wider active:scale-95 transition shadow"
              >
                Bỏ qua luôn
              </button>
              <button
                onClick={() => setShowSkipConfirm(false)}
                className="w-full min-h-[48px] bg-slate-800 hover:bg-slate-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider active:scale-95 transition shadow border border-slate-600"
              >
                Quay lại tập tiếp
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0) translateY(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px) translateY(3px) rotate(-1deg); }
          20%, 40%, 60%, 80% { transform: translateX(5px) translateY(-3px) rotate(1deg); }
        }
        .animate-shake { animation: shake 0.8s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>
    </div>
  );
}
