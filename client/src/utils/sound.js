// Variable lưu instance nhạc nền đang phát
let currentBGM = null;

/**
 * Phát hiệu ứng âm thanh ngắn (SFX)
 */
export const playSFX = (soundName, soundEnabled = true, volume = 0.8) => {
  if (!soundEnabled) return;
  try {
    const audio = new Audio(`/sounds/${soundName}`);
    audio.volume = volume;
    audio.play().catch(() => {}); // Tránh lỗi Autoplay Policy
  } catch (e) {
    console.error("SFX Error:", e);
  }
};

/**
 * Phát Nhạc Nền lặp lại (BGM)
 */
export const playBGM = (bgmName, soundEnabled = true, volume = 0.4) => {
  if (!soundEnabled) {
    stopBGM();
    return;
  }

  // Nếu đang phát đúng bài đó rồi thì không load lại
  if (currentBGM && currentBGM.src.includes(bgmName) && !currentBGM.paused) {
    return;
  }

  stopBGM();

  try {
    currentBGM = new Audio(`/sounds/${bgmName}`);
    currentBGM.loop = true;
    currentBGM.volume = volume;
    currentBGM.play().catch(() => {});
  } catch (e) {
    console.error("BGM Error:", e);
  }
};

/**
 * Dừng Nhạc Nền
 */
export const stopBGM = () => {
  if (currentBGM) {
    currentBGM.pause();
    currentBGM.currentTime = 0;
    currentBGM = null;
  }
};
