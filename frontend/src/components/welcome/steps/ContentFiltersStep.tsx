import type { WelcomeFormData } from '../types';

interface ContentFiltersStepProps {
  data: WelcomeFormData;
  onUpdate: (data: Partial<WelcomeFormData>) => void;
}

const CONTENT_TAG_OPTIONS = [
  { value: 'VIOLENCE', label: 'Violence', icon: '⚔️', description: 'Physical violence, fighting' },
  { value: 'GORE', label: 'Gore', icon: '🩸', description: 'Explicit violence, blood' },
  { value: 'SEXUAL', label: 'Sexual Content', icon: '❤️', description: 'Sexual themes' },
  { value: 'NUDITY', label: 'Nudity', icon: '👙', description: 'Nudity or partial nudity' },
  { value: 'LANGUAGE', label: 'Strong Language', icon: '🤬', description: 'Profanity' },
  { value: 'DRUGS', label: 'Drugs', icon: '💊', description: 'Drug use or references' },
  { value: 'ALCOHOL', label: 'Alcohol', icon: '🍺', description: 'Alcohol consumption' },
  { value: 'HORROR', label: 'Horror', icon: '👻', description: 'Horror themes, disturbing content' },
  { value: 'PSYCHOLOGICAL', label: 'Psychological', icon: '🧠', description: 'Psychological themes' },
  { value: 'DISCRIMINATION', label: 'Discrimination', icon: '🚫', description: 'Discriminatory content' },
  { value: 'CRIME', label: 'Crime', icon: '🔪', description: 'Criminal activities' },
  { value: 'GAMBLING', label: 'Gambling', icon: '🎰', description: 'Gambling themes' },
];

export function ContentFiltersStep({ data, onUpdate }: ContentFiltersStepProps) {
  const blockedTags = data.blockedTags || [];

  const toggleTag = (tag: string) => {
    const newBlockedTags = blockedTags.includes(tag)
      ? blockedTags.filter((t) => t !== tag)
      : [...blockedTags, tag];

    onUpdate({ blockedTags: newBlockedTags });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h3 className="text-2xl font-bold">Content Filters 🛡️</h3>
        <p className="text-muted-foreground">
          Block specific content themes you don't want to see. (Optional)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {CONTENT_TAG_OPTIONS.map((option) => {
          const isBlocked = blockedTags.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleTag(option.value)}
              className={`flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-left transition-all ${
                isBlocked
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-xl">{option.icon}</span>
                {isBlocked && <span className="text-red-500">🚫</span>}
              </div>
              <div className="text-sm font-medium">{option.label}</div>
              <div className="text-xs text-muted-foreground">{option.description}</div>
            </button>
          );
        })}
      </div>

      <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
        💡 Tip: You can skip this and adjust content filters anytime in your profile settings.
      </div>
    </div>
  );
}
