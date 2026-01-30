import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../../contexts/ToastContext';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/card';
import api from '../../../lib/api';
import { GenerationWizard } from './components';
import { extractErrorMessage } from '../../../utils/apiErrorHandler';

const API_VERSION = import.meta.env.VITE_API_VERSION || '/api/v1';

export default function AutomatedCharacterCreatePage(): JSX.Element {
  const { t } = useTranslation(['characters', 'common']);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError(t('characters:errors.imageTooLarge', 'Image must be smaller than 10MB'));
      return;
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError(t('characters:errors.invalidImageType', 'Image must be PNG, JPEG, WEBP, or GIF'));
      return;
    }

    setImageFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate: at least description or image required
    if (!description.trim() && !imageFile) {
      setError(
        t(
          'characters:errors.descriptionOrImageRequired',
          'Please provide either a description or an image'
        )
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData for multipart upload
      const formData = new FormData();

      if (description.trim()) {
        formData.append('description', description.trim());
      }

      if (imageFile) {
        formData.append('image', imageFile);
      }

      // Call automated generation endpoint
      const response = await api.post(`${API_VERSION}/characters/generate-automated`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { sessionId: newSessionId } = response.data;

      if (!newSessionId) {
        throw new Error('No session ID received from server');
      }

      // Set session ID to show wizard
      setSessionId(newSessionId);

      addToast(
        t(
          'characters:create.generationStarted',
          'Character generation started! Watching progress...'
        ),
        'success'
      );
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err) ||
        t('characters:errors.generationFailed', 'Failed to generate character');

      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If we have a session ID, show the wizard
  if (sessionId) {
    return <GenerationWizard sessionId={sessionId} />;
  }

  // Otherwise, show the form
  return (
    <section className="flex flex-col gap-6 py-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-title">
          {t('characters:createAI.title', 'AI Character Generator')}
        </h1>
        <p className="max-w-2xl text-sm text-description">
          {t(
            'characters:createAI.subtitle',
            'Describe your character or upload an image, and AI will generate the details for you'
          )}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Description Input */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-title mb-2"
          >
            {t('characters:createAI.descriptionLabel', 'Character Description')}
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t(
              'characters:createAI.descriptionPlaceholder',
              'Describe your character... (e.g., "A brave knight with silver armor and a noble heart")'
            )}
            rows={4}
            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-content placeholder:text-muted resize-none"
            disabled={isSubmitting}
          />
          <p className="mt-2 text-xs text-muted">
            {t(
              'characters:createAI.descriptionHint',
              'The more detailed your description, the better the results'
            )}
          </p>
        </div>

        {/* Divider */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-background text-muted">
              {t('common:and', 'and/or')}
            </span>
          </div>
        </div>

        {/* Image Upload */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <label className="block text-sm font-medium text-title mb-2">
            {t('characters:createAI.imageLabel', 'Character Image')}
          </label>

          {!imagePreview ? (
            <label
              htmlFor="image-upload"
              className={`block w-full px-6 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                isSubmitting
                  ? 'border-border/50 bg-input/50 cursor-not-allowed'
                  : 'border-border hover:border-primary bg-input hover:bg-input/80'
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <svg
                  className="w-12 h-12 text-muted mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm text-content mb-1">
                  {t('characters:createAI.uploadPrompt', 'Click to upload character image')}
                </p>
                <p className="text-xs text-muted">
                  {t('characters:createAI.uploadHint', 'PNG, JPEG, WEBP, GIF (max 10MB)')}
                </p>
              </div>
              <input
                id="image-upload"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                onChange={handleImageChange}
                disabled={isSubmitting}
                className="hidden"
              />
            </label>
          ) : (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full max-h-96 object-contain rounded-lg bg-input"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                disabled={isSubmitting}
                className="absolute top-2 right-2 p-2 bg-danger text-content-dark rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="rounded-xl border border-danger bg-danger/10 p-4">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <Button
            type="button"
            variant="light"
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {t('common:cancel', 'Cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting
              ? t('characters:createAI.generating', 'Generating...')
              : t('characters:createAI.generateButton', 'Generate Character')}
          </Button>
        </div>
      </form>

      {/* Info Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-title mb-3">
          {t('characters:createAI.howItWorks', 'How it works')}
        </h3>
        <ul className="text-sm text-content space-y-2">
          <li className="flex gap-2">
            <span className="text-primary font-semibold">1.</span>
            <span>
              {t(
                'characters:createAI.step1',
                'Provide a text description and/or upload an image'
              )}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-semibold">2.</span>
            <span>
              {t('characters:createAI.step2', 'AI analyzes your input and generates character details')}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-semibold">3.</span>
            <span>
              {t(
                'characters:createAI.step3',
                'Review and edit the generated character before saving'
              )}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-semibold">4.</span>
            <span>
              {t('characters:createAI.step4', 'An avatar will be automatically generated for you')}
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}
