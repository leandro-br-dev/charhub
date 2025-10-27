import { logger } from '../config/logger';

/**
 * Safely parse JSON content that may be wrapped in code fences or contain minor formatting issues.
 * - Extracts content from ```json ... ``` or generic ``` ... ``` fences if present
 * - Falls back to the first JSON object/array found in the string
 * - Attempts to correct trailing commas before parsing
 */
export function parseJsonSafe<T = unknown>(content: string): T {
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Input to parse is empty or not a string.');
  }

  logger.debug('Attempting to safely parse JSON from raw content');

  let jsonStrToParse = '';

  // Try to capture fenced code blocks with explicit json
  const fenceJson = content.match(/```\s*json\s*([\s\S]*?)\s*```/i);
  if (fenceJson && fenceJson[1]) {
    jsonStrToParse = fenceJson[1].trim();
  } else {
    // Try any fenced block as a fallback
    const fenceAny = content.match(/```[\s\S]*?\n([\s\S]*?)\n```/);
    if (fenceAny && fenceAny[1]) {
      jsonStrToParse = fenceAny[1].trim();
    }
  }

  // If no fences found, slice from first JSON object/array occurrence
  if (!jsonStrToParse) {
    const startCurly = content.indexOf('{');
    const startBracket = content.indexOf('[');
    if (startCurly === -1 && startBracket === -1) {
      throw new Error('No JSON object or array found in the string.');
    }
    const startIndex = (startCurly !== -1 && (startBracket === -1 || startCurly < startBracket))
      ? startCurly
      : startBracket;
    jsonStrToParse = content.slice(startIndex);
  }

  const tryParse = (text: string): T => JSON.parse(text) as T;

  try {
    return tryParse(jsonStrToParse);
  } catch (_e) {
    // Attempt minor correction: remove trailing commas before closing braces/brackets
    const corrected = jsonStrToParse.replace(/,\s*([}\]])/g, '$1');
    try {
      return tryParse(corrected);
    } catch (final_e) {
      const near = corrected.slice(Math.max(0, (final_e as any).pos - 20), (final_e as any).pos + 20);
      const errorMessage = `Failed to parse content as JSON. Error: ${final_e}. Near: ${near}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  }
}

