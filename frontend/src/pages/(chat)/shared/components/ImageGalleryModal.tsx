import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../../components/ui/Modal';
import { Button } from '../../../../components/ui/Button';

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  mode?: 'view' | 'select';
  imageUrls?: string[];
  loading?: boolean;
  error?: string | null;
  onImageSelect?: (url: string) => void;
  onUpload?: (file: File) => void;
  /**
   * Legacy props kept for compatibility. They are ignored but prevent
   * React from forwarding them to DOM nodes, solving the warnings that
   * started this fix.
   */
  characterId?: string | null;
  conversationId?: string | null;
  participants?: Array<unknown>;
  initialImageType?: string | null;
}

interface ImageGalleryGridProps {
  images: string[];
  loading: boolean;
  error: string | null;
  emptyLabel: string;
  onImageClick: (url: string, index: number) => void;
}

const ImageGalleryGrid = ({ images, loading, error, emptyLabel, onImageClick }: ImageGalleryGridProps) => {
  if (loading) {
    return <p className="py-8 text-center text-sm text-muted">Loading images...</p>;
  }

  if (error) {
    return <p className="py-8 text-center text-sm text-danger">{error}</p>;
  }

  if (!images.length) {
    return <p className="py-8 text-center text-sm text-muted">{emptyLabel}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {images.map((url, index) => (
        <button
          key={url + index}
          type="button"
          className="group relative overflow-hidden rounded-lg border border-normal/30 bg-light shadow-sm transition hover:shadow-md"
          onClick={() => onImageClick(url, index)}
        >
          <img
            src={url}
            alt="Gallery asset"
            className="h-40 w-full object-cover transition duration-200 group-hover:scale-105"
            loading="lazy"
          />
        </button>
      ))}
    </div>
  );
};

export default function ImageGalleryModal({
  isOpen,
  onClose,
  title,
  mode = 'view',
  imageUrls,
  loading = false,
  error = null,
  onImageSelect,
  onUpload,
}: ImageGalleryModalProps) {
  const { t } = useTranslation(['imageGallery', 'common']);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const images = useMemo(() => imageUrls ?? [], [imageUrls]);
  const computedTitle = title ?? t('imageGallery:title');

  const handleImageClick = (url: string, index: number) => {
    if (mode === 'select' && onImageSelect) {
      onImageSelect(url);
      onClose();
    } else {
      setViewerIndex(index);
    }
  };

  const handleUploadClick = () => {
    if (!onUpload) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement | null;
      const file = target?.files?.[0];
      if (file) {
        onUpload(file);
      }
    };
    input.click();
  };

  const handleViewerClose = () => setViewerIndex(null);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={computedTitle}
        size="xl"
        className="!max-w-5xl"
      >
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
          <div className="text-sm text-muted">
            {loading
              ? t('imageGallery:loading')
              : images.length
                ? t('imageGallery:title')
                : t('imageGallery:noImages')}
          </div>
          {onUpload && (
            <Button variant="secondary" size="small" icon="upload_file" onClick={handleUploadClick}>
              {t('imageGallery:upload')}
            </Button>
          )}
        </div>

        <ImageGalleryGrid
          images={images}
          loading={loading}
          error={error}
          emptyLabel={t('imageGallery:noImages')}
          onImageClick={handleImageClick}
        />
      </Modal>

      {viewerIndex !== null && images[viewerIndex] ? (
        <Modal
          isOpen={viewerIndex !== null}
          onClose={handleViewerClose}
          title={t('imageGallery:title')}
          size="xl"
          className="!max-w-5xl"
        >
          <div className="flex flex-col items-center justify-center">
            <img
              src={images[viewerIndex]}
              alt={t('imageGallery:title')}
              className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain"
            />
          </div>
        </Modal>
      ) : null}
    </>
  );
}
