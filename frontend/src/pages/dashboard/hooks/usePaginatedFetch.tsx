import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface PaginatedResponse<T> {
  data: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface UsePaginatedFetchOptions<T> {
  fetchFn: (page: number, limit: number) => Promise<PaginatedResponse<T>>;
  limit?: number;
  initialPage?: number;
  enabled?: boolean;
}

interface UsePaginatedFetchReturn<T> {
  data: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isLoading: boolean;
  error: Error | null;
  fetchNextPage: () => Promise<void>;
  fetchPreviousPage: () => Promise<void>;
  goToPage: (page: number) => Promise<void>;
  refetch: () => Promise<void>;
}

export function usePaginatedFetch<T>({
  fetchFn,
  limit = 20,
  initialPage = 1,
  enabled = true,
}: UsePaginatedFetchOptions<T>): UsePaginatedFetchReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { t } = useTranslation(['common']);

  const fetchPage = useCallback(
    async (page: number) => {
      if (!enabled) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchFn(page, limit);

        setData(response.data);
        setCurrentPage(response.currentPage);
        setTotalPages(response.totalPages);
        setTotalItems(response.totalItems);
        setHasNextPage(response.hasNextPage);
        setHasPreviousPage(response.hasPreviousPage);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(t('common:errors.failedToFetchData'));
        setError(error);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchFn, limit, enabled, t]
  );

  const fetchNextPage = useCallback(async () => {
    if (hasNextPage && !isLoading) {
      await fetchPage(currentPage + 1);
    }
  }, [hasNextPage, isLoading, currentPage, fetchPage]);

  const fetchPreviousPage = useCallback(async () => {
    if (hasPreviousPage && !isLoading) {
      await fetchPage(currentPage - 1);
    }
  }, [hasPreviousPage, isLoading, currentPage, fetchPage]);

  const goToPage = useCallback(
    async (page: number) => {
      if (page >= 1 && page <= totalPages && !isLoading) {
        await fetchPage(page);
      }
    },
    [totalPages, isLoading, fetchPage]
  );

  const refetch = useCallback(async () => {
    await fetchPage(currentPage);
  }, [currentPage, fetchPage]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchPage(initialPage);
    }
  }, [enabled, initialPage, fetchPage]);

  return {
    data,
    currentPage,
    totalPages,
    totalItems,
    hasNextPage,
    hasPreviousPage,
    isLoading,
    error,
    fetchNextPage,
    fetchPreviousPage,
    goToPage,
    refetch,
  };
}
