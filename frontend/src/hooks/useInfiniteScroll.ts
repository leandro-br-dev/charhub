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
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  // Callback ref that triggers when element is mounted/unmounted
  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== elementRef.current) {
      // Clean up previous observer if exists
      if (observerRef.current && elementRef.current) {
        observerRef.current.unobserve(elementRef.current);
      }

      elementRef.current = node;

      // Set up new observer when node is available
      if (node) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            const [entry] = entries;
            setIsIntersecting(entry.isIntersecting);
          },
          { threshold, rootMargin }
        );

        observerRef.current.observe(node);
      }
    }
  }, [threshold, rootMargin]);

  // Clean up observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { loadMoreRef, isIntersecting };
}
