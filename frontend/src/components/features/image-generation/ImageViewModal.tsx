import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../ui/Modal';

export interface ImageViewModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Image URL to display */
  imageUrl?: string | null;
  /** Optional title for the modal */
  title?: string;
  /** Optional alt text for the image */
  alt?: string;
}

export function ImageViewModal({
  isOpen,
  onClose,
  imageUrl,
  title = 'Image Preview',
  alt = 'Image preview',
}: ImageViewModalProps): JSX.Element {
  const { t } = useTranslation(['characters', 'common']);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom and position when modal opens/closes or image changes
  useEffect(() => {
    if (isOpen) {
      setZoomLevel(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, imageUrl]);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  // Mouse wheel zoom - using native event with { passive: false }
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.25 : 0.25;
    setZoomLevel((prev) => Math.min(Math.max(prev + delta, 0.5), 3));
  }, []);

  // Add wheel event listener with passive: false
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [zoomLevel, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  if (!isOpen) return <></>;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xl">
      <div className="space-y-4">
        {/* Image Display */}
        <div
          ref={containerRef}
          className="flex items-center justify-center overflow-hidden rounded-lg bg-muted/5 border border-border min-h-[300px] max-h-[500px] cursor-grab active:cursor-grabbing"
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={alt}
              style={{
                transform: `scale(${zoomLevel}) translate(${position.x / zoomLevel}px, ${position.y / zoomLevel}px)`,
                transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
              }}
              className="max-w-full max-h-[500px] object-contain select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              draggable={false}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-muted">
              <span className="material-symbols-outlined text-4xl mb-2">image_not_supported</span>
              <p className="text-sm">{t('characters:images.gallery', 'No image to display')}</p>
            </div>
          )}
        </div>

        {/* Zoom Controls */}
        {imageUrl && (
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.5}
              className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={t('common:zoomOut', 'Zoom out')}
            >
              <span className="material-symbols-outlined">remove</span>
            </button>

            <button
              type="button"
              onClick={handleResetZoom}
              className="px-3 py-1 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
            >
              {Math.round(zoomLevel * 100)}%
            </button>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 3}
              className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={t('common:zoomIn', 'Zoom in')}
            >
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
        )}

        {/* Image Info */}
        {imageUrl && (
          <div className="text-xs text-muted text-center">
            {t('characters:images.scrollToZoom', 'Scroll to zoom')} • {t('characters:images.dragToPan', 'Drag to pan (when zoomed in)')}
          </div>
        )}
      </div>
    </Modal>
  );
}
