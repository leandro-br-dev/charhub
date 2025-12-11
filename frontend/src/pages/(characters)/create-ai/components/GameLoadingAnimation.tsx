import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface GameLoadingAnimationProps {
  message: string;
  progress: number;
}

export function GameLoadingAnimation({ message, progress }: GameLoadingAnimationProps): JSX.Element {
  const { t } = useTranslation(['characters']);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-12 px-4 bg-background flex items-center justify-center relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/50 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-6 max-w-2xl w-full">
        {/* Spinning magic circle */}
        <div className="mb-8 flex justify-center">
          <div className="relative w-32 h-32">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-spin-slow" />

            {/* Inner ring */}
            <div className="absolute inset-4 rounded-full border-4 border-primary/50 animate-spin-reverse" />

            {/* Center glow */}
            <div className="absolute inset-8 rounded-full bg-primary animate-pulse shadow-2xl shadow-primary/50" />

            {/* Sparkles */}
            <div className="absolute inset-0">
              {[0, 90, 180, 270].map((rotation, i) => (
                <div
                  key={i}
                  className="absolute top-1/2 left-1/2 w-2 h-2 bg-primary-foreground rounded-full"
                  style={{
                    transform: `rotate(${rotation}deg) translateY(-60px)`,
                    animation: `pulse 1.5s ease-in-out ${i * 0.3}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-title mb-2 animate-fade-in">
            {t('characters:createAI.loading.creatingCharacter', 'Creating Your Character')}
          </h2>
          <p className="text-xl text-content min-h-[2rem] animate-fade-in">
            {message}
            {dots}
          </p>
        </div>

        {/* Progress bar */}
        <div className="relative">
          <div className="w-full h-2 bg-muted/20 rounded-full overflow-hidden border border-border">
            <div
              className="h-full bg-primary rounded-full transition-all duration-1000 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/30 to-transparent animate-shimmer" />
            </div>
          </div>

          {/* Progress percentage */}
          <div className="mt-3 text-primary font-semibold text-sm">
            {Math.round(progress)}%
          </div>
        </div>

        {/* Flavor text */}
        <p className="mt-8 text-sm text-muted italic animate-fade-in">
          {t('characters:createAI.loading.threadsOfFate', 'The threads of fate are being woven...')}
        </p>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-spin-slow {
          animation: spin-slow 4s linear infinite;
        }

        .animate-spin-reverse {
          animation: spin-reverse 3s linear infinite;
        }

        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </section>
  );
}
