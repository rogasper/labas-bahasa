import { useState, useEffect } from "react";

/** Debounce a value by `delay` ms. Returns the debounced value and a setter.
 *  Resets internal timer whenever the setter is called. */
export function useDebouncedValue<T>(initial: T, delay = 300) {
  const [value, setValue] = useState<T>(initial);
  const [debounced, setDebounced] = useState<T>(initial);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return [value, debounced, setValue] as const;
}
