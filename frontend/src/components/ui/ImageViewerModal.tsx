import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { CachedImage } from './CachedImage';

interface ImageViewerModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Image URL to display */
  src: string;
  /** Image title/alt text */
  title?: string;
}

/**
 * ImageViewerModal - A full-screen image viewer with zoom and drag controls
 *
 * Features:
 * - Full-screen overlay (not a modal dialog)
 * - Close button outside, top right
 * - Image takes 100% of available space, fit to screen initially
 * - Bottom toolbar with zoom controls (left) and hints (center)
 * - Zoom in/out/reset (50% - 500%)
 * - Mouse wheel zoom
 * - Drag to pan when zoomed in
 * - No scroll at 100% zoom
 */
export function ImageViewerModal({
  isOpen,
  onClose,
  src,
  title = 'Image',
}: ImageViewerModalProps): JSX.Element | null {
  const { t } = useTranslation(['common']);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Handle open/close animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // Reset zoom and position when image changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, src]);

  // Zoom in
  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.25, 5));
  }, []);

  // Zoom out
  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  // Reset zoom
  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case '+':
        case '=':
          zoomIn();
          break;
        case '-':
        case '_':
          zoomOut();
          break;
        case '0':
        case 'r':
        case 'R':
          resetZoom();
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, zoomIn, zoomOut, resetZoom, onClose]);

  // Handle wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  }, [zoomIn, zoomOut]);

  // Attach wheel event with passive: false
  useEffect(() => {
    const container = imageContainerRef.current;
    if (!container || !isOpen) return;

    container.addEventListener('wheel', handleWheel, { passive: false } as AddEventListenerOptions);

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [isOpen, handleWheel]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (scale <= 1) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setIsDragging(true);
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  }, [scale, position]);

  // Handle drag move
  const handleDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  if (!isOpen) return null;

  const overlayContent = (
    <div className={`fixed inset-0 z-50 flex flex-col bg-black transition-opacity duration-200 ${
      isVisible ? 'opacity-100' : 'opacity-0'
    }`}>
      {/* Close button - OUTSIDE, top right, matching modal background */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-3 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 shadow-lg transition-colors"
        title={t('common:close', 'Close') || 'Close'}
      >
        <span className="material-symbols-outlined text-2xl text-gray-900 dark:text-gray-100">close</span>
      </button>

      {/* Image container - takes ALL available space */}
      <div
        ref={imageContainerRef}
        className="flex-1 flex items-center justify-center overflow-hidden relative"
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        <CachedImage
          src={src}
          alt={title}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
            maxWidth: '100%',
            maxHeight: '100%',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
          }}
          draggable={false}
        />
      </div>

      {/* Bottom toolbar - EXTERNAL, fixed at bottom */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        {/* Zoom controls - left side */}
        <div className="flex items-center gap-2">
          <button
            onClick={zoomIn}
            disabled={scale >= 5}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            title={t('common:imageViewer.zoomIn', 'Zoom in') || 'Zoom in (+)'}
          >
            <span className="material-symbols-outlined text-xl text-gray-900 dark:text-gray-100">zoom_in</span>
          </button>
          <span className="text-sm font-medium min-w-[60px] text-center text-gray-900 dark:text-gray-100">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            title={t('common:imageViewer.zoomOut', 'Zoom out') || 'Zoom out (-)'}
          >
            <span className="material-symbols-outlined text-xl text-gray-900 dark:text-gray-100">zoom_out</span>
          </button>
          <button
            onClick={resetZoom}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm"
            title={t('common:imageViewer.resetZoom', 'Reset zoom') || 'Reset zoom (0)'}
          >
            <span className="material-symbols-outlined text-xl text-gray-900 dark:text-gray-100">refresh</span>
          </button>
        </div>

        {/* Instructions - center */}
        <div className="flex items-center justify-center gap-4 text-xs text-gray-600 dark:text-gray-400">
          <span>🔍 {t('common:imageViewer.scrollHint', 'Scroll to zoom') || 'Scroll to zoom'}</span>
          <span>✋ {t('common:imageViewer.dragHint', 'Drag to pan when zoomed') || 'Drag to pan when zoomed'}</span>
          <span>⌨️ {t('common:imageViewer.keyboardHint', 'Use +/- to zoom, 0 to reset') || 'Use +/- to zoom, 0 to reset'}</span>
        </div>

        {/* Right side - empty for balance */}
        <div className="w-[140px]"></div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(overlayContent, document.body) : null;
}

/**
 * Hook to open ImageViewerModal - convenience for components
 */
export function useImageViewer() {
  const [viewerState, setViewerState] = useState<{
    isOpen: boolean;
    src: string;
    title: string;
  }>({
    isOpen: false,
    src: '',
    title: '',
  });

  const openViewer = useCallback((src: string, title?: string) => {
    setViewerState({
      isOpen: true,
      src,
      title: title || 'Image',
    });
  }, []);

  const closeViewer = useCallback(() => {
    setViewerState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    viewerState,
    openViewer,
    closeViewer,
  };
}
