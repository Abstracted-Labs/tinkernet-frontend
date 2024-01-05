import BigNumber from "bignumber.js";

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

export const formatBalanceToTwoDecimals = (balance: BigNumber) => {
  const balanceWithDecimals = balance.dividedBy(new BigNumber(10).pow(12)).toString();
  const parts = balanceWithDecimals.split('.');
  if (parts[1]) {
    if (parts[1].length > 2) {
      parts[1] = parts[1].substring(0, 2);
    } else if (parts[1].length === 1) {
      parts[1] += '0'; // Append a zero if there's only one digit after the decimal point
    }
  }
  const formattedNumber = parseFloat(parts.join('.')).toLocaleString('en');
  return formattedNumber;
};