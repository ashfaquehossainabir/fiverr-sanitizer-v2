// Client time zones: show a buyer's local time so you know when a reply will be
// seen, and when it's a polite hour to message them.

export const ZONES = [
  ["Pacific/Honolulu", "Honolulu"],
  ["America/Anchorage", "Anchorage"],
  ["America/Los_Angeles", "Los Angeles"],
  ["America/Vancouver", "Vancouver"],
  ["America/Denver", "Denver"],
  ["America/Chicago", "Chicago"],
  ["America/Mexico_City", "Mexico City"],
  ["America/New_York", "New York"],
  ["America/Toronto", "Toronto"],
  ["America/Bogota", "Bogotá"],
  ["America/Sao_Paulo", "São Paulo"],
  ["America/Argentina/Buenos_Aires", "Buenos Aires"],
  ["Atlantic/Reykjavik", "Reykjavík"],
  ["Europe/London", "London"],
  ["Europe/Dublin", "Dublin"],
  ["Europe/Lisbon", "Lisbon"],
  ["Europe/Paris", "Paris"],
  ["Europe/Berlin", "Berlin"],
  ["Europe/Madrid", "Madrid"],
  ["Europe/Rome", "Rome"],
  ["Europe/Amsterdam", "Amsterdam"],
  ["Europe/Stockholm", "Stockholm"],
  ["Europe/Warsaw", "Warsaw"],
  ["Europe/Athens", "Athens"],
  ["Europe/Istanbul", "Istanbul"],
  ["Europe/Kyiv", "Kyiv"],
  ["Europe/Moscow", "Moscow"],
  ["Africa/Lagos", "Lagos"],
  ["Africa/Cairo", "Cairo"],
  ["Africa/Johannesburg", "Johannesburg"],
  ["Africa/Nairobi", "Nairobi"],
  ["Asia/Dubai", "Dubai"],
  ["Asia/Riyadh", "Riyadh"],
  ["Asia/Karachi", "Karachi"],
  ["Asia/Kolkata", "India"],
  ["Asia/Dhaka", "Dhaka"],
  ["Asia/Bangkok", "Bangkok"],
  ["Asia/Jakarta", "Jakarta"],
  ["Asia/Singapore", "Singapore"],
  ["Asia/Hong_Kong", "Hong Kong"],
  ["Asia/Shanghai", "China"],
  ["Asia/Manila", "Manila"],
  ["Asia/Seoul", "Seoul"],
  ["Asia/Tokyo", "Tokyo"],
  ["Australia/Perth", "Perth"],
  ["Australia/Sydney", "Sydney"],
  ["Pacific/Auckland", "Auckland"]
];

const LABELS = Object.fromEntries(ZONES);

export function zoneLabel(tz) {
  if (!tz) return "";
  return LABELS[tz] || tz.split("/").pop().replace(/_/g, " ");
}

export function isValidZone(tz) {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const ymd = (d, tz) => d.toLocaleDateString("en-CA", tz ? { timeZone: tz } : undefined);

/**
 * Local time at `tz`: formatted time, the hour (0-23), how many calendar days it
 * differs from the user's own date, and whether it's a considerate hour (8:00-21:00).
 * Returns null for a missing/unknown zone.
 */
export function localTimeInfo(tz, now = new Date()) {
  if (!isValidZone(tz)) return null;
  const time = now.toLocaleTimeString([], { timeZone: tz, hour: "numeric", minute: "2-digit" });
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" })
      .formatToParts(now)
      .find((p) => p.type === "hour")?.value
  );
  const theirs = Date.parse(`${ymd(now, tz)}T00:00:00Z`);
  const mine = Date.parse(`${ymd(now)}T00:00:00Z`);
  const dayDiff = Math.round((theirs - mine) / 86400000);
  return { time, hour, dayDiff, awake: hour >= 8 && hour < 21 };
}

export function dayWord(dayDiff) {
  if (dayDiff === 0) return "";
  return dayDiff > 0 ? "tomorrow" : "yesterday";
}
