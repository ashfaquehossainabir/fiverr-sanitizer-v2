// highlightSanitized.js

export function highlightSanitizedText(text) {
  if (!text) return "";

  /**
   * Highlight words that contain "_"
   * Example: c_ontact, p_ayment, w_hatsapp
   */
  return text.replace(/\b\w*_\w*\b/g, (match) => {
    return `<span class="highlight">${match}</span>`;
  });
}