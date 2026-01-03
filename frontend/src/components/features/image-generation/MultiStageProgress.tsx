import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../../lib/api';
import { IMAGE_GENERATION_COSTS } from '../../../config/credits';
import { creditService } from '../../../services/creditService';

export interface Stage {
  id: number;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  imageUrl?: string;
  viewType: 'face' | 'front' | 'side' | 'back';
}

export interface MultiStageProgressProps {
  characterId: string;
  prompt: {
    positive: string;
    negative: string;
  };
  referenceImages?: Array<{ type: string; url: string }>;
  onComplete?: (results: Stage[]) => void;
  onError?: (error: string) => void;
}

export function MultiStageProgress({
  characterId,
  prompt,
  referenceImages = [],
  onComplete,
  onError,
}: MultiStageProgressProps) {
  const { t } = useTranslation(['characters', 'common']);

  const cost = IMAGE_GENERATION_COSTS.REFERENCE_SET;
  const [credits, setCredits] = useState<number | null>(null);
  const [hasEnoughCredits, setHasEnoughCredits] = useState(false);

  const [stages, setStages] = useState<Stage[]>([
    { id: 1, name: t('characters:imageGeneration.multiStage.stages.face'), status: 'pending', viewType: 'face' },
    { id: 2, name: t('characters:imageGeneration.multiStage.stages.front'), status: 'pending', viewType: 'front' },
    { id: 3, name: t('characters:imageGeneration.multiStage.stages.side'), status: 'pending', viewType: 'side' },
    { id: 4, name: t('characters:imageGeneration.multiStage.stages.back'), status: 'pending', viewType: 'back' },
  ]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load credits on mount
  useEffect(() => {
    const loadCredits = async () => {
      try {
        const balance = await creditService.getBalance();
        setCredits(balance);
        setHasEnoughCredits(balance >= cost);
      } catch (error) {
        console.error('Failed to load credits:', error);
        setCredits(0);
        setHasEnoughCredits(false);
      }
    };
    loadCredits();
  }, [cost]);

  // Start generation
  const startGeneration = async () => {
    setIsGenerating(true);
    setError(null);
    setOverallProgress(0);
    setStages(prev => prev.map(s => ({ ...s, status: 'pending' as const, imageUrl: undefined })));

    try {
      const response = await api.post<{ jobId: string; message: string; estimatedTime: string; stages: string[] }>(
        '/api/v1/image-generation/character-dataset',
        {
          characterId,
          prompt,
          referenceImages,
        }
      );

      setJobId(response.data.jobId);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || t('characters:imageGeneration.multiStage.errors.startFailed');
      setError(errorMessage);
      setIsGenerating(false);
      onError?.(errorMessage);
    }
  };

  // Poll job status
  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const statusResponse = await api.get<{
          jobId: string;
          state: 'waiting' | 'active' | 'completed' | 'failed';
          progress: { stage: number; total: number; message: string };
          result?: {
            success: boolean;
            characterId: string;
            results: Array<{
              stage: number;
              type: string;
              viewType: string;
              imageUrl: string;
            }>;
          };
          failedReason?: string;
        }>(`/api/v1/image-generation/status/${jobId}`);

        const { state, progress, result, failedReason } = statusResponse.data;

        if (state === 'completed') {
          clearInterval(interval);
          setIsGenerating(false);
          setOverallProgress(100);

          // Update stages with results if available
          if (result?.results) {
            const updatedStages = stages.map(stage => {
              const resultItem = result.results.find((r: { stage: number; type: string; viewType: string; imageUrl: string }) => r.viewType === stage.viewType);
              return {
                ...stage,
                status: 'completed' as const,
                imageUrl: resultItem?.imageUrl,
              };
            });

            setStages(updatedStages);
            onComplete?.(updatedStages);
          } else {
            // No results but completed - mark all as completed
            const updatedStages = stages.map(stage => ({
              ...stage,
              status: 'completed' as const,
            }));
            setStages(updatedStages);
            onComplete?.(updatedStages);
          }
        } else if (state === 'failed') {
          clearInterval(interval);
          setIsGenerating(false);
          const errorMsg = failedReason || t('characters:imageGeneration.multiStage.errors.generationFailed');
          setError(errorMsg);
          setStages(prev => prev.map(s => s.status === 'in_progress' ? { ...s, status: 'error' as const } : s));
          onError?.(errorMsg);
        } else if (state === 'active' && progress) {
          // Update progress
          setOverallProgress((progress.stage / progress.total) * 100);

          // Update stage statuses
          setStages(prev => prev.map((stage, idx) => {
            if (idx < progress.stage - 1) {
              return { ...stage, status: 'completed' as const };
            } else if (idx === progress.stage - 1) {
              return { ...stage, status: 'in_progress' as const };
            }
            return stage;
          }));

          // Fetch current images to show completed ones during generation
          try {
            const imagesResponse = await api.get<{ success: boolean; data: { AVATAR?: any[]; REFERENCE?: any[]; [key: string]: any[] } }>(
              `/api/v1/image-generation/characters/${characterId}/images`
            );
            const referenceImages = imagesResponse.data.data.REFERENCE || [];

            console.log('[MultiStageProgress] Polling - reference images found:', referenceImages.length, referenceImages.map((img: any) => ({ content: img.content, url: img.url })));

            // Update stages with actual image URLs
            setStages(prev => {
              const updated = prev.map(stage => {
                const matchingImage = referenceImages.find((img: any) => img.content === stage.viewType);
                if (matchingImage && !stage.imageUrl) {
                  console.log('[MultiStageProgress] Updating stage:', stage.viewType, 'with image:', matchingImage.url);
                  return {
                    ...stage,
                    imageUrl: matchingImage.url,
                  };
                }
                return stage;
              });
              return updated;
            });
          } catch (err) {
            // Silently fail - image fetch is not critical
            console.error('Failed to fetch images during polling:', err);
          }
        }
      } catch (err: any) {
        clearInterval(interval);
        setIsGenerating(false);
        const errorMsg = t('characters:imageGeneration.multiStage.errors.pollFailed');
        setError(errorMsg);
        onError?.(errorMsg);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [jobId, t, stages, onComplete, onError]);

  const getStatusColor = (status: Stage['status']) => {
    switch (status) {
      case 'completed':
        return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'in_progress':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 animate-pulse';
      case 'error':
        return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      default:
        return 'border-gray-300 dark:border-gray-700';
    }
  };

  const getStatusIcon = (status: Stage['status']) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'in_progress':
        return (
          <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12c0-4.411-3.589-8-8-8v4c2.205 0 4 1.795 4 4s-1.795 4-4 4 4-4 4-1.795 4-4-4-4z"></path>
          </svg>
        );
      case 'error':
        return '✕';
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-700 dark:text-gray-300">
            {isGenerating ? t('characters:imageGeneration.multiStage.generating') : t('characters:imageGeneration.multiStage.ready')}
          </span>
          <span className="font-semibold">{Math.round(overallProgress)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        {isGenerating && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('characters:imageGeneration.multiStage.estimatedTime')}
          </p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-500 rounded-lg">
          <p className="text-red-700 dark:text-red-300 font-semibold">{error}</p>
        </div>
      )}

      {/* Individual Stages */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className={`border-2 rounded-lg p-4 transition-all ${getStatusColor(stage.status)}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">{stage.name}</span>
              {getStatusIcon(stage.status)}
            </div>

            {stage.imageUrl ? (
              <img
                src={stage.imageUrl}
                alt={stage.name}
                className="w-full aspect-square object-cover rounded"
              />
            ) : (
              <div className="w-full aspect-square bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                {stage.status === 'pending' && (
                  <span className="text-gray-400 dark:text-gray-600 text-xs text-center">
                    {t('characters:imageGeneration.multiStage.waiting')}
                  </span>
                )}
                {stage.status === 'in_progress' && (
                  <div className="flex flex-col items-center gap-2">
                    <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12c0-4.411-3.589-8-8-8v4c2.205 0 4 1.795 4 4s-1.795 4-4 4 4-4 4-1.795 4-4-4-4z"></path>
                    </svg>
                    <span className="text-blue-500 text-xs">{t('characters:imageGeneration.multiStage.generating')}</span>
                  </div>
                )}
                {stage.status === 'error' && (
                  <span className="text-red-500 text-xs">✕ {t('characters:imageGeneration.multiStage.failed')}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Start Button (if not generating) */}
      {!isGenerating && !error && overallProgress === 0 && (
        <button
          onClick={startGeneration}
          disabled={!hasEnoughCredits}
          className={`w-full py-3 px-6 text-white rounded-lg font-semibold transition-opacity ${
            hasEnoughCredits
              ? 'bg-primary hover:opacity-90'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {!hasEnoughCredits
            ? `Insufficient credits (need ${cost})`
            : `${t('characters:imageGeneration.multiStage.startButton')} (${cost} credits)`
          }
        </button>
      )}

      {/* Retry Button (if error) */}
      {error && (
        <button
          onClick={startGeneration}
          disabled={!hasEnoughCredits}
          className={`w-full py-3 px-6 text-white rounded-lg font-semibold transition-opacity ${
            hasEnoughCredits
              ? 'bg-primary hover:opacity-90'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {!hasEnoughCredits
            ? `Insufficient credits (need ${cost})`
            : t('common:retry')
          }
        </button>
      )}
    </div>
  );
}
