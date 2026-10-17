import { useEffect, useState } from "react";

// Returns `value` only after it has stopped changing for `delay` ms.
// Keep the input bound to the live state and filter with the debounced one.
export default function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
