import { useEffect, useState } from "react";

// A Date that refreshes on an interval, so clocks and "x ago" labels stay current.
export default function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
