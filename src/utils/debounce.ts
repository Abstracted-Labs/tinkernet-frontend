export function debounce<T extends unknown[]>(func: (...args: T) => void, wait: number): (...args: T) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function executedFunction(...args: T) {
    const later = () => {
      if (timeout !== null) {
        clearTimeout(timeout);
      }
      func(...args);
    };
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}