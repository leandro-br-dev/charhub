
// frontend/src/utils/textFormatters.ts

/**
 * Formats a message string into an array of objects with types for rendering.
 * Supports italic (*text*) and quote ("text") formatting.
 * @param {string} message - The raw message string.
 * @returns {Array<{type: string, content: string}>}
 */
export const formatMessage = (message: string): Array<{type: string, content: string}> => {
  if (!message || typeof message !== "string")
    return [{ type: "normal", content: "" }];

  const parts = [];
  const pattern = /(\*.*?\*|".*?")/g;
  let match;
  let lastIndex = 0;

  while ((match = pattern.exec(message)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "normal",
        content: message.slice(lastIndex, match.index),
      });
    }
    if (match[0].startsWith("*") && match[0].endsWith("*")) {
      parts.push({ type: "italic", content: match[0].slice(1, -1) });
    } else if (match[0].startsWith('"') && match[0].endsWith('"')) {
      parts.push({ type: "quote", content: match[0] });
    } else {
       parts.push({ type: "normal", content: match[0] });
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < message.length) {
    parts.push({ type: "normal", content: message.slice(lastIndex) });
  }

  if (parts.length === 0) {
    parts.push({ type: "normal", content: message });
  }
  
  return parts;
};
