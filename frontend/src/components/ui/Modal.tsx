import { type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg' | 'xl', string> = {
  sm: 'max-w-sm',
  md: 'max-w-2xl',
  lg: 'max-w-3xl',
  xl: 'max-w-4xl'
};

const ANIMATION_DURATION = 200;

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  size = 'md',
  showCloseButton = true
}: ModalProps): JSX.Element | null {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(isOpen);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<number | undefined>(undefined);
  const openFrameRef = useRef<number | undefined>(undefined);
  const openSecondFrameRef = useRef<number | undefined>(undefined);


  useEffect(() => {
    if (isOpen) {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = undefined;
      }

      if (openFrameRef.current) {
        window.cancelAnimationFrame(openFrameRef.current);
        openFrameRef.current = undefined;
      }

      if (openSecondFrameRef.current) {
        window.cancelAnimationFrame(openSecondFrameRef.current);
        openSecondFrameRef.current = undefined;
      }

      setShouldRender(true);
      setIsVisible(false);

      if (typeof window !== 'undefined') {
        openFrameRef.current = window.requestAnimationFrame(() => {
          openSecondFrameRef.current = window.requestAnimationFrame(() => {
            setIsVisible(true);
            openSecondFrameRef.current = undefined;
          });
          openFrameRef.current = undefined;
        });
      } else {
        setIsVisible(true);
      }
    } else {
      setIsVisible(false);

      if (typeof window !== 'undefined') {
        closeTimeoutRef.current = window.setTimeout(() => {
          setShouldRender(false);
          closeTimeoutRef.current = undefined;
        }, ANIMATION_DURATION);
      } else {
        setShouldRender(false);
      }
    }

    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = undefined;
      }

      if (openFrameRef.current) {
        window.cancelAnimationFrame(openFrameRef.current);
        openFrameRef.current = undefined;
      }

      if (openSecondFrameRef.current) {
        window.cancelAnimationFrame(openSecondFrameRef.current);
        openSecondFrameRef.current = undefined;
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!shouldRender) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [shouldRender, onClose]);

  if (!shouldRender) {
    return null;
  }

  const overlayClasses = `fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-10 transition-opacity duration-200 ease-out ${
    isVisible ? 'opacity-100' : 'opacity-0'
  }`;

  const modalClasses = `w-full ${SIZE_CLASSES[size]} rounded-2xl bg-normal shadow-xl focus:outline-none transform transition-all duration-200 ease-out ${
    isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
  } ${className}`.trim();

  const modalContent = (
    <div
      ref={overlayRef}
      className={overlayClasses}
      onMouseDown={event => {
        if (event.target === overlayRef.current) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={modalClasses}
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-title">{title}</h2>
          {showCloseButton && (
            <Button
              aria-label="Close dialog"
              variant="light"
              size="small"
              icon="close"
              onClick={onClose}
            />
          )}
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 text-sm text-content">
          {children}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
