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

// Inject custom scrollbar styles
if (typeof document !== 'undefined') {
  const styleId = 'modal-custom-scrollbar-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .custom-scrollbar::-webkit-scrollbar {
        width: 8px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.3);
      }
      @media (prefers-color-scheme: dark) {
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  stickyFooter?: ReactNode | null;
  maxContentHeight?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  size = 'md',
  showCloseButton = true,
  stickyFooter = null,
  maxContentHeight = 'max-h-[50vh]'
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

  const overlayClasses = `fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 py-10 transition-opacity duration-200 ease-out ${
    isVisible ? 'opacity-100' : 'opacity-0'
  }`;

  const modalClasses = `w-full ${SIZE_CLASSES[size]} rounded-2xl bg-normal shadow-xl focus:outline-none transform transition-all duration-200 ease-out relative z-[60] ${
    isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
  } ${className} ${stickyFooter ? 'flex flex-col max-h-[70vh]' : ''}`.trim();

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
        <header className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
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
        {stickyFooter ? (
          <>
            <div className={`flex-1 overflow-y-auto min-h-0 px-6 py-5 text-sm text-content custom-scrollbar ${maxContentHeight}`}>
              {children}
            </div>
            <footer className="flex flex-shrink-0 border-t border-border px-6 py-4">
              {stickyFooter}
            </footer>
          </>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto px-6 py-5 text-sm text-content">
            {children}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
