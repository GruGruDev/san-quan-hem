import { SHOPS } from "../constants/game";

export const getOccupiedIndices = (
  startIndex,
  size,
  horizontal,
  boardSize = 8,
) => {
  if (
    startIndex === null ||
    startIndex < 0 ||
    startIndex >= boardSize * boardSize ||
    size > boardSize
  ) {
    return null;
  }

  let row = Math.floor(startIndex / boardSize);
  let col = startIndex % boardSize;

  if (horizontal && col + size > boardSize) col = boardSize - size;
  if (!horizontal && row + size > boardSize) row = boardSize - size;

  const adjustedIndex = row * boardSize + col;
  const indices = [];

  for (let i = 0; i < size; i++) {
    indices.push(
      horizontal ? adjustedIndex + i : adjustedIndex + i * boardSize,
    );
  }
  return indices;
};

export const isValidPlacement = (
  startIndex,
  selectedShopIndex,
  isHorizontal,
  myBoard,
) => {
  if (selectedShopIndex >= SHOPS.length) return false;
  const shop = SHOPS[selectedShopIndex];
  const indices = getOccupiedIndices(startIndex, shop.size, isHorizontal);
  if (!indices) return false;
  return !indices.some((idx) => myBoard[idx] !== null);
};
