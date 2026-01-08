import { useTranslation } from 'react-i18next';

interface CostByPlanChartProps {
  costsByPlan: Array<{
    subscriptionPlan: string;
    avgCost: number;
    userCount: number;
    totalCost: number;
  }>;
}

export function CostByPlanChart({ costsByPlan }: CostByPlanChartProps): JSX.Element {
  const { t } = useTranslation(['analytics']);

  const maxCost = Math.max(...costsByPlan.map((c) => c.totalCost), 0.0001);

  return (
    <div className="bg-light rounded-xl p-6 border border-border">
      <h3 className="text-lg font-semibold text-title mb-4">
        {t('analytics:sections.costsByPlan')}
      </h3>
      <div className="space-y-4">
        {costsByPlan.map((plan) => (
          <div key={plan.subscriptionPlan} className="bg-normal rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-title">
                {t(`analytics:planNames.${plan.subscriptionPlan}`, plan.subscriptionPlan)}
              </span>
              <span className="text-sm text-content">${plan.totalCost.toFixed(2)}</span>
            </div>

            {/* Total cost bar */}
            <div className="w-full bg-border rounded-full h-2 mb-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: `${(plan.totalCost / maxCost) * 100}%` }}
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted">{t('analytics:planStats.users')}: </span>
                <span className="text-content font-medium">{plan.userCount}</span>
              </div>
              <div>
                <span className="text-muted">{t('analytics:planStats.avgCost')}: </span>
                <span className="text-content font-medium">${plan.avgCost.toFixed(4)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {costsByPlan.length === 0 && (
        <div className="text-center py-8 text-muted">
          {t('analytics:messages.noData')}
        </div>
      )}
    </div>
  );
}
