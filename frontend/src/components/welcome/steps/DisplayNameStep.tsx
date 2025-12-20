import { Input } from '../../ui/Input';
import type { WelcomeFormData } from '../types';

interface DisplayNameStepProps {
  data: WelcomeFormData;
  onUpdate: (data: Partial<WelcomeFormData>) => void;
}

export function DisplayNameStep({ data, onUpdate }: DisplayNameStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h3 className="text-2xl font-bold">Welcome to CharHub! 👋</h3>
        <p className="text-muted-foreground">
          Let's personalize your experience. How would you like AI agents to address you?
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="displayName" className="block text-sm font-medium">
            Display Name
          </label>
          <Input
            id="displayName"
            placeholder="e.g., John Smith"
            value={data.displayName || ''}
            onChange={(e) => onUpdate({ displayName: e.target.value })}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            This is the name that will appear in conversations with AI agents.
          </p>
        </div>
      </div>
    </div>
  );
}
