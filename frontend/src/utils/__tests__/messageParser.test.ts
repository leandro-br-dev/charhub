import { parseMessage, MessageTokenType, hasRoleplayFormatting, getFormattingTypes, stripFormatting } from '../messageParser';

describe('messageParser', () => {
  describe('parseMessage', () => {
    it('should parse plain text as dialogue', () => {
      const result = parseMessage('Just a normal message');
      expect(result).toEqual([
        { type: MessageTokenType.DIALOGUE, content: 'Just a normal message' },
      ]);
    });

    it('should parse actions correctly', () => {
      const result = parseMessage('Hello *waves hand*');
      expect(result).toEqual([
        { type: MessageTokenType.DIALOGUE, content: 'Hello' },
        { type: MessageTokenType.ACTION, content: 'waves hand' },
      ]);
    });

    it('should parse thoughts correctly', () => {
      const result = parseMessage('<"I wonder why">');
      expect(result).toEqual([
        { type: MessageTokenType.THOUGHT, content: 'I wonder why' },
      ]);
    });

    it('should parse OOC with double parentheses correctly', () => {
      const result = parseMessage('Hello ((this is ooc))');
      expect(result).toEqual([
        { type: MessageTokenType.DIALOGUE, content: 'Hello' },
        { type: MessageTokenType.OOC, content: 'this is ooc' },
      ]);
    });

    it('should parse OOC with single parentheses correctly', () => {
      const result = parseMessage('Hello (this is ooc)');
      expect(result).toEqual([
        { type: MessageTokenType.DIALOGUE, content: 'Hello' },
        { type: MessageTokenType.OOC, content: 'this is ooc' },
      ]);
    });

    it('should prioritize double parentheses over single', () => {
      const result = parseMessage('((double should be parsed first))');
      expect(result).toEqual([
        { type: MessageTokenType.OOC, content: 'double should be parsed first' },
      ]);
    });

    it('should parse shouts correctly', () => {
      const result = parseMessage('>WATCH OUT!<');
      expect(result).toEqual([
        { type: MessageTokenType.SHOUT, content: 'WATCH OUT!' },
      ]);
    });

    it('should parse whispers correctly', () => {
      const result = parseMessage('<secret message>');
      expect(result).toEqual([
        { type: MessageTokenType.WHISPER, content: 'secret message' },
      ]);
    });

    it('should parse descriptions correctly', () => {
      const result = parseMessage('[The room darkens]');
      expect(result).toEqual([
        { type: MessageTokenType.DESCRIPTION, content: 'The room darkens' },
      ]);
    });

    it('should handle complex mixed messages', () => {
      const result = parseMessage('*walks in* Hello! <"Nice place"> >HEY!<');
      expect(result).toEqual([
        { type: MessageTokenType.ACTION, content: 'walks in' },
        { type: MessageTokenType.DIALOGUE, content: 'Hello!' },
        { type: MessageTokenType.THOUGHT, content: 'Nice place' },
        { type: MessageTokenType.SHOUT, content: 'HEY!' },
      ]);
    });

    it('should handle actions with parentheses format', () => {
      const result = parseMessage('(*walks in*) Hello!');
      expect(result).toEqual([
        { type: MessageTokenType.ACTION, content: 'walks in' },
        { type: MessageTokenType.DIALOGUE, content: 'Hello!' },
      ]);
    });

    it('should handle multiple actions in one message', () => {
      const result = parseMessage('*smiles* *waves* Hello');
      expect(result).toEqual([
        { type: MessageTokenType.ACTION, content: 'smiles' },
        { type: MessageTokenType.ACTION, content: 'waves' },
        { type: MessageTokenType.DIALOGUE, content: 'Hello' },
      ]);
    });

    it('should remove surrounding quotes from dialogue', () => {
      const result = parseMessage('"Hello, how are you?"');
      expect(result).toEqual([
        { type: MessageTokenType.DIALOGUE, content: 'Hello, how are you?' },
      ]);
    });

    it('should remove single quotes from dialogue', () => {
      const result = parseMessage("'Hello there'");
      expect(result).toEqual([
        { type: MessageTokenType.DIALOGUE, content: 'Hello there' },
      ]);
    });

    it('should remove guillemets from dialogue', () => {
      const result = parseMessage('«Bonjour»');
      expect(result).toEqual([
        { type: MessageTokenType.DIALOGUE, content: 'Bonjour' },
      ]);
    });

    it('should not remove quotes inside the text', () => {
      const result = parseMessage('She said "hello" to me');
      expect(result).toEqual([
        { type: MessageTokenType.DIALOGUE, content: 'She said "hello" to me' },
      ]);
    });

    it('should handle empty messages', () => {
      const result = parseMessage('');
      expect(result).toEqual([]);
    });

    it('should handle whitespace-only messages', () => {
      const result = parseMessage('   ');
      expect(result).toEqual([]);
    });

    it('should handle unclosed patterns as normal text', () => {
      const result = parseMessage('This has an *unclosed asterisk');
      expect(result).toEqual([
        { type: MessageTokenType.DIALOGUE, content: 'This has an *unclosed asterisk' },
      ]);
    });

    it('should handle unclosed angle bracket as normal text', () => {
      const result = parseMessage('This has an <unclosed bracket');
      expect(result).toEqual([
        { type: MessageTokenType.DIALOGUE, content: 'This has an <unclosed bracket' },
      ]);
    });

    it('should handle unclosed square bracket as normal text', () => {
      const result = parseMessage('This has an [unclosed bracket');
      expect(result).toEqual([
        { type: MessageTokenType.DIALOGUE, content: 'This has an [unclosed bracket' },
      ]);
    });

    it('should handle unclosed parenthesis as normal text', () => {
      const result = parseMessage('This has an (unclosed parenthesis');
      expect(result).toEqual([
        { type: MessageTokenType.DIALOGUE, content: 'This has an (unclosed parenthesis' },
      ]);
    });

    it('should handle messages with newlines', () => {
      const result = parseMessage('Hello\n*waves*\nHow are you?');
      expect(result).toEqual([
        { type: MessageTokenType.DIALOGUE, content: 'Hello' },
        { type: MessageTokenType.ACTION, content: 'waves' },
        { type: MessageTokenType.DIALOGUE, content: 'How are you?' },
      ]);
    });

    it('should handle whisper vs thought distinction correctly', () => {
      const result1 = parseMessage('<"thought with quotes">');
      expect(result1[0].type).toBe(MessageTokenType.THOUGHT);

      const result2 = parseMessage('<whisper without quotes>');
      expect(result2[0].type).toBe(MessageTokenType.WHISPER);
    });

    it('should treat single asterisk as normal text', () => {
      const result = parseMessage('Price: 5 * 3 = 15');
      expect(result).toEqual([
        { type: MessageTokenType.DIALOGUE, content: 'Price: 5 * 3 = 15' },
      ]);
    });

    it('should handle very long actions', () => {
      const longAction = 'a'.repeat(200);
      const result = parseMessage(`*${longAction}*`);
      expect(result[0].type).toBe(MessageTokenType.ACTION);
      expect(result[0].content.length).toBe(200);
    });

    it('should handle special characters in content', () => {
      const result = parseMessage('*smiles 😊* Hello! <"How are you?">');
      expect(result).toEqual([
        { type: MessageTokenType.ACTION, content: 'smiles 😊' },
        { type: MessageTokenType.DIALOGUE, content: 'Hello!' },
        { type: MessageTokenType.THOUGHT, content: 'How are you?' },
      ]);
    });

    it('should handle mixed Portuguese characters', () => {
      const result = parseMessage('*sorriso* Olá! <"Que legal">');
      expect(result).toEqual([
        { type: MessageTokenType.ACTION, content: 'sorriso' },
        { type: MessageTokenType.DIALOGUE, content: 'Olá!' },
        { type: MessageTokenType.THOUGHT, content: 'Que legal' },
      ]);
    });

    it('should handle overlapping patterns correctly (OOC before action)', () => {
      const result = parseMessage('((OOC comment)) *action*');
      expect(result).toEqual([
        { type: MessageTokenType.OOC, content: 'OOC comment' },
        { type: MessageTokenType.ACTION, content: 'action' },
      ]);
    });

    it('should handle thought before whisper (order matters)', () => {
      const result = parseMessage('<"my thought"> <whisper>');
      expect(result).toEqual([
        { type: MessageTokenType.THOUGHT, content: 'my thought' },
        { type: MessageTokenType.WHISPER, content: 'whisper' },
      ]);
    });

    it('should handle description at the end', () => {
      const result = parseMessage('Hello [time passes]');
      expect(result).toEqual([
        { type: MessageTokenType.DIALOGUE, content: 'Hello' },
        { type: MessageTokenType.DESCRIPTION, content: 'time passes' },
      ]);
    });

    it('should handle nested-looking patterns correctly', () => {
      // Should not treat this as nested, but as separate patterns
      const result = parseMessage('*action* [description] normal');
      expect(result).toEqual([
        { type: MessageTokenType.ACTION, content: 'action' },
        { type: MessageTokenType.DESCRIPTION, content: 'description' },
        { type: MessageTokenType.DIALOGUE, content: 'normal' },
      ]);
    });

    it('should trim whitespace from parsed content', () => {
      const result = parseMessage('  *  walks slowly  *  ');
      expect(result).toEqual([
        { type: MessageTokenType.ACTION, content: 'walks slowly' },
      ]);
    });
  });

  describe('hasRoleplayFormatting', () => {
    it('should return true for action formatting', () => {
      expect(hasRoleplayFormatting('*waves*')).toBe(true);
    });

    it('should return true for thought formatting', () => {
      expect(hasRoleplayFormatting('<"thinking">')).toBe(true);
    });

    it('should return true for OOC formatting', () => {
      expect(hasRoleplayFormatting('((ooc))')).toBe(true);
    });

    it('should return true for shout formatting', () => {
      expect(hasRoleplayFormatting('>HELLO!<')).toBe(true);
    });

    it('should return true for whisper formatting', () => {
      expect(hasRoleplayFormatting('<psst>')).toBe(true);
    });

    it('should return true for description formatting', () => {
      expect(hasRoleplayFormatting('[scene]')).toBe(true);
    });

    it('should return false for plain text', () => {
      expect(hasRoleplayFormatting('Just normal text')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(hasRoleplayFormatting('')).toBe(false);
    });

    it('should return true for mixed formatting', () => {
      expect(hasRoleplayFormatting('*waves* Hello')).toBe(true);
    });
  });

  describe('getFormattingTypes', () => {
    it('should return array with single type for action only', () => {
      const result = getFormattingTypes('*waves*');
      expect(result).toEqual([MessageTokenType.ACTION]);
    });

    it('should return array with multiple types', () => {
      const result = getFormattingTypes('*waves* Hello <"thinking">');
      expect(result).toContain(MessageTokenType.ACTION);
      expect(result).toContain(MessageTokenType.DIALOGUE);
      expect(result).toContain(MessageTokenType.THOUGHT);
      expect(result.length).toBe(3);
    });

    it('should return only dialogue type for plain text', () => {
      const result = getFormattingTypes('Plain text');
      expect(result).toEqual([MessageTokenType.DIALOGUE]);
    });

    it('should return empty array for empty string', () => {
      const result = getFormattingTypes('');
      expect(result).toEqual([]);
    });

    it('should return all seven types for complex message', () => {
      const result = getFormattingTypes('*act* "spk" <"thgt"> ((ooc)) >shout< <wspy> [desc]');
      expect(result).toContain(MessageTokenType.ACTION);
      expect(result).toContain(MessageTokenType.DIALOGUE);
      expect(result).toContain(MessageTokenType.THOUGHT);
      expect(result).toContain(MessageTokenType.OOC);
      expect(result).toContain(MessageTokenType.SHOUT);
      expect(result).toContain(MessageTokenType.WHISPER);
      expect(result).toContain(MessageTokenType.DESCRIPTION);
      expect(result.length).toBe(7);
    });
  });

  describe('stripFormatting', () => {
    it('should strip action formatting', () => {
      const result = stripFormatting('*waves*');
      expect(result).toBe('waves');
    });

    it('should strip thought formatting', () => {
      const result = stripFormatting('<"thinking">');
      expect(result).toBe('thinking');
    });

    it('should strip OOC formatting', () => {
      const result = stripFormatting('((ooc comment))');
      expect(result).toBe('ooc comment');
    });

    it('should strip shout formatting', () => {
      const result = stripFormatting('>HELLO!<');
      expect(result).toBe('HELLO!');
    });

    it('should strip whisper formatting', () => {
      const result = stripFormatting('<secret>');
      expect(result).toBe('secret');
    });

    it('should strip description formatting', () => {
      const result = stripFormatting('[scene description]');
      expect(result).toBe('scene description');
    });

    it('should return plain text for messages without formatting', () => {
      const result = stripFormatting('Just normal text');
      expect(result).toBe('Just normal text');
    });

    it('should strip all formatting from complex message', () => {
      const result = stripFormatting('*waves* Hello! <"thinking">');
      expect(result).toBe('waves Hello! thinking');
    });

    it('should return empty string for empty input', () => {
      const result = stripFormatting('');
      expect(result).toBe('');
    });

    it('should preserve whitespace between tokens', () => {
      const result = stripFormatting('*act* dialogue <"thgt">');
      expect(result).toBe('act dialogue thgt');
    });
  });
});
