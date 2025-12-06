import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../../contexts/ToastContext';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/card';
import api from '../../../lib/api';

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

      const { character, avatarJobId } = response.data;

      addToast(
        t(
          'characters:create.generatedSuccess',
          'Character generated! Review and save your changes.'
        ),
        'success'
      );

      // Redirect to edit page with generated character
      navigate(`/characters/${character.id}/edit`);
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.error ||
        err?.message ||
        t('characters:errors.generationFailed', 'Failed to generate character');

      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('characters:createAI.title', 'AI Character Generator')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t(
            'characters:createAI.subtitle',
            'Describe your character or upload an image, and AI will generate the details for you'
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          {/* Description Input */}
          <div className="mb-6">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
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
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
              disabled={isSubmitting}
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t(
                'characters:createAI.descriptionHint',
                'The more detailed your description, the better the results'
              )}
            </p>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                {t('common:and', 'and/or')}
              </span>
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('characters:createAI.imageLabel', 'Character Image')}
            </label>

            {!imagePreview ? (
              <label
                htmlFor="image-upload"
                className={`block w-full px-6 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  isSubmitting
                    ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 cursor-not-allowed'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  <svg
                    className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3"
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
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {t('characters:createAI.uploadPrompt', 'Click to upload character image')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
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
                  className="w-full h-64 object-contain rounded-lg bg-gray-100 dark:bg-gray-900"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={isSubmitting}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
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
        </Card>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
          >
            {t('common:cancel', 'Cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting
              ? t('characters:createAI.generating', 'Generating...')
              : t('characters:createAI.generateButton', 'Generate Character')}
          </Button>
        </div>
      </form>

      {/* Info Card */}
      <Card className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
          {t('characters:createAI.howItWorks', 'How it works')}
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
          <li>
            {t(
              'characters:createAI.step1',
              'Provide a text description and/or upload an image'
            )}
          </li>
          <li>
            {t('characters:createAI.step2', 'AI analyzes your input and generates character details')}
          </li>
          <li>
            {t(
              'characters:createAI.step3',
              'Review and edit the generated character before saving'
            )}
          </li>
          <li>
            {t('characters:createAI.step4', 'An avatar will be automatically generated for you')}
          </li>
        </ul>
      </Card>
    </div>
  );
}
