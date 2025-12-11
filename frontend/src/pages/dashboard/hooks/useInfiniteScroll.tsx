import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface InfiniteScrollResponse<T> {
  data: T[];
  hasMore: boolean;
  nextCursor?: string | number;
}

interface UseInfiniteScrollOptions<T> {
  fetchFn: (cursor?: string | number) => Promise<InfiniteScrollResponse<T>>;
  enabled?: boolean;
  threshold?: number;
  rootMargin?: string;
}

interface UseInfiniteScrollReturn<T> {
  data: T[];
  hasMore: boolean;
  isLoading: boolean;
  isFetchingMore: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
  observerTarget: React.RefObject<HTMLDivElement | null>;
}

export function useInfiniteScroll<T>({
  fetchFn,
  enabled = true,
  threshold = 0.5,
  rootMargin = '100px',
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [cursor, setCursor] = useState<string | number | undefined>(undefined);
  const { t } = useTranslation(['common']);

  const observerTarget = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  const fetchData = useCallback(
    async (isLoadMore = false) => {
      if (!enabled || (!isLoadMore && !isInitialMount.current)) return;

      if (isLoadMore) {
        setIsFetchingMore(true);
      } else {
        setIsLoading(true);
      }

      setError(null);

      try {
        const response = await fetchFn(isLoadMore ? cursor : undefined);

        if (isLoadMore) {
          setData((prev) => [...prev, ...response.data]);
        } else {
          setData(response.data);
        }

        setHasMore(response.hasMore);
        setCursor(response.nextCursor);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(t('common:errors.failedToFetchData'));
        setError(error);

        if (!isLoadMore) {
          setData([]);
        }
      } finally {
        if (isLoadMore) {
          setIsFetchingMore(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [fetchFn, cursor, enabled, t]
  );

  const loadMore = useCallback(async () => {
    if (hasMore && !isLoading && !isFetchingMore) {
      await fetchData(true);
    }
  }, [hasMore, isLoading, isFetchingMore, fetchData]);

  const refetch = useCallback(async () => {
    setData([]);
    setCursor(undefined);
    setHasMore(true);
    await fetchData(false);
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    if (enabled && isInitialMount.current) {
      isInitialMount.current = false;
      fetchData(false);
    }
  }, [enabled, fetchData]);

  // Intersection Observer for automatic load more
  useEffect(() => {
    if (!enabled || !hasMore || isLoading || isFetchingMore) return;

    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(target);

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [enabled, hasMore, isLoading, isFetchingMore, loadMore, threshold, rootMargin]);

  return {
    data,
    hasMore,
    isLoading,
    isFetchingMore,
    error,
    loadMore,
    refetch,
    observerTarget,
  };
}
