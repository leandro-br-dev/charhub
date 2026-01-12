import { useState, useEffect, useRef } from 'react';
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
  prompt?: {
    positive: string;
    negative: string;
  };
  referenceImages?: Array<{ type: string; url: string }>;
  onComplete?: (results: Stage[]) => void;
  onError?: (error: string) => void;
  onGenerationComplete?: () => void; // Called when generation completes (before Done button click)
  // Additional props for ReferenceGenerationModal compatibility
  viewsToGenerate?: ('face' | 'front' | 'side' | 'back')[];
  userPrompt?: string;
  sampleImageUrl?: string | null;
}

export function MultiStageProgress({
  characterId,
  prompt,
  referenceImages = [],
  onComplete,
  onError,
  onGenerationComplete,
  viewsToGenerate,
  userPrompt,
  sampleImageUrl,
}: MultiStageProgressProps) {
  const { t } = useTranslation(['characters', 'common']);

  const cost = IMAGE_GENERATION_COSTS.REFERENCE_SET;
  const [credits, setCredits] = useState<number | null>(null);
  const [hasEnoughCredits, setHasEnoughCredits] = useState(false);

  // Determine which views to show based on viewsToGenerate prop
  const viewsToShow = viewsToGenerate && viewsToGenerate.length > 0 ? viewsToGenerate : ['face', 'front', 'side', 'back'] as const;

  // Initialize stages based on viewsToGenerate
  const [stages, setStages] = useState<Stage[]>(() => {
    const allStageConfigs = [
      { id: 1, name: t('characters:imageGeneration.multiStage.stages.face'), status: 'pending' as const, viewType: 'face' as const },
      { id: 2, name: t('characters:imageGeneration.multiStage.stages.front'), status: 'pending' as const, viewType: 'front' as const },
      { id: 3, name: t('characters:imageGeneration.multiStage.stages.side'), status: 'pending' as const, viewType: 'side' as const },
      { id: 4, name: t('characters:imageGeneration.multiStage.stages.back'), status: 'pending' as const, viewType: 'back' as const },
    ];

    // Filter stages based on viewsToGenerate
    return allStageConfigs.filter(stage => viewsToShow.includes(stage.viewType));
  });
  const [jobId, setJobId] = useState<string | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use refs to store callbacks to prevent re-creating polling interval on every render
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const onGenerationCompleteRef = useRef(onGenerationComplete);
  const pollingActiveRef = useRef(false);

  // Update refs when callbacks change
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
    onGenerationCompleteRef.current = onGenerationComplete;
  }, [onComplete, onError, onGenerationComplete]);

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

  // Auto-start generation when component mounts and credits are loaded
  useEffect(() => {
    if (credits !== null && !isGenerating && !isComplete && !error && overallProgress === 0) {
      startGeneration();
    }
  }, [credits]);

  // Start generation
  const startGeneration = async () => {
    setIsGenerating(true);
    setIsComplete(false);
    setError(null);
    setOverallProgress(0);

    // Mark first stage as in_progress immediately
    setStages(prev => prev.map((s, idx) => ({
      ...s,
      status: idx === 0 ? 'in_progress' as const : 'pending' as const,
      imageUrl: undefined
    })));

    try {
      // Build request body from available props
      const requestBody: Record<string, unknown> = {
        characterId,
      };

      // Add prompt if available (from new props or old prompt prop)
      if (userPrompt || prompt?.positive) {
        requestBody.prompt = {
          positive: userPrompt || prompt?.positive || '',
          negative: prompt?.negative || '',
        };
      }

      // Add reference images
      if (referenceImages && referenceImages.length > 0) {
        requestBody.referenceImages = referenceImages;
      }

      // Add sample image URL if provided (from new prop)
      if (sampleImageUrl) {
        requestBody.sampleImageUrl = sampleImageUrl;
      }

      // Add views to generate if provided
      if (viewsToGenerate && viewsToGenerate.length > 0 && viewsToGenerate.length < 4) {
        requestBody.viewsToGenerate = viewsToGenerate;
      }

      const response = await api.post<{ jobId: string; message: string; estimatedTime: string; stages: string[] }>(
        '/api/v1/image-generation/character-dataset',
        requestBody
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
    if (!jobId || pollingActiveRef.current) return;

    // Mark polling as active to prevent multiple intervals
    pollingActiveRef.current = true;

    const interval = setInterval(async () => {
      try {
        const statusResponse = await api.get<{
          jobId: string;
          state: 'waiting' | 'active' | 'completed' | 'failed';
          progress: { stage: number; total: number; message: string; completedImages?: Array<{ content: string; url: string }> };
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
          pollingActiveRef.current = false;
          setIsGenerating(false);
          setIsComplete(true);
          setOverallProgress(100);

          // Notify parent that generation is complete (allows X button to work)
          onGenerationCompleteRef.current?.();

          // Fetch all generated images from database ONCE when complete
          try {
            const imagesResponse = await api.get<{ success: boolean; data: Record<string, any[]> }>(
              `/api/v1/image-generation/characters/${characterId}/images`
            );
            const allReferenceImages = imagesResponse.data.data.REFERENCE || [];

            // Filter to only show images for views that were requested to be generated
            const requestedReferenceImages = allReferenceImages.filter((img: any) =>
              viewsToShow.includes(img.content)
            );

            console.log('[MultiStageProgress] Completed - requested reference images:', requestedReferenceImages.map((img: any) => ({ content: img.content, url: img.url })));

            // Update stages with actual image URLs from database (only for requested views)
            setStages(prev => {
              const updated = prev.map(stage => {
                const matchingImage = requestedReferenceImages.find((img: any) => img.content === stage.viewType);
                return {
                  ...stage,
                  status: 'completed' as const,
                  imageUrl: matchingImage?.url || stage.imageUrl,
                };
              });
              return updated;
            });
          } catch (err) {
            console.error('Failed to fetch completed images:', err);
            // Fallback: mark all as completed without images
            setStages(prev => prev.map(stage => ({
              ...stage,
              status: 'completed' as const,
            })));
          }
        } else if (state === 'failed') {
          clearInterval(interval);
          pollingActiveRef.current = false;
          setIsGenerating(false);
          const errorMsg = failedReason || t('characters:imageGeneration.multiStage.errors.generationFailed');
          setError(errorMsg);
          setStages(prev => prev.map(s => s.status === 'in_progress' ? { ...s, status: 'error' as const } : s));
          onErrorRef.current?.(errorMsg);
        } else if (state === 'active' && progress) {
          // Update progress immediately - use completedImages from progress if available
          setOverallProgress((progress.stage / progress.total) * 100);

          // Update stage statuses - mark previous stages as completed, current as in_progress
          setStages(prev => prev.map((stage, idx) => {
            const updatedStage: Stage = idx < progress.stage
              ? { ...stage, status: 'completed' as const }
              : idx === progress.stage
              ? { ...stage, status: 'in_progress' as const }
              : stage;

            // Update imageUrl if available from progress.completedImages
            if (progress.completedImages && idx < progress.stage) {
              const completedImage = progress.completedImages.find(img => img.content === stage.viewType);
              if (completedImage) {
                return { ...updatedStage, imageUrl: completedImage.url };
              }
            }

            return updatedStage;
          }));
        }
      } catch (err: any) {
        clearInterval(interval);
        pollingActiveRef.current = false;
        setIsGenerating(false);
        const errorMsg = t('characters:imageGeneration.multiStage.errors.pollFailed');
        setError(errorMsg);
        onErrorRef.current?.(errorMsg);
      }
    }, 1000); // Poll every 1 second for faster updates

    return () => {
      clearInterval(interval);
      pollingActiveRef.current = false;
    };
  }, [jobId, t, characterId]);

  const getStatusColor = (status: Stage['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-muted/30';
      case 'in_progress':
        return 'bg-primary/10 ring-1 ring-primary/30';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 ring-1 ring-red-500/30';
      default:
        return 'bg-muted/10';
    }
  };

  const getStatusIcon = (status: Stage['status']) => {
    switch (status) {
      case 'completed':
        return <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>;
      case 'in_progress':
        return (
          <span className="material-symbols-outlined text-primary text-lg animate-spin">progress_activity</span>
        );
      case 'error':
        return <span className="material-symbols-outlined text-red-500 text-lg">error</span>;
      default:
        return <span className="material-symbols-outlined text-gray-400 dark:text-gray-600 text-lg">radio_button_unchecked</span>;
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className={`rounded-lg p-3 transition-all ${getStatusColor(stage.status)}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-title">{stage.name}</span>
              {getStatusIcon(stage.status)}
            </div>

            {stage.imageUrl ? (
              <img
                src={stage.imageUrl}
                alt={stage.name}
                className="w-full aspect-square object-cover rounded-md"
              />
            ) : (
              <div className="w-full aspect-square bg-muted/50 rounded-md flex items-center justify-center">
                {stage.status === 'pending' && (
                  <span className="text-xs text-muted text-center">
                    {t('characters:imageGeneration.multiStage.waiting')}
                  </span>
                )}
                {stage.status === 'in_progress' && (
                  <span className="text-xs text-primary text-center">
                    {t('characters:imageGeneration.multiStage.generating')}
                  </span>
                )}
                {stage.status === 'error' && (
                  <span className="text-xs text-red-500 text-center">{t('characters:imageGeneration.multiStage.failed')}</span>
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

      {/* Completion Message & Done Button */}
      {isComplete && !error && (
        <div className="space-y-3">
          <div className="p-4 bg-muted/30 rounded-lg text-center">
            <p className="text-title font-semibold text-lg flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-green-500">check_circle</span>
              {t('characters:imageGeneration.multiStage.generationComplete', 'Generation Complete!')}
            </p>
            <p className="text-description text-sm mt-1">
              {stages.length === 1
                ? t('characters:imageGeneration.multiStage.oneStageCompleted', '1 reference image has been generated.')
                : t('characters:imageGeneration.multiStage.stagesCompleted', `{{count}} reference images have been generated.`, { count: stages.length })
              }
            </p>
          </div>
          <button
            onClick={() => onCompleteRef.current?.(stages)}
            className="w-full py-3 px-6 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold transition-opacity"
          >
            {t('common:done', 'Done')}
          </button>
        </div>
      )}
    </div>
  );
}
