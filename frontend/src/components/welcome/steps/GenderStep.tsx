import { Button } from '../../ui/Button';
import type { WelcomeFormData } from '../types';

interface GenderStepProps {
  data: WelcomeFormData;
  onUpdate: (data: Partial<WelcomeFormData>) => void;
}

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male', icon: '♂️' },
  { value: 'female', label: 'Female', icon: '♀️' },
  { value: 'non-binary', label: 'Non-binary', icon: '⚧️' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say', icon: '🤐' },
];

export function GenderStep({ data, onUpdate }: GenderStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h3 className="text-2xl font-bold">How Do You Identify?</h3>
        <p className="text-muted-foreground">
          This helps AI agents personalize their language. This is optional.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {GENDER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onUpdate({ gender: option.value })}
            className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all ${
              data.gender === option.value
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <span className="text-3xl">{option.icon}</span>
            <span className="text-sm font-medium">{option.label}</span>
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        You can always change this later in your profile settings.
      </p>
    </div>
  );
}
