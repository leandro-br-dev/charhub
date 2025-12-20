import { useTranslation } from 'react-i18next';
import type { WelcomeFormData } from '../types';

interface ContentFiltersStepProps {
  data: WelcomeFormData;
  onUpdate: (data: Partial<WelcomeFormData>) => void;
}

export function ContentFiltersStep({ data, onUpdate }: ContentFiltersStepProps) {
  const { t } = useTranslation('welcome');

  const CONTENT_TAG_OPTIONS = [
    { value: 'VIOLENCE', label: t('contentFilters.tags.violence', 'Violence'), icon: '⚔️', description: t('contentFilters.tagDescriptions.violence', 'Physical violence, fighting') },
    { value: 'GORE', label: t('contentFilters.tags.gore', 'Gore'), icon: '🩸', description: t('contentFilters.tagDescriptions.gore', 'Explicit violence, blood') },
    { value: 'SEXUAL', label: t('contentFilters.tags.sexual', 'Sexual Content'), icon: '❤️', description: t('contentFilters.tagDescriptions.sexual', 'Sexual themes') },
    { value: 'NUDITY', label: t('contentFilters.tags.nudity', 'Nudity'), icon: '👙', description: t('contentFilters.tagDescriptions.nudity', 'Nudity or partial nudity') },
    { value: 'LANGUAGE', label: t('contentFilters.tags.language', 'Strong Language'), icon: '🤬', description: t('contentFilters.tagDescriptions.language', 'Profanity') },
    { value: 'DRUGS', label: t('contentFilters.tags.drugs', 'Drugs'), icon: '💊', description: t('contentFilters.tagDescriptions.drugs', 'Drug use or references') },
    { value: 'ALCOHOL', label: t('contentFilters.tags.alcohol', 'Alcohol'), icon: '🍺', description: t('contentFilters.tagDescriptions.alcohol', 'Alcohol consumption') },
    { value: 'HORROR', label: t('contentFilters.tags.horror', 'Horror'), icon: '👻', description: t('contentFilters.tagDescriptions.horror', 'Horror themes, disturbing content') },
    { value: 'PSYCHOLOGICAL', label: t('contentFilters.tags.psychological', 'Psychological'), icon: '🧠', description: t('contentFilters.tagDescriptions.psychological', 'Psychological themes') },
    { value: 'DISCRIMINATION', label: t('contentFilters.tags.discrimination', 'Discrimination'), icon: '🚫', description: t('contentFilters.tagDescriptions.discrimination', 'Discriminatory content') },
    { value: 'CRIME', label: t('contentFilters.tags.crime', 'Crime'), icon: '🔪', description: t('contentFilters.tagDescriptions.crime', 'Criminal activities') },
    { value: 'GAMBLING', label: t('contentFilters.tags.gambling', 'Gambling'), icon: '🎰', description: t('contentFilters.tagDescriptions.gambling', 'Gambling themes') },
  ];
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
        <h3 className="text-2xl font-bold">{t('contentFilters.title', 'Content Filters')} 🛡️</h3>
        <p className="text-base text-muted-foreground">
          {t('contentFilters.subtitle', 'Block specific content themes you don\'t want to see. (Optional)')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {CONTENT_TAG_OPTIONS.map((option) => {
          const isBlocked = blockedTags.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleTag(option.value)}
              className={`flex flex-col items-start gap-1 rounded-lg border-2 p-2.5 text-left transition-all ${
                isBlocked
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-lg">{option.icon}</span>
                {isBlocked && <span className="text-lg text-red-500">🚫</span>}
              </div>
              <div className="text-sm font-medium">{option.label}</div>
              <div className="text-xs text-muted-foreground">{option.description}</div>
            </button>
          );
        })}
      </div>

      <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
        💡 {t('contentFilters.tip', 'Tip: You can skip this and adjust content filters anytime in your profile settings.')}
      </div>
    </div>
  );
}
