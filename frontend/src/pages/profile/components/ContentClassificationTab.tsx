import { useMemo, useState, useEffect, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import {
  ContentTagsSelector,
  deriveAllowedTagsFromBlocked,
  deriveBlockedTagsFromAllowed,
  getUnlockedContentTags,
  normalizeAllowedContentTags,
} from '../../../components/features/content-guidelines';
import { AGE_RATING_OPTIONS } from '../../(characters)/shared/utils/constants';
import { type ContentTag, type AgeRating } from '../../../types/characters';
import { useAuth } from '../../../hooks/useAuth';
import { userService } from '../../../services/userService';
import { useToast } from '../../../contexts/ToastContext';

type ContentClassificationFormState = {
  maxAgeRating: AgeRating;
  blockedTags: ContentTag[];
};

function calculateUserAge(birthDate: string | undefined): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function getMaxAllowedRating(age: number | null): AgeRating {
  if (age === null) return 'EIGHTEEN';
  if (age < 10) return 'L';
  if (age < 12) return 'TEN';
  if (age < 14) return 'TWELVE';
  if (age < 16) return 'FOURTEEN';
  if (age < 18) return 'SIXTEEN';
  return 'EIGHTEEN';
}

function getAllowedRatings(age: number | null): AgeRating[] {
  const maxRating = getMaxAllowedRating(age);
  const ratings: AgeRating[] = ['L', 'TEN', 'TWELVE', 'FOURTEEN', 'SIXTEEN', 'EIGHTEEN'];
  const maxIndex = ratings.indexOf(maxRating);
  return ratings.slice(0, maxIndex + 1);
}

export function ContentClassificationTab(): JSX.Element {
  const { user, updateUser } = useAuth();
  const { t } = useTranslation(['profile', 'characters']);
  const { addToast } = useToast();

  const [formState, setFormState] = useState<ContentClassificationFormState>(() => ({
    maxAgeRating: user?.maxAgeRating ?? 'L',
    blockedTags: user?.blockedTags ?? [],
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  const userAge = useMemo(() => calculateUserAge(user?.birthDate), [user?.birthDate]);
  const allowedRatings = useMemo(() => getAllowedRatings(userAge), [userAge]);
  const allowedContentTags = useMemo(
    () => deriveAllowedTagsFromBlocked(formState.maxAgeRating, formState.blockedTags),
    [formState.maxAgeRating, formState.blockedTags]
  );

  useEffect(() => {
    const fetchProfile = async () => {
      // Only fetch if we have a user ID and token
      if (!user?.id || !user?.token) {
        console.debug('[profile] skipping fetch - user not fully authenticated', {
          hasId: !!user?.id,
          hasToken: !!user?.token
        });
        return;
      }

      setIsLoadingProfile(true);
      try {
        const profile = await userService.fetchProfile();
        updateUser(profile);
        setFormState({
          maxAgeRating: profile.maxAgeRating ?? 'L',
          blockedTags: profile.blockedTags ?? [],
        });
      } catch (error) {
        console.error('[profile] failed to fetch profile', error);
        // Only show toast if it's not an auth error (401)
        const isAuthError = error && typeof error === 'object' && 'response' in error &&
                           (error as any).response?.status === 401;
        if (isAuthError) {
          console.warn('[profile] authentication required - user may need to re-login');
          addToast(t('profile:errors.authenticationRequired', 'Please log in again to continue'), 'warning');
        }
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [user?.id, user?.token]);

  const handleAgeRatingChange = (rating: AgeRating) => {
    const normalizedAllowed = normalizeAllowedContentTags(rating, allowedContentTags);
    setFormState(prev => ({
      ...prev,
      maxAgeRating: rating,
      blockedTags: deriveBlockedTagsFromAllowed(rating, normalizedAllowed),
    }));
  };

  const handleAllowedTagsChange = (nextAllowed: ContentTag[]) => {
    setFormState(prev => ({
      ...prev,
      blockedTags: deriveBlockedTagsFromAllowed(prev.maxAgeRating, nextAllowed),
    }));
  };

  const handleAllowAllWithinRating = () => {
    const unlocked = getUnlockedContentTags(formState.maxAgeRating);
    setFormState(prev => ({
      ...prev,
      blockedTags: deriveBlockedTagsFromAllowed(prev.maxAgeRating, unlocked),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        maxAgeRating: formState.maxAgeRating,
        blockedTags: formState.blockedTags,
      };

      const updated = await userService.updateProfile(payload);
      updateUser({
        maxAgeRating: updated.maxAgeRating ?? undefined,
        blockedTags: updated.blockedTags ?? undefined,
      });

      setFormState(prev => ({
        ...prev,
        maxAgeRating: updated.maxAgeRating ?? 'L',
        blockedTags: updated.blockedTags ?? [],
      }));

      addToast(t('profile:feedback.success'), 'success');
    } catch (error) {
      console.error('[profile] failed to update content classification', error);
      const apiError = (error as { response?: { data?: { error?: string; message?: string } } }).response?.data;
      const errorMsg = apiError?.error || apiError?.message || 'profile:errors.updateFailed';
      addToast(t(errorMsg), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const isAllAgesSelected = formState.maxAgeRating === 'L';
  const hasBirthDate = Boolean(user?.birthDate);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-title">{t('profile:contentClassification.header')}</h2>
      <p className="text-sm text-description">
        {t('profile:contentClassification.description')}
      </p>

      {!hasBirthDate && (
        <div className="rounded-lg border-2 border-warning bg-warning/10 p-4">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 flex-shrink-0 text-warning" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-semibold text-warning">{t('profile:contentClassification.birthDateRequired')}</h3>
              <p className="mt-1 text-sm text-warning/90">
                {t('profile:contentClassification.birthDateRequiredMessage')}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={hasBirthDate ? '' : 'pointer-events-none opacity-40'}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-content">{t('profile:contentClassification.maxAgeRatingLabel')}</span>
            <p className="text-xs text-muted">{t('profile:contentClassification.maxAgeRatingHint')}</p>
            <select
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              name="maxAgeRating"
              value={formState.maxAgeRating}
              onChange={e => handleAgeRatingChange(e.target.value as AgeRating)}
              disabled={!hasBirthDate || isLoadingProfile}
            >
              {AGE_RATING_OPTIONS.map(option => {
                const isAllowed = allowedRatings.includes(option);
                const label = t('characters:ageRatings.' + option);
                const suffix = isAllowed ? '' : ' (' + t('profile:contentClassification.ageRestricted') + ')';
                return (
                  <option key={option} value={option} disabled={!isAllowed}>
                    {label + suffix}
                  </option>
                );
              })}
            </select>
          </label>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-content">{t('profile:contentClassification.blockedTags')}</span>
              <p className="mt-1 text-xs text-description">
                {isAllAgesSelected
                  ? t('profile:contentClassification.allAgesNote')
                  : t('profile:contentClassification.filterNote')}
              </p>
            </div>
            {!isAllAgesSelected && (
              <Button
                type="button"
                variant="light"
                size="small"
                onClick={handleAllowAllWithinRating}
                disabled={!hasBirthDate || isLoadingProfile}
              >
                {t('profile:contentClassification.allowAll')}
              </Button>
            )}
          </div>

          <ContentTagsSelector
            mode="user"
            ageRating={formState.maxAgeRating}
            allowedTags={allowedContentTags}
            onChange={handleAllowedTagsChange}
            disabled={!hasBirthDate || isLoadingProfile}
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <Button type="submit" variant="primary" disabled={isSaving || !hasBirthDate}>
          {isSaving ? t('profile:actions.saving', 'Saving...') : t('profile:actions.save', 'Save changes')}
        </Button>
      </div>
    </form>
  );
}
