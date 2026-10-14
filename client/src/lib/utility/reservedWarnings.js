import { RESERVED_KEYWORDS } from "../sanitizer.js"

export function getReservedWarnings(text) {
  if (!text) return [];

  const warnings = [];

  RESERVED_KEYWORDS.forEach((keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");

    if (regex.test(text)) {
      warnings.push({
        keyword,
        message: `"${keyword}" is a restricted keyword and has been sanitized.`,
        type: "reserved"
      });
    }
  });

  return warnings;
}

// Phone numbers written with spaces, dots, dashes or brackets (e.g. "555-123-4567",
// "+1 (555) 123 4567") are not masked by the sanitizer, so flag them. Dates and
// times (which contain ":" or have fewer than 10 digits) are ignored.
const PHONE_LIKE = /(?<![\w:/.-])\+?\d[\d\s().-]{8,}\d(?![\w:])/g;

export function getPhoneWarnings(text) {
  if (!text) return [];
  const seen = new Set();
  const warnings = [];
  for (const raw of text.match(PHONE_LIKE) || []) {
    const match = raw.trim();
    const digits = match.replace(/\D/g, "");
    const alreadyMasked = /^\d(-\d)+$/.test(match);
    if (digits.length < 10 || digits.length > 15 || alreadyMasked || !/[\s().+-]/.test(match) || seen.has(match)) continue;
    seen.add(match);
    warnings.push({
      keyword: match,
      message: `"${match}" looks like a phone number and is not masked. Remove it or write it digit by digit with hyphens.`,
      type: "phone"
    });
  }
  return warnings;
}
