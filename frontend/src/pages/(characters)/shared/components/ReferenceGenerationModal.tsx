import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../../../lib/api';
import { Modal } from '../../../../components/ui/Modal';
import { Button } from '../../../../components/ui/Button';
import { PromptWithSampleImageInput } from '../../../../components/features/image-generation';
import { imageGenerationService, type MultiStageJobStatus } from '../../../../services/imageGenerationService';
import { useToast } from '../../../../contexts/ToastContext';
import { characterService } from '../../../../services/characterService';
import { MultiStageProgress } from '../../../../components/features/image-generation';
import type { UseCharacterFormReturn } from '../hooks/useCharacterForm';

type ReferenceView = 'face' | 'front' | 'side' | 'back';

export interface ReferenceGenerationModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Character ID */
  characterId: string;
  /** Character form for getting description */
  form: UseCharacterFormReturn;
  /** Callback when generation completes */
  onComplete: () => void;
}

const REFERENCE_VIEWS: { value: ReferenceView; labelKey: string }[] = [
  { value: 'face', labelKey: 'characters:imageGeneration.referenceImages.stages.face' },
  { value: 'front', labelKey: 'characters:imageGeneration.referenceImages.stages.front' },
  { value: 'side', labelKey: 'characters:imageGeneration.referenceImages.stages.side' },
  { value: 'back', labelKey: 'characters:imageGeneration.referenceImages.stages.back' },
];

export function ReferenceGenerationModal({
  isOpen,
  onClose,
  characterId,
  form,
  onComplete,
}: ReferenceGenerationModalProps): JSX.Element {
  const { t } = useTranslation(['characters', 'common']);
  const { addToast } = useToast();

  const [prompt, setPrompt] = useState('');
  const [referenceImageCreditCost, setReferenceImageCreditCost] = useState<number>(10); // Default 10 credits
  const [sampleImage, setSampleImage] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [jobStarted, setJobStarted] = useState(false);
  const [selectedViews, setSelectedViews] = useState<ReferenceView[]>(['face', 'front', 'side', 'back']);
  const [selectAll, setSelectAll] = useState(true);
  const [uploadedSampleUrl, setUploadedSampleUrl] = useState<string | null>(null);

  // Fetch service costs on mount
  useEffect(() => {
    const fetchServiceCosts = async () => {
      try {
        const response = await api.get<{ success: boolean; data: any[] }>('/api/v1/credits/service-costs');
        // For reference images, we use the same cost as IMAGE_GENERATION
        const imageGenCost = response.data.data.find((cost) => cost.serviceIdentifier === 'IMAGE_GENERATION');
        if (imageGenCost) {
          setReferenceImageCreditCost(imageGenCost.creditsPerUnit);
        }
      } catch (error) {
        console.error('Failed to fetch service costs:', error);
      }
    };

    fetchServiceCosts();
  }, []);

  const handleGenerate = async () => {
    if (!characterId || selectedViews.length === 0) return;

    setIsGenerating(true);
    setJobStarted(false);

    // Upload sample image if provided
    if (sampleImage) {
      setIsUploading(true);

      try {
        const uploadResult = await characterService.uploadCharacterImage({
          characterId,
          file: sampleImage,
          type: 'SAMPLE',
        });

        setUploadedSampleUrl(uploadResult?.url || null);
        setIsUploading(false);
      } catch (error) {
        console.error('Failed to upload sample image:', error);
        addToast(
          t('characters:errors.uploadFailed', 'Failed to upload sample image'),
          'error'
        );
        setIsGenerating(false);
        setIsUploading(false);
        return;
      }
    }

    // Start the generation - MultiStageProgress will handle the API call
    setJobStarted(true);
  };

  const handleComplete = () => {
    setPrompt('');
    setSampleImage(null);
    setUploadedSampleUrl(null);
    setJobStarted(false);
    setIsGenerating(false);
    if (onComplete) {
      onComplete();
    }
    onClose();
  };

  const handleClose = () => {
    if (!isGenerating && !isUploading && !jobStarted) {
      setPrompt('');
      setSampleImage(null);
      setUploadedSampleUrl(null);
      setSelectedViews(['face', 'front', 'side', 'back']);
      setSelectAll(true);
      onClose();
    }
  };

  const handleToggleView = (view: ReferenceView) => {
    setSelectedViews(prev => {
      if (prev.includes(view)) {
        const newViews = prev.filter(v => v !== view);
        setSelectAll(newViews.length === 4);
        return newViews;
      } else {
        const newViews = [...prev, view];
        setSelectAll(newViews.length === 4);
        return newViews;
      }
    });
  };

  const handleToggleAll = () => {
    if (selectAll) {
      // Deselect all
      setSelectedViews([]);
      setSelectAll(false);
    } else {
      // Select all
      setSelectedViews(['face', 'front', 'side', 'back']);
      setSelectAll(true);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('characters:imageGeneration.referenceImages.title', 'Generate Reference Dataset')}
      size="lg"
    >
      <div className="space-y-3">
        {!jobStarted ? (
          <>
            {/* Compact Header with Cost */}
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-description flex-1">
                {t('characters:imageGeneration.referenceImages.shortDescription', '4-view reference dataset for consistent AI generation')}
              </p>
              <span className="text-xs font-semibold text-accent whitespace-nowrap">
                {selectedViews.length * referenceImageCreditCost} {t('common:credits', 'credits')}
              </span>
            </div>

            {/* View Selection - Compact */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleToggleAll}
                    disabled={isGenerating || isUploading}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="font-medium">{t('common:selectAll', 'All')}</span>
                </label>
                {selectedViews.length === 0 && (
                  <p className="text-xs text-red-500">
                    {t('characters:imageGeneration.referenceImages.selectAtLeastOne', 'Select at least one')}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {REFERENCE_VIEWS.map(view => (
                  <label
                    key={view.value}
                    className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border cursor-pointer transition-colors ${
                      selectedViews.includes(view.value)
                        ? 'bg-primary/10 border-primary'
                        : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 hover:border-primary/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedViews.includes(view.value)}
                      onChange={() => handleToggleView(view.value)}
                      disabled={isGenerating || isUploading}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-[10px] capitalize text-center leading-tight">{t(view.labelKey, view.value)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Prompt + Sample Image Input */}
            <PromptWithSampleImageInput
              prompt={prompt}
              onPromptChange={setPrompt}
              sampleImage={sampleImage ? URL.createObjectURL(sampleImage) : null}
              onSampleImageChange={(file: File | null) => setSampleImage(file)}
              disabled={isGenerating || isUploading}
            />

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="light"
                onClick={handleClose}
                disabled={isGenerating || isUploading}
                size="small"
              >
                {t('common:cancel', 'Cancel')}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleGenerate}
                disabled={isGenerating || isUploading || selectedViews.length === 0}
                size="small"
              >
                {isGenerating || isUploading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                    {t('characters:imageGeneration.imagesTab.modals.generating', 'Generating...')}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">auto_awesome</span>
                    {t('characters:imageGeneration.referenceImages.startButton', 'Generate')}
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Progress Component */}
            <MultiStageProgress
              characterId={characterId}
              viewsToGenerate={selectedViews.length === 4 ? undefined : selectedViews}
              userPrompt={prompt}
              sampleImageUrl={uploadedSampleUrl}
              onComplete={handleComplete}
              onError={(error) => {
                console.error('Multi-stage generation failed:', error);
                setIsGenerating(false);
                setJobStarted(false);
              }}
            />
          </>
        )}
      </div>
    </Modal>
  );
}
