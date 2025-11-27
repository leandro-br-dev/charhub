import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePageHeader } from '../../hooks/usePageHeader';
import { ConversationCard, DiscoverFilters, type DiscoverFiltersState } from './components';
import { useDiscoverConversations } from './hooks/useDiscoverConversations';

export default function DiscoverPage(): JSX.Element {
  const { t } = useTranslation(['discover', 'common']);
  const { setTitle } = usePageHeader();

  // Set page title
  useEffect(() => {
    setTitle(t('discover:title'));
  }, [setTitle, t]);

  // Filters state
  const [filters, setFilters] = useState<DiscoverFiltersState>({
    search: '',
    gender: '',
    tags: [],
    sortBy: 'popular',
  });

  // Build query params for API
  const queryParams = {
    search: filters.search || undefined,
    gender: filters.gender || undefined,
    tags: filters.tags.length > 0 ? filters.tags.join(',') : undefined,
    sortBy: filters.sortBy,
    skip: 0,
    limit: 20,
  };

  // Fetch conversations
  const { data, isLoading, isError, error } = useDiscoverConversations(queryParams);

  const conversations = data?.data || [];
  const count = data?.count || 0;

  return (
    <div className="w-full min-h-screen bg-normal">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-title">
            {t('discover:heading')}
          </h1>
          <p className="text-muted">
            {t('discover:description')}
          </p>
        </div>

        {/* Filters */}
        <DiscoverFilters filters={filters} onFiltersChange={setFilters} />

        {/* Results Count */}
        {!isLoading && (
          <div className="text-sm text-muted">
            {t('discover:resultsCount', { count })}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-96 bg-light animate-pulse rounded-lg" />
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="p-6 bg-danger/10 border border-danger rounded-lg text-center">
            <p className="text-danger font-medium mb-2">
              {t('discover:errorLoading')}
            </p>
            <p className="text-sm text-content">
              {error instanceof Error ? error.message : t('common:unknownError')}
            </p>
          </div>
        )}

        {/* Conversations Grid */}
        {!isLoading && !isError && conversations.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {conversations.map((conversation) => (
              <ConversationCard key={conversation.id} conversation={conversation} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && conversations.length === 0 && (
          <div className="p-12 bg-light border border-border rounded-lg text-center">
            <p className="text-muted text-lg mb-2">
              {t('discover:noConversations')}
            </p>
            <p className="text-sm text-content">
              {t('discover:tryDifferentFilters')}
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="p-4 bg-light border border-border rounded-lg">
          <h3 className="text-sm font-semibold text-title mb-2">
            {t('discover:infoTitle')}
          </h3>
          <ul className="space-y-1 text-sm text-content">
            <li>• {t('discover:infoWatch')}</li>
            <li>• {t('discover:infoJoin')}</li>
            <li>• {t('discover:infoMultiUser')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
