import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../../components/ui/Button';
import { ImageCropperModal } from '../../../../components/ui/ImageCropperModal';
import { characterService } from '../../../../services/characterService';

interface CharacterAvatarUploaderProps {
  mode: 'create' | 'edit';
  displayInitial: string;
  currentAvatar?: string | null;
  draftId?: string;
  characterId?: string;
  onAvatarChange: (url: string | null) => void;
}

export function CharacterAvatarUploader({
  mode,
  displayInitial,
  currentAvatar,
  draftId,
  characterId,
  onAvatarChange,
}: CharacterAvatarUploaderProps): JSX.Element {
  const { t } = useTranslation(['characters']);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatar ?? null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    setPreviewUrl(currentAvatar ?? null);
  }, [currentAvatar]);

  const helperText = mode === 'create'
    ? t(
      'characters:form.avatar.helperCreate',
      'Pick an avatar now and we will keep it while you fill out the rest of the form.'
    )
    : t(
      'characters:form.avatar.helperEdit',
      'Update the avatar whenever you like. Changes apply as soon as you save.'
    );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
      setIsCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarClick = () => {
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const handleCropSave = async (blob: Blob) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const file = new File([blob], 'character-avatar.png', { type: blob.type || 'image/png' });
      const uploadResult = await characterService.uploadAvatar({
        file,
        characterId,
        draftId,
      });

      setPreviewUrl(uploadResult.url);
      onAvatarChange(uploadResult.url);
      setIsCropperOpen(false);
      setImageToCrop(null);
    } catch (error) {
      console.error('[CharacterAvatarUploader] upload failed', error);
      setUploadError(t('characters:form.avatar.error', 'We could not upload this image. Try another file.'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onAvatarChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="mt-6 flex flex-col items-center gap-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {previewUrl ? (
        <img
          src={previewUrl}
          alt={t('characters:form.avatar.previewAlt', 'Character avatar preview') ?? 'Character avatar preview'}
          className="h-24 w-24 rounded-full object-cover shadow-sm"
        />
      ) : (
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-normal text-2xl font-semibold text-content">
          {displayInitial}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          variant="light"
          size="small"
          icon="upload"
          onClick={handleAvatarClick}
          disabled={isUploading}
        >
          {previewUrl
            ? t('characters:form.avatar.change', 'Change image')
            : t('characters:form.avatar.upload', 'Upload image')}
        </Button>

        {previewUrl && (
          <Button
            type="button"
            variant="light"
            size="small"
            onClick={handleRemove}
            disabled={isUploading}
          >
            {t('characters:form.avatar.remove', 'Remove')}
          </Button>
        )}
      </div>

      {isUploading && (
        <p className="text-xs text-muted">{t('characters:form.avatar.uploading', 'Uploading...')}</p>
      )}

      {uploadError && (
        <p className="max-w-[220px] text-center text-xs text-red-500 dark:text-red-300">{uploadError}</p>
      )}

      <p className="max-w-[240px] text-center text-xs text-muted">{helperText}</p>

      {imageToCrop && (
        <ImageCropperModal
          isOpen={isCropperOpen}
          onClose={() => {
            setIsCropperOpen(false);
            setImageToCrop(null);
          }}
          imageSrc={imageToCrop}
          onSave={handleCropSave}
          aspect={1}
          cropShape="round"
        />
      )}
    </div>
  );
}
