import { RESERVED_KEYWORDS } from "../sanitizer.js";
import { extractVariables } from "../templateVars.js";

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

// The sanitizer strips "{" and "}", so a template placeholder that was never filled in
// (e.g. {{client}}) would be copied or saved as the plain word "client". Flag it.
export function getPlaceholderWarnings(text) {
  return extractVariables(text).map((name) => ({
    keyword: name,
    message: `The placeholder "{{${name}}}" is not filled in. The braces are removed, so it would be sent as the plain word "${name}".`,
    type: "placeholder"
  }));
}
