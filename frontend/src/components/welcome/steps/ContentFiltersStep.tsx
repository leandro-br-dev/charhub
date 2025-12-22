import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { WelcomeFormData } from '../types';
import type { ContentTag, AgeRating } from '../../../types/characters';
import {
  ContentTagsSelector,
  deriveAllowedTagsFromBlocked,
  deriveBlockedTagsFromAllowed,
} from '../../features/content-guidelines';

interface ContentFiltersStepProps {
  data: WelcomeFormData;
  onUpdate: (data: Partial<WelcomeFormData>) => void;
}

export function ContentFiltersStep({ data, onUpdate }: ContentFiltersStepProps) {
  const { t } = useTranslation('welcome');

  const maxAgeRating = (data.maxAgeRating as AgeRating) || 'L';
  const blockedTags = (data.blockedTags as ContentTag[]) || [];

  // Convert blockedTags to allowedTags for the UI
  const allowedTags = useMemo(
    () => deriveAllowedTagsFromBlocked(maxAgeRating, blockedTags),
    [maxAgeRating, blockedTags]
  );

  const handleAllowedTagsChange = (nextAllowed: ContentTag[]) => {
    // Convert allowedTags back to blockedTags for storage
    const nextBlocked = deriveBlockedTagsFromAllowed(maxAgeRating, nextAllowed);
    onUpdate({ blockedTags: nextBlocked });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2 text-center">
        <h3 className="text-2xl font-bold">{t('contentFilters.title', 'Content Preferences')}</h3>
        <p className="text-base text-muted-foreground">
          {t('contentFilters.subtitle', 'Select the themes you want to see')}
        </p>
      </div>

      <ContentTagsSelector
        mode="user"
        ageRating={maxAgeRating}
        allowedTags={allowedTags}
        onChange={handleAllowedTagsChange}
      />
    </div>
  );
}
