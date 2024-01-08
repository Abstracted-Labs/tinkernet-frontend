export function capitalizeFirst(str: string | undefined | null): string {
  if (typeof str !== 'string') {
    throw new Error('Input must be a string');
  }

  if (str === undefined || str === null || str.length === 0) {
    throw new Error('Input string must not be empty or null or undefined');
  }

  return str.charAt(0).toUpperCase() + str.slice(1);
}