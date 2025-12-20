import type { WelcomeFormData } from '../types';

interface AgeRatingStepProps {
  data: WelcomeFormData;
  onUpdate: (data: Partial<WelcomeFormData>) => void;
}

const AGE_RATING_OPTIONS = [
  { value: 'L', label: 'All Ages (L)', minAge: 0, description: 'Suitable for everyone' },
  { value: 'TEN', label: '10+', minAge: 10, description: 'Mild themes' },
  { value: 'TWELVE', label: '12+', minAge: 12, description: 'Moderate themes' },
  { value: 'FOURTEEN', label: '14+ (Teen)', minAge: 14, description: 'More mature themes' },
  { value: 'SIXTEEN', label: '16+ (Mature)', minAge: 16, description: 'Strong themes' },
  { value: 'EIGHTEEN', label: '18+ (Adult)', minAge: 18, description: 'Adult content' },
];

export function AgeRatingStep({ data, onUpdate }: AgeRatingStepProps) {
  // Calculate user's age if birthdate is provided
  const userAge = data.birthDate ? calculateAge(new Date(data.birthDate)) : null;

  // Determine which ratings are available based on age
  const isRatingAvailable = (minAge: number) => {
    if (userAge === null) return minAge === 0; // Only "All Ages" if no birthdate
    return userAge >= minAge;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h3 className="text-2xl font-bold">Content Rating Preference 🎯</h3>
        <p className="text-muted-foreground">
          Choose the maximum age rating you want to see.
          {userAge !== null && ` Based on your age (${userAge}), you can access:`}
        </p>
      </div>

      <div className="space-y-2">
        {AGE_RATING_OPTIONS.map((option) => {
          const isAvailable = isRatingAvailable(option.minAge);
          const isSelected = data.maxAgeRating === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => isAvailable && onUpdate({ maxAgeRating: option.value })}
              disabled={!isAvailable}
              className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                isSelected
                  ? 'border-primary bg-primary/10'
                  : isAvailable
                  ? 'border-border hover:border-primary/50'
                  : 'cursor-not-allowed border-border/50 opacity-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-muted-foreground">{option.description}</div>
                </div>
                {isSelected && <span className="text-primary">✓</span>}
                {!isAvailable && <span className="text-muted-foreground">🔒</span>}
              </div>
            </button>
          );
        })}
      </div>

      {userAge === null && (
        <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
          ⚠️ Set your birthdate to unlock more content ratings
        </div>
      )}
    </div>
  );
}

function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}
