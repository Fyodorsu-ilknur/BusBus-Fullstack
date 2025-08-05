// frontend/src/utils/formatters.js

export const formatTime = (totalSeconds) => {
  if (totalSeconds === null || isNaN(totalSeconds) || totalSeconds < 0) return 'Hesaplanıyor...';
  if (totalSeconds < 1) return 'Vardı';

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);

  if (minutes > 0) {
      return `${minutes} dk ${seconds} sn`;
  } else {
      return `${seconds} sn`;
  }
};