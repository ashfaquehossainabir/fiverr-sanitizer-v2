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