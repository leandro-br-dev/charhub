import { useEffect, useRef, useState, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  threshold?: number; // % of element visible (0-1)
  rootMargin?: string; // Trigger before reaching element
}

interface UseInfiniteScrollReturn {
  loadMoreRef: (node: HTMLDivElement | null) => void;
  isIntersecting: boolean;
}

/**
 * Hook for implementing infinite scroll with IntersectionObserver
 *
 * Usage:
 * const { loadMoreRef } = useInfiniteScroll({
 *   threshold: 0.1, // Trigger when 10% visible
 *   rootMargin: '100px' // Trigger 100px before element
 * });
 *
 * <div ref={loadMoreRef} />
 */
export function useInfiniteScroll(
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollReturn {
  const { threshold = 0.1, rootMargin = '0px' } = options;

  const elementRef = useRef<HTMLDivElement | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  // Callback ref that triggers when element is mounted/unmounted
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== elementRef.current) {
      elementRef.current = node;
      // Observer will be set up in the useEffect below
    }
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, elementRef.current]); // Re-run when elementRef.current changes

  return { loadMoreRef, isIntersecting };
}
