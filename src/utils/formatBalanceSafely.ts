import { formatBalance } from "@polkadot/util";
import BigNumber from "bignumber.js";

export const formatBalanceSafely = (value: string | BigNumber) => {
  try {
    let valueAsBigNumber;
    if (BigNumber.isBigNumber(value)) {
      valueAsBigNumber = value;
    } else {
      // Convert string to BigNumber
      valueAsBigNumber = new BigNumber(value);
    }

    // Scale the BigNumber value by 10^12 to avoid scientific notation for large/small numbers
    const scaledValue = valueAsBigNumber.multipliedBy(new BigNumber(10).pow(12));
    let valueAsString = scaledValue.toString(10);
    // Check if the value is in scientific notation, even after scaling
    if (/^(\d+(\.\d+)?)(e[+-]\d+)$/.test(valueAsString)) {
      const numParts = valueAsString.split('e');
      valueAsString = new BigNumber(numParts[0]).multipliedBy(new BigNumber(10).pow(numParts[1])).toString(10);
    }
    // Adjust the string back by dividing the scale, ensuring integer division
    valueAsString = new BigNumber(valueAsString).dividedBy(new BigNumber(10).pow(12)).toString(10);

    // Validate that the value is a string containing only digits and optionally a single dot for decimal values
    if (!/^\d*\.?\d*$/.test(valueAsString)) {
      console.error("Invalid value for formatting, contains non-numeric characters:", value);
      return "Invalid Input"; // Return a placeholder or handle the error as appropriate
    }

    // If the value is valid, call formatBalance
    return formatBalance(valueAsString, { decimals: 12, withUnit: "TNKR", forceUnit: "-" });
  } catch (error) {
    console.error("Error formatting balance:", error);
    return "Error"; // Error or fallback value
  }
};