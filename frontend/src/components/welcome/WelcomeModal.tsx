import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useWelcomeFlow } from './hooks/useWelcomeFlow';
import { DisplayNameStep } from './steps/DisplayNameStep';
import { UsernameStep } from './steps/UsernameStep';
import { BirthdateStep } from './steps/BirthdateStep';
import { GenderStep } from './steps/GenderStep';
import { LanguageStep } from './steps/LanguageStep';
import { AgeRatingStep } from './steps/AgeRatingStep';
import { ContentFiltersStep } from './steps/ContentFiltersStep';

export function WelcomeModal() {
  const { t } = useTranslation('welcome');
  const {
    isOpen,
    currentStep,
    currentStepIndex,
    totalSteps,
    formData,
    isLoading,
    error,
    success,
    updateFormData,
    goToNextStep,
    goToPreviousStep,
    skipWelcome,
  } = useWelcomeFlow();

  if (!isOpen) {
    return null;
  }

  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  const renderStep = () => {
    switch (currentStep) {
      case 'displayName':
        return <DisplayNameStep data={formData} onUpdate={updateFormData} />;
      case 'username':
        return <UsernameStep data={formData} onUpdate={updateFormData} />;
      case 'birthDate':
        return <BirthdateStep data={formData} onUpdate={updateFormData} />;
      case 'gender':
        return <GenderStep data={formData} onUpdate={updateFormData} />;
      case 'language':
        return <LanguageStep data={formData} onUpdate={updateFormData} />;
      case 'ageRating':
        return <AgeRatingStep data={formData} onUpdate={updateFormData} />;
      case 'contentFilters':
        return <ContentFiltersStep data={formData} onUpdate={updateFormData} />;
      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={skipWelcome}
      title={t('displayName.title', 'Welcome to CharHub!')}
      size="lg"
    >
      <div className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {t('modal.progress', 'Step {{current}} of {{total}}', { current: currentStepIndex + 1, total: totalSteps })}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-900/20">
            <div className="mb-2 text-4xl">✅</div>
            <h4 className="text-lg font-semibold text-green-800 dark:text-green-200">
              {t('modal.successTitle', 'Welcome Complete!')}
            </h4>
            <p className="text-sm text-green-700 dark:text-green-300">
              {t('modal.successMessage', 'Your profile has been set up successfully. Enjoy CharHub!')}
            </p>
          </div>
        )}

        {/* Step Content */}
        {!success && <div className="min-h-[300px]">{renderStep()}</div>}

        {/* Navigation Buttons */}
        {!success && (
          <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
            <Button
              variant="light"
              onClick={goToPreviousStep}
              disabled={currentStepIndex === 0 || isLoading}
            >
              ← {t('modal.back', 'Back')}
            </Button>

            <Button
              variant="light"
              onClick={skipWelcome}
              disabled={isLoading}
            >
              {t('modal.skip', 'Skip')}
            </Button>

            <Button
              onClick={goToNextStep}
              disabled={isLoading}
            >
              {isLoading ? t('modal.saving', 'Saving...') : currentStepIndex === totalSteps - 1 ? t('modal.finish', 'Finish') : `${t('modal.next', 'Next')} →`}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
