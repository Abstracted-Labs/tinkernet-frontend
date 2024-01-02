export const formatNumberShorthand = (num: number) => {
  if (num > 999 && num <= 999999) {
    const formattedNum = (num / 1000).toFixed(1);
    // Remove decimal if the 1000th place is a zero
    return formattedNum.endsWith('.0') ? `${ formattedNum.slice(0, -2) }K` : `${ formattedNum }K`;
  } else if (num > 999999) {
    const formattedNum = (num / 1000000).toFixed(1);
    // Remove decimal if the millionth place is a zero
    return formattedNum.endsWith('.0') ? `${ formattedNum.slice(0, -2) }M` : `${ formattedNum }M`;
  } else {
    let formattedNum = num.toString();
    const decimalIndex = formattedNum.indexOf('.');
    // If the number has more than two decimal places, remove the extra ones
    if (decimalIndex !== -1 && formattedNum.length > decimalIndex + 3) {
      formattedNum = formattedNum.slice(0, decimalIndex + 3);
    }
    return formattedNum;
  }
};