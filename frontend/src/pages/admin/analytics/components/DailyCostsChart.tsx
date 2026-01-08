import { useTranslation } from 'react-i18next';

interface DailyCostsChartProps {
  dailyCosts: Array<{
    date: string;
    totalCost: number;
    totalTokens: number;
    requestCount: number;
  }>;
}

export function DailyCostsChart({ dailyCosts }: DailyCostsChartProps): JSX.Element {
  const { t } = useTranslation(['analytics']);

  const maxCost = Math.max(...dailyCosts.map((d) => d.totalCost), 0.0001); // Avoid division by zero

  return (
    <div className="bg-light rounded-xl p-6 border border-border">
      <h3 className="text-lg font-semibold text-title mb-4">
        {t('analytics:sections.dailyCosts')}
      </h3>
      <div className="space-y-2">
        {dailyCosts.map((day) => {
          const date = new Date(day.date);
          const barWidth = (day.totalCost / maxCost) * 100;

          return (
            <div key={day.date} className="flex items-center gap-3">
              {/* Date label */}
              <div className="w-24 text-xs text-content shrink-0">
                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>

              {/* Bar */}
              <div className="flex-1 bg-border rounded-full h-6 relative">
                <div
                  className="bg-primary h-6 rounded-full flex items-center justify-end pr-2"
                  style={{ width: `${barWidth}%`, minWidth: barWidth > 0 ? '2rem' : 0 }}
                >
                  {barWidth > 15 && (
                    <span className="text-xs font-medium text-black">${day.totalCost.toFixed(4)}</span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="w-20 text-xs text-muted text-right shrink-0">
                {day.requestCount} {t('analytics:metrics.req')}
              </div>
            </div>
          );
        })}
      </div>

      {dailyCosts.length === 0 && (
        <div className="text-center py-8 text-muted">
          {t('analytics:messages.noData')}
        </div>
      )}
    </div>
  );
}
