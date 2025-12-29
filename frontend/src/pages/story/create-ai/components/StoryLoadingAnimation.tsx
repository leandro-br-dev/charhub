import { useTranslation } from 'react-i18next';

interface StoryLoadingAnimationProps {
  message: string;
  progress: number; // 0-100
}

export function StoryLoadingAnimation({ message, progress }: StoryLoadingAnimationProps): JSX.Element {
  const { t } = useTranslation(['story']);

  return (
    <section className="min-h-screen py-16 px-6 bg-background flex flex-col items-center justify-center">
      <div className="w-full max-w-md">
        {/* Animated book illustration */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            {/* Book base */}
            <div className="w-32 h-24 bg-gradient-to-b from-amber-700 to-amber-900 rounded-sm shadow-lg relative">
              {/* Book spine */}
              <div className="absolute left-0 top-0 bottom-0 w-2 bg-amber-950 rounded-l-sm"></div>
              {/* Pages */}
              <div className="absolute inset-1 bg-cream/90 rounded-sm overflow-hidden">
                {/* Animated lines simulating text */}
                <div className="absolute inset-2 space-y-1">
                  <div className="h-1 bg-amber-300/40 rounded animate-pulse"></div>
                  <div className="h-1 bg-amber-300/40 rounded animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                  <div className="h-1 bg-amber-300/40 rounded animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="h-1 bg-amber-300/40 rounded animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                </div>
                {/* Magical sparkles */}
                <div className="absolute -top-2 -right-2 w-4 h-4">
                  <div className="absolute inset-0 bg-yellow-300 rounded-full animate-ping"></div>
                  <div className="absolute inset-0 bg-yellow-400 rounded-full"></div>
                </div>
                <div className="absolute top-4 -right-4 w-3 h-3">
                  <div className="absolute inset-0 bg-blue-300 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
                  <div className="absolute inset-0 bg-blue-400 rounded-full"></div>
                </div>
                <div className="absolute -bottom-1 right-2 w-2 h-2">
                  <div className="absolute inset-0 bg-purple-300 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
                  <div className="absolute inset-0 bg-purple-400 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-title mb-2">{message}</h2>
          <p className="text-sm text-muted">{t('story:createAI.weavingYourTale', 'Weaving your tale...')}</p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-input rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary via-purple-500 to-primary bg-[length:200%_100%] animate-gradient-move rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Progress percentage */}
        <div className="text-center mt-3">
          <span className="text-sm font-semibold text-primary">{Math.round(progress)}%</span>
        </div>
      </div>

      <style>{`
        @keyframes gradient-move {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-move {
          animation: gradient-move 3s ease infinite;
        }
      `}</style>
    </section>
  );
}
