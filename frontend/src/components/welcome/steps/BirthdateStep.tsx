import { Input } from '../../ui/Input';
import type { WelcomeFormData } from '../types';

interface BirthdateStepProps {
  data: WelcomeFormData;
  onUpdate: (data: Partial<WelcomeFormData>) => void;
}

export function BirthdateStep({ data, onUpdate }: BirthdateStepProps) {
  // Convert ISO string to YYYY-MM-DD format for input
  const dateValue = data.birthDate ? data.birthDate.split('T')[0] : '';

  const handleDateChange = (value: string) => {
    // Convert to ISO string for storage
    const isoDate = value ? new Date(value).toISOString() : '';
    onUpdate({ birthDate: isoDate });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h3 className="text-2xl font-bold">When's Your Birthday? 🎂</h3>
        <p className="text-muted-foreground">
          This helps us show you age-appropriate content.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="birthDate" className="block text-sm font-medium">
            Date of Birth
          </label>
          <Input
            id="birthDate"
            type="date"
            value={dateValue}
            onChange={(e) => handleDateChange(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
          <p className="text-xs text-muted-foreground">
            We use this to filter content based on age ratings. Your birthdate is private.
          </p>
        </div>
      </div>
    </div>
  );
}
