import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CharacterGenerationStep } from '../../../../hooks/useCharacterGenerationSocket';

interface CharacterRevealScreenProps {
  step: CharacterGenerationStep;
  data?: any;
}

export function CharacterRevealScreen({ step, data }: CharacterRevealScreenProps): JSX.Element {
  const { t } = useTranslation(['characters', 'common', 'dashboard']);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(false);
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, [step, data]);

  // Show name reveal
  if (
    step === CharacterGenerationStep.GENERATING_DETAILS &&
    data?.firstName
  ) {
    return (
      <section className="py-16 px-4 bg-background flex items-center justify-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-primary/10 animate-pulse-slow" />

        <div
          className={`text-center transition-all duration-1000 ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          {/* Title */}
          <div className="mb-8">
            <p className="text-primary text-sm uppercase tracking-widest mb-2">
              {t('characters:createAI.reveal.heroEmerges', 'A hero emerges')}
            </p>
            <h1 className="text-6xl md:text-8xl font-bold text-title mb-4">
              {data.firstName}
              {data.lastName && (
                <>
                  <br />
                  <span className="text-5xl md:text-7xl">{data.lastName}</span>
                </>
              )}
            </h1>
          </div>

          {/* Basic details */}
          <div className="flex justify-center gap-8 text-content">
            {data.species && (
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide text-muted mb-1">
                  {t('characters:form.fields.species', 'Species')}
                </p>
                <p className="text-xl font-semibold capitalize">{typeof data.species === 'object' ? data.species.name : data.species}</p>
              </div>
            )}
            {data.age && (
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide text-muted mb-1">
                  {t('characters:form.fields.age', 'Age')}
                </p>
                <p className="text-xl font-semibold">{data.age}</p>
              </div>
            )}
            {data.gender && (
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide text-muted mb-1">
                  {t('characters:form.fields.gender', 'Gender')}
                </p>
                <p className="text-xl font-semibold capitalize">{t(`filters.genders.${typeof data.gender === 'object' ? data.gender.name : data.gender}`, typeof data.gender === 'object' ? data.gender.name : data.gender, { ns: 'dashboard' })}</p>
              </div>
            )}
          </div>
        </div>

        <style>{`
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.5; }
          }
          .animate-pulse-slow {
            animation: pulse-slow 4s ease-in-out infinite;
          }
        `}</style>
      </section>
    );
  }

  // Show personality reveal
  if (
    step === CharacterGenerationStep.GENERATING_HISTORY &&
    data?.personality
  ) {
    return (
      <section className="py-16 px-6 bg-background flex items-center justify-center">
        <div
          className={`max-w-3xl text-center transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="mb-6">
            <div className="inline-block px-4 py-2 bg-primary/10 rounded-full border border-primary/30 mb-4">
              <p className="text-primary text-sm uppercase tracking-widest">
                {t('characters:createAI.reveal.personalityTitle', 'Personality')}
              </p>
            </div>
          </div>

          <p className="text-2xl md:text-3xl text-content leading-relaxed font-light italic">
            "{data.personality}"
          </p>

          {/* Decorative elements */}
          <div className="mt-8 flex justify-center gap-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-primary/50"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Show history reveal
  if (
    step === CharacterGenerationStep.CREATING_CHARACTER &&
    data?.history
  ) {
    return (
      <section className="py-16 px-6 bg-background flex items-center justify-center">
        <div
          className={`max-w-4xl transition-all duration-1000 relative ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          <div className="mb-8 text-center">
            <div className="inline-block px-4 py-2 bg-primary/10 rounded-full border border-primary/30 mb-4">
              <p className="text-primary text-sm uppercase tracking-widest">
                {t('characters:createAI.reveal.backstoryTitle', 'Their Story')}
              </p>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-8 border border-border shadow-sm">
            <p className="text-lg text-content leading-relaxed whitespace-pre-wrap">
              {data.history}
            </p>
          </div>

          {/* Decorative corner elements */}
          <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-primary/30 rounded-tl-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-primary/30 rounded-br-3xl pointer-events-none" />
        </div>
      </section>
    );
  }

  // Default: show nothing (GameLoadingAnimation will be shown)
  return <></>;
}
