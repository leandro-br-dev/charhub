import { useTranslation } from 'react-i18next';

interface CostByFeatureCardProps {
  costsByFeature: Array<{
    feature: string;
    totalCost: number;
    totalTokens: number;
    requestCount: number;
    avgCostPerRequest: number;
    avgTokensPerRequest: number;
  }>;
}

export function CostByFeatureCard({ costsByFeature }: CostByFeatureCardProps): JSX.Element {
  const { t } = useTranslation(['analytics']);

  const maxCost = Math.max(...costsByFeature.map((c) => c.totalCost));

  return (
    <div className="bg-light rounded-xl p-6 border border-border">
      <h3 className="text-lg font-semibold text-title mb-4">
        {t('analytics:sections.costsByFeature')}
      </h3>
      <div className="space-y-4">
        {costsByFeature.map((item) => (
          <div key={item.feature}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-content">
                {t(`analytics:featureNames.${item.feature}`, item.feature)}
              </span>
              <span className="text-sm text-content">${item.totalCost.toFixed(4)}</span>
            </div>
            <div className="w-full bg-border rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: `${(item.totalCost / maxCost) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-muted">
              <span>{item.requestCount} {t('analytics:metrics.requests')}</span>
              <span>${item.avgCostPerRequest.toFixed(6)} {t('analytics:metrics.avgReq')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
