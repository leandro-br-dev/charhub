import { Avatar } from '../../../../components/ui';

export interface TypingIndicatorProps {
  avatar?: string | null;
  name: string;
}

export const TypingIndicator = ({ avatar, name }: TypingIndicatorProps) => {
  return (
    <div className="flex items-center space-x-2 p-2 w-full justify-start mb-4">
      <Avatar src={avatar} alt={name} size="mini" />
      <div className="flex items-center space-x-1 bg-light px-3 py-2 rounded-lg rounded-tl-none shadow-sm">
        <span className="block w-2 h-2 bg-muted rounded-full animate-bounce [animation-delay:0ms]"></span>
        <span className="block w-2 h-2 bg-muted rounded-full animate-bounce [animation-delay:150ms]"></span>
        <span className="block w-2 h-2 bg-muted rounded-full animate-bounce [animation-delay:300ms]"></span>
      </div>
    </div>
  );
};
