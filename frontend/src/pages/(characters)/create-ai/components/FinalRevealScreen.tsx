import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../../contexts/ToastContext';
import { Button } from '../../../../components/ui/Button';
import { useAvatarPolling } from '../../../../hooks/useAvatarPolling';
import api from '../../../../lib/api';
import { extractErrorMessage } from '../../../../utils/apiErrorHandler';

interface FinalRevealScreenProps {
  character: any;
}

const API_VERSION = import.meta.env.VITE_API_VERSION || '/api/v1';

export function FinalRevealScreen({ character }: FinalRevealScreenProps): JSX.Element {
  const { t } = useTranslation(['characters', 'common']);
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [isVisible, setIsVisible] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  const { avatarUrl, isPolling } = useAvatarPolling({
    characterId: character.id,
    enabled: !character.avatarUrl,
    onAvatarReady: (url) => {
      console.log('[FinalRevealScreen] Avatar ready:', url);
    },
  });

  // Use avatar from polling if available, otherwise use character's avatar
  const displayAvatarUrl = avatarUrl || character.avatarUrl;

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 200);

    // Show success toast
    addToast(
      t('characters:createAI.reveal.successBanner', 'Character Created Successfully!'),
      'success'
    );

    return () => clearTimeout(timer);
  }, [addToast, t]);

  const handleDiscard = async () => {
    const confirmed = window.confirm(
      t(
        'characters:createAI.confirmDiscard',
        'Are you sure you want to discard this character? This action cannot be undone.'
      )
    );

    if (!confirmed) return;

    setIsDiscarding(true);

    try {
      await api.delete(`${API_VERSION}/characters/${character.id}`);
      addToast(
        t('characters:createAI.characterDiscarded', 'Character discarded successfully'),
        'success'
      );
      navigate('/characters/create-ai');
    } catch (error: unknown) {
      console.error('Failed to discard character:', error);
      addToast(
        extractErrorMessage(error) ||
          t('characters:createAI.discardFailed', 'Failed to discard character'),
        'error'
      );
    } finally {
      setIsDiscarding(false);
    }
  };

  return (
    <section className="py-8 px-4 bg-background flex items-center justify-center relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `twinkle ${2 + Math.random() * 3}s ease-in-out ${
                Math.random() * 2
              }s infinite`,
            }}
          />
        ))}
      </div>

      <div
        className={`relative z-10 max-w-2xl w-full flex flex-col transition-all duration-1000 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        {/* Main character card */}
        <div className="bg-card rounded-2xl overflow-hidden border border-border shadow-lg flex flex-col">
          {/* Avatar section at top */}
          <div className="bg-muted/30 p-8 flex flex-col items-center justify-center relative">
            {displayAvatarUrl ? (
              <div className="relative">
                <div className="absolute inset-0 bg-primary rounded-full blur-2xl opacity-20 animate-pulse" />
                <img
                  src={displayAvatarUrl}
                  alt={`${character.firstName} ${character.lastName || ''}`}
                  className="relative w-48 h-48 rounded-full object-cover border-4 border-primary/50 shadow-2xl"
                />
              </div>
            ) : (
              <div className="w-48 h-48 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/30">
                {isPolling ? (
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-primary text-sm">Generating...</p>
                  </div>
                ) : (
                  <div className="text-6xl">🎭</div>
                )}
              </div>
            )}

            {isPolling && displayAvatarUrl && (
              <p className="mt-3 text-primary text-sm animate-pulse">
                Avatar updated!
              </p>
            )}
          </div>

          {/* Character info section below */}
          <div className="p-6 space-y-4">
              {/* Name */}
              <div className="text-center">
                <h1 className="text-3xl font-bold text-title mb-4">
                  {character.firstName} {character.lastName || ''}
                </h1>

                {/* Tags */}
                <div className="flex flex-wrap justify-center gap-2 mt-3">
                  {character.species && (
                    <div className="px-3 py-1.5 bg-muted/50 rounded-full border border-border">
                      <span className="flex items-center gap-1.5 text-content text-xs font-medium">
                        <span className="material-symbols-outlined text-sm">person</span>
                        <span className="capitalize">{typeof character.species === 'object' ? character.species.name : character.species}</span>
                      </span>
                    </div>
                  )}
                  {character.age && (
                    <div className="px-3 py-1.5 bg-muted/50 rounded-full border border-border">
                      <span className="flex items-center gap-1.5 text-content text-xs font-medium">
                        <span className="material-symbols-outlined text-sm">cake</span>
                        <span>{character.age} years old</span>
                      </span>
                    </div>
                  )}
                  {character.gender && (
                    <div className="px-3 py-1.5 bg-muted/50 rounded-full border border-border">
                      <span className="flex items-center gap-1.5 text-content text-xs font-medium">
                        <span className="material-symbols-outlined text-sm">person</span>
                        <span className="capitalize">{t(`filters.genders.${typeof character.gender === 'object' ? character.gender.name : character.gender}`, typeof character.gender === 'object' ? character.gender.name : character.gender, { ns: 'dashboard' })}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Personality */}
              {character.personality && (
                <div className="text-center">
                  <h3 className="text-xs uppercase tracking-wider text-muted mb-2 font-semibold">
                    {t('characters:form.fields.personality', 'Personality')}
                  </h3>
                  <p className="text-content leading-relaxed text-sm italic">"{character.personality}"</p>
                </div>
              )}

              {/* History preview */}
              {character.history && (
                <div className="text-center">
                  <h3 className="text-xs uppercase tracking-wider text-muted mb-2 font-semibold">
                    {t('characters:form.fields.history', 'Backstory')}
                  </h3>
                  <p className="text-content leading-relaxed text-sm line-clamp-4">
                    {character.history}
                  </p>
                </div>
              )}
            </div>

          {/* Action buttons */}
          <div className="p-4 bg-muted/10 border-t border-border">
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                variant="primary"
                onClick={() => navigate(`/characters/${character.id}/edit`)}
                className="px-5 py-2 text-sm"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                {t('characters:createAI.actions.editCharacter', 'Edit Character')}
              </Button>

              <Button
                variant="secondary"
                onClick={() => navigate(`/characters/${character.id}`)}
                className="px-5 py-2 text-sm"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                {t('characters:createAI.actions.viewProfile', 'View Profile')}
              </Button>

              <Button
                variant="light"
                onClick={handleDiscard}
                disabled={isDiscarding}
                className="px-5 py-2 text-sm text-danger hover:text-danger/80 hover:bg-danger/10"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                {isDiscarding
                  ? t('characters:createAI.actions.discarding', 'Discarding...')
                  : t('characters:createAI.actions.discard', 'Discard')}
              </Button>
            </div>
          </div>
        </div>

        {/* Create another button */}
        <div className="text-center mt-4">
          <button
            onClick={() => navigate('/characters/create-ai')}
            className="text-primary hover:text-primary/80 transition-colors text-sm underline"
          >
            {t('characters:createAI.actions.createAnother', 'Create Another Character')}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }

        .line-clamp-4 {
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </section>
  );
}
