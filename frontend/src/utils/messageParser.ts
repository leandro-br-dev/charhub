/**
 * Message Parser for Roleplay Formatting
 *
 * Parses roleplay messages into typed tokens for visual formatting.
 * Supports standard roleplay conventions:
 * - *action* → ACTION
 * - <"thought"> → THOUGHT
 * - ((ooc)) or (ooc) → OOC
 * - >shout< or **SHOUT** → SHOUT
 * - <whisper> → WHISPER * - [description] → DESCRIPTION
 * - Normal text → DIALOGUE
 */

export enum MessageTokenType {
  DIALOGUE = 'dialogue',
  ACTION = 'action',
  THOUGHT = 'thought',
  OOC = 'ooc',
  SHOUT = 'shout',
  WHISPER = 'whisper',
  DESCRIPTION = 'description',
}

export interface MessageToken {
  type: MessageTokenType;
  content: string;
}

interface PatternMatch {
  index: number;
  length: number;
  token: MessageToken;
}

/**
 * Parse a message string into formatted tokens
 *
 * Order of detection (important for avoiding conflicts):
 * 1. OOC ((text)) or (text)
 * 2. Thoughts <"text">
 * 3. Shout >text<
 * 4. Whisper <text> (without quotes)
 * 5. Description [text]
 * 6. Action *text* (lowest priority)
 * 7. Normal text → DIALOGUE
 *
 * @param message - The raw message string to parse
 * @returns Array of MessageToken objects
 */
export function parseMessage(message: string): MessageToken[] {
  if (!message || typeof message !== 'string') {
    return [];
  }

  const tokens: MessageToken[] = [];
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    return [];
  }

  // Regex patterns (order matters!)
  // Note: Each pattern captures the content inside the delimiters
  const patterns: Array<{ regex: RegExp; type: MessageTokenType }> = [
    // OOC - must check before single parens
    { regex: /\(\((.*?)\)\)/gs, type: MessageTokenType.OOC },
    { regex: /\((.*?)\)/gs, type: MessageTokenType.OOC },
    // Thoughts - specifically <"text"> with quotes
    { regex: /<"(.*?)">/gs, type: MessageTokenType.THOUGHT },
    // Shout - >text<
    { regex: />(.*?)</gs, type: MessageTokenType.SHOUT },
    // Whisper - <text> without quotes
    // Note: This is checked after thoughts <"text"> to avoid conflicts
    {
      regex: /<([^"][^>]*)>/gs,
      type: MessageTokenType.WHISPER,
    },
    // Description
    { regex: /\[(.*?)\]/gs, type: MessageTokenType.DESCRIPTION },
    // Action - lowest priority
    { regex: /\*(.*?)\*/gs, type: MessageTokenType.ACTION },
  ];

  const matches: PatternMatch[] = [];

  // Find all matches across all patterns
  for (const { regex, type } of patterns) {
    const regexClone = new RegExp(regex.source, regex.flags);
    let match: RegExpExecArray | null;

    while ((match = regexClone.exec(trimmedMessage)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        token: {
          type,
          content: match[1]?.trim() || '',
        },
      });
    }
  }

  // Sort matches by index (left to right)
  matches.sort((a, b) => a.index - b.index);

  // Filter out overlapping matches (keep first found at each position)
  const filteredMatches: PatternMatch[] = [];
  for (const match of matches) {
    const overlaps = filteredMatches.some(
      (m) =>
        (match.index >= m.index && match.index < m.index + m.length) ||
        (m.index >= match.index && m.index < match.index + match.length)
    );

    if (!overlaps) {
      filteredMatches.push(match);
    }
  }

  // Build tokens array with dialogue filling gaps
  let lastIndex = 0;
  for (const { index, length, token } of filteredMatches) {
    // Add dialogue before this match
    if (index > lastIndex) {
      const dialogueText = trimmedMessage
        .substring(lastIndex, index)
        .trim();
      if (dialogueText) {
        // Remove surrounding quotes from dialogue if present
        const cleanDialogue = dialogueText.replace(/^["'«»"']|["'«»"']$/g, '').trim();
        tokens.push({
          type: MessageTokenType.DIALOGUE,
          content: cleanDialogue || dialogueText,
        });
      }
    }

    // Add the matched token
    tokens.push(token);
    lastIndex = index + length;
  }

  // Add remaining dialogue
  if (lastIndex < trimmedMessage.length) {
    const dialogueText = trimmedMessage.substring(lastIndex).trim();
    if (dialogueText) {
      // Remove surrounding quotes from dialogue if present
      const cleanDialogue = dialogueText.replace(/^["'«»"']|["'«»"']$/g, '').trim();
      tokens.push({
        type: MessageTokenType.DIALOGUE,
        content: cleanDialogue || dialogueText,
      });
    }
  }

  // If no tokens found, treat entire message as dialogue
  if (tokens.length === 0 && trimmedMessage) {
    // Remove surrounding quotes from dialogue if present
    const cleanDialogue = trimmedMessage.replace(/^["'«»"']|["'«»"']$/g, '').trim();
    tokens.push({
      type: MessageTokenType.DIALOGUE,
      content: cleanDialogue || trimmedMessage,
    });
  }

  return tokens;
}

/**
 * Check if a message contains roleplay formatting
 * @param message - The message to check
 * @returns true if the message contains any roleplay formatting
 */
export function hasRoleplayFormatting(message: string): boolean {
  const tokens = parseMessage(message);
  return tokens.some(
    (token) => token.type !== MessageTokenType.DIALOGUE
  );
}

/**
 * Get the types of formatting used in a message
 * @param message - The message to analyze
 * @returns Array of MessageTokenType values present in the message
 */
export function getFormattingTypes(message: string): MessageTokenType[] {
  const tokens = parseMessage(message);
  const types = new Set(tokens.map((token) => token.type));
  return Array.from(types);
}

/**
 * Strip all formatting from a message, returning plain text
 * @param message - The message to strip formatting from
 * @returns Plain text without any formatting delimiters
 */
export function stripFormatting(message: string): string {
  const tokens = parseMessage(message);
  return tokens.map((token) => token.content).join(' ');
}
