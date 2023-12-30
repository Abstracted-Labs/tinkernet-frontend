export const formatNumberShorthand = (num: number) => {
  if (num > 999 && num <= 999999) {
    return (num / 1000).toFixed(1) + 'K';
  } else if (num > 999999) {
    return (num / 1000000).toFixed(1) + 'M';
  } else {
    return num.toString();
  }
};