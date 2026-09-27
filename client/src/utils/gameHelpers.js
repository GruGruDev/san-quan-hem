import { SHOPS } from "../constants/game";

export const getOccupiedIndices = (startIndex, size, horizontal) => {
  if (startIndex === null || startIndex < 0 || startIndex >= 64) return null;

  let row = Math.floor(startIndex / 8);
  let col = startIndex % 8;

  if (horizontal && col + size > 8) col = 8 - size;
  if (!horizontal && row + size > 8) row = 8 - size;

  const adjustedIndex = row * 8 + col;
  const indices = [];

  for (let i = 0; i < size; i++) {
    indices.push(horizontal ? adjustedIndex + i : adjustedIndex + i * 8);
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
