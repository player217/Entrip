/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * @param fn The function to debounce
 * @param delay The number of milliseconds to delay (default: 300)
 * @returns The debounced function
 */
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay = 300
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | undefined;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Creates a debounced async function
 * @param fn The async function to debounce
 * @param delay The number of milliseconds to delay (default: 300)
 * @returns The debounced async function
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay = 300
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: NodeJS.Timeout | undefined;
  
  return (...args: Parameters<T>) => {
    return new Promise((resolve, reject) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  };
}