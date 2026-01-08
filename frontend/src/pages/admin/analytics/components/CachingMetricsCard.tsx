import { useTranslation } from 'react-i18next';

interface CachingMetricsCardProps {
  cachingMetrics: {
    totalRequests: number;
    cachedRequests: number;
    cacheHitRate: string;
    costSavings: string;
  };
}

export function CachingMetricsCard({ cachingMetrics }: CachingMetricsCardProps): JSX.Element {
  const { t } = useTranslation(['analytics']);

  const hitRatePercent = parseFloat(cachingMetrics.cacheHitRate);
  const costSavingsAmount = parseFloat(cachingMetrics.costSavings.replace('$', ''));

  // Determine color based on hit rate
  const getHitRateColor = () => {
    if (hitRatePercent >= 50) return 'text-green-500';
    if (hitRatePercent >= 20) return 'text-yellow-500';
    return 'text-muted';
  };

  return (
    <div className="bg-light rounded-xl p-6 border border-border">
      <h3 className="text-lg font-semibold text-title mb-4">
        {t('analytics:sections.cachingMetrics')}
      </h3>

      <div className="space-y-4">
        {/* Cache Hit Rate */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-content">{t('analytics:caching.hitRate')}</span>
            <span className={`text-lg font-bold ${getHitRateColor()}`}>
              {cachingMetrics.cacheHitRate}
            </span>
          </div>
          <div className="w-full bg-border rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                hitRatePercent >= 50 ? 'bg-green-500' : hitRatePercent >= 20 ? 'bg-yellow-500' : 'bg-muted'
              }`}
              style={{ width: `${hitRatePercent}%` }}
            />
          </div>
        </div>

        {/* Total Requests */}
        <div className="flex items-center justify-between py-2 border-b border-border">
          <span className="text-sm text-content">{t('analytics:caching.totalRequests')}</span>
          <span className="text-sm font-medium text-title">{cachingMetrics.totalRequests.toLocaleString()}</span>
        </div>

        {/* Cached Requests */}
        <div className="flex items-center justify-between py-2 border-b border-border">
          <span className="text-sm text-content">{t('analytics:caching.cachedRequests')}</span>
          <span className="text-sm font-medium text-title">{cachingMetrics.cachedRequests.toLocaleString()}</span>
        </div>

        {/* Cost Savings */}
        <div className="flex items-center justify-between py-2 bg-green-500/10 rounded-lg px-3">
          <span className="text-sm text-content">{t('analytics:caching.costSavings')}</span>
          <span className="text-sm font-bold text-green-500">{cachingMetrics.costSavings}</span>
        </div>
      </div>
    </div>
  );
}
