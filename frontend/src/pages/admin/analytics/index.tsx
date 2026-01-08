import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePageHeader } from '../../../hooks/usePageHeader';
import { analyticsService, type DateRange } from '../../../services/analyticsService';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { TotalCostCard, CostByFeatureCard, DailyCostsChart, CostByPlanChart, CachingMetricsCard } from './components';

export default function AnalyticsPage(): JSX.Element {
  const { t } = useTranslation(['analytics', 'common']);
  const { setTitle } = usePageHeader();

  useEffect(() => {
    setTitle(t('analytics:title'));
  }, [setTitle, t]);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(),
  });

  const [data, setData] = useState<{
    totalCost: number;
    costsByFeature: any[];
    costsByModel: any[];
    costsByPlan: any[];
    dailyCosts: any[];
    topUsers: any[];
    cachingMetrics: any;
  } | null>(null);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await analyticsService.getOverview(dateRange);
      setData(response.data);
    } catch (err) {
      console.error('[Analytics] Failed to fetch data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Date range handlers
  const setLast7Days = () => {
    setDateRange({
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      to: new Date(),
    });
  };

  const setLast30Days = () => {
    setDateRange({
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date(),
    });
  };

  const setLast90Days = () => {
    setDateRange({
      from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      to: new Date(),
    });
  };

  return (
    <div className="w-full bg-normal px-4 md:px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-title mb-2">
          {t('analytics:header.title')}
        </h1>
        <p className="text-muted">
          {t('analytics:header.description')}
        </p>
      </div>

        {/* Date Range Selector */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-content">{t('analytics:dateRange.label')}:</span>
          <button
            onClick={setLast7Days}
            className={`px-3 py-1 text-sm rounded-lg border ${
              dateRange.from.getTime() === new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime()
                ? 'bg-primary text-black border-primary'
                : 'bg-light text-content border-border hover:border-primary'
            }`}
          >
            {t('analytics:dateRange.last7Days')}
          </button>
          <button
            onClick={setLast30Days}
            className={`px-3 py-1 text-sm rounded-lg border ${
              dateRange.from.getTime() === new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).getTime()
                ? 'bg-primary text-black border-primary'
                : 'bg-light text-content border-border hover:border-primary'
            }`}
          >
            {t('analytics:dateRange.last30Days')}
          </button>
          <button
            onClick={setLast90Days}
            className={`px-3 py-1 text-sm rounded-lg border ${
              dateRange.from.getTime() === new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).getTime()
                ? 'bg-primary text-black border-primary'
                : 'bg-light text-content border-border hover:border-primary'
            }`}
          >
            {t('analytics:dateRange.last90Days')}
          </button>
          <span className="ml-auto text-sm text-muted">
            {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
          </span>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg">
            <p className="text-error">{error}</p>
            <button
              onClick={fetchAnalytics}
              className="mt-2 px-4 py-2 bg-primary text-black rounded-lg hover:bg-primary/80"
            >
              {t('common:retry')}
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !data && (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        )}

        {/* Analytics Content */}
        {data && !isLoading && (
          <div className="space-y-6">
            {/* Total Cost Card */}
            <TotalCostCard totalCost={data.totalCost} currency={t('analytics:cards.totalCost.currency')} />

            {/* Cost by Feature and Caching Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CostByFeatureCard costsByFeature={data.costsByFeature} />
              <CachingMetricsCard cachingMetrics={data.cachingMetrics} />
            </div>

            {/* Daily Costs Trend */}
            <DailyCostsChart dailyCosts={data.dailyCosts} />

            {/* Cost by Plan */}
            <CostByPlanChart costsByPlan={data.costsByPlan} />

            {/* Cost by Model */}
            <div className="bg-light rounded-xl p-6 border border-border">
              <h3 className="text-lg font-semibold text-title mb-4">
                {t('analytics:sections.costsByModel')}
              </h3>
              <div className="space-y-3">
                {data.costsByModel.map((item) => (
                  <div key={`${item.provider}-${item.model}`} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-content">
                          {item.provider} - {item.model}
                        </span>
                        <span className="text-sm text-content">
                          ${item.totalCost.toFixed(4)}
                        </span>
                      </div>
                      <div className="w-full bg-border rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${(item.totalCost / Math.max(...data.costsByModel.map((c) => c.totalCost))) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-muted">
                        <span>{item.requestCount} {t('analytics:metrics.requests')}</span>
                        <span>{item.avgCostPerRequest.toFixed(6)} {t('analytics:metrics.avgReq')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Users */}
            <div className="bg-light rounded-xl p-6 border border-border">
              <h3 className="text-lg font-semibold text-title mb-4">
                {t('analytics:sections.topUsers')}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-4 text-sm font-medium text-muted">{t('analytics:table.userId')}</th>
                      <th className="text-right py-2 px-4 text-sm font-medium text-muted">{t('analytics:table.totalCost')}</th>
                      <th className="text-right py-2 px-4 text-sm font-medium text-muted">{t('analytics:table.requests')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topUsers.map((user, index) => (
                      <tr key={user.userId} className={index < data.topUsers.length - 1 ? 'border-b border-border' : ''}>
                        <td className="py-2 px-4 text-sm text-content">{user.userId.slice(0, 8)}...</td>
                        <td className="py-2 px-4 text-sm text-content text-right">${user.totalCost.toFixed(4)}</td>
                        <td className="py-2 px-4 text-sm text-content text-right">{user.requestCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
}
