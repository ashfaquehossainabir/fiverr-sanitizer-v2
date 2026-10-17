// Compact number formatting used by the Today chips, saved-message word counts,
// Overview stats, template usage counts and client/order amounts.
//
//   below 1000     -> exact number      750, 980
//   1000           -> 1K
//   1001 - 1099    -> 1K+
//   1100           -> 1.1K
//   1101 - 1199    -> 1.1K+   (1120, 1155, 1178, 1190 ...)
//   1,000,000      -> 1M
//   1,000,001+     -> 1M+     (1.1M, 1.1M+ and so on, same pattern as K)
//
// The value is always rounded DOWN to the nearest 0.1 of its unit, and a "+"
// is added whenever the real number is above that rounded value.
const UNITS = [
  [1e9, "B"],
  [1e6, "M"],
  [1e3, "K"]
];

export function formatCompact(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";

  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);

  if (abs < 1000) {
    const text = Number.isInteger(abs) ? String(abs) : abs.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return sign + text;
  }

  const [unit, suffix] = UNITS.find(([u]) => abs >= u);
  const step = unit / 10; // 0.1 of the unit (100 for K, 100,000 for M)
  const tenths = Math.floor(abs / step); // whole number of 0.1 steps, avoids float noise
  const exact = abs === tenths * step;
  const whole = Math.floor(tenths / 10);
  const decimal = tenths % 10;
  const text = decimal ? `${whole}.${decimal}` : `${whole}`;

  return `${sign}${text}${suffix}${exact ? "" : "+"}`;
}
