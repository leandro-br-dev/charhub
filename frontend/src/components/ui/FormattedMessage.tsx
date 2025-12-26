import { Fragment } from 'react';
import {
  parseMessage,
  MessageToken,
  MessageTokenType,
} from '@/utils/messageParser';

export interface FormattedMessageProps {
  content: string;
  className?: string;
}

/**
 * FormattedMessage Component
 *
 * Renders roleplay-formatted messages with visual styling.
 * Supports:
 * - Actions (*text*)
 * - Thoughts (<"text">)
 * - OOC ((text)) or (text)
 * - Shouts (>text<)
 * - Whispers (<text>)
 * - Descriptions ([text])
 * - Normal dialogue
 */
export const FormattedMessage = ({
  content,
  className = '',
}: FormattedMessageProps) => {
  const tokens = parseMessage(content);

  const renderToken = (token: MessageToken, index: number) => {
    const baseClasses = 'message-token transition-all duration-200';

    const typeClasses: Record<MessageTokenType, string> = {
      [MessageTokenType.DIALOGUE]: 'message-dialogue',
      [MessageTokenType.ACTION]: 'message-action',
      [MessageTokenType.THOUGHT]: 'message-thought',
      [MessageTokenType.OOC]: 'message-ooc',
      [MessageTokenType.SHOUT]: 'message-shout',
      [MessageTokenType.WHISPER]: 'message-whisper',
      [MessageTokenType.DESCRIPTION]: 'message-description',
    };

    const tokenClass = typeClasses[token.type];
    const combinedClasses = `${baseClasses} ${tokenClass}`.trim();

    return (
      <span
        key={`${token.type}-${index}`}
        className={combinedClasses}
        data-token-type={token.type}
      >
        {token.content}
      </span>
    );
  };

  return (
    <div className={`formatted-message ${className}`.trim()}>
      {tokens.map((token, index) => (
        <Fragment key={index}>
          {renderToken(token, index)}
          {index < tokens.length - 1 && ' '}
        </Fragment>
      ))}
    </div>
  );
};
