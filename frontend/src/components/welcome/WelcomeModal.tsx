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
  const {
    isOpen,
    currentStep,
    currentStepIndex,
    totalSteps,
    formData,
    isLoading,
    error,
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
      title="Welcome to CharHub!"
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
          <p className="text-center text-xs text-muted-foreground">
            Step {currentStepIndex + 1} of {totalSteps}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="min-h-[300px]">{renderStep()}</div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
          <Button
            variant="light"
            onClick={goToPreviousStep}
            disabled={currentStepIndex === 0 || isLoading}
          >
            ← Back
          </Button>

          <Button
            variant="light"
            onClick={skipWelcome}
            disabled={isLoading}
          >
            Skip
          </Button>

          <Button
            onClick={goToNextStep}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : currentStepIndex === totalSteps - 1 ? 'Complete' : 'Next →'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
