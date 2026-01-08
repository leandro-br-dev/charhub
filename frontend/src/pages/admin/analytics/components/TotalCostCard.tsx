import { useTranslation } from 'react-i18next';

interface TotalCostCardProps {
  totalCost: number;
  currency: string;
}

export function TotalCostCard({ totalCost, currency }: TotalCostCardProps): JSX.Element {
  const { t } = useTranslation(['analytics']);

  return (
    <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl p-6 border border-primary/30">
      <h3 className="text-lg font-semibold text-title mb-2">
        {t('analytics:cards.totalCost.title')}
      </h3>
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold text-title">${totalCost.toFixed(2)}</span>
        <span className="text-lg text-muted">{currency}</span>
      </div>
      <p className="text-sm text-muted mt-2">
        {t('analytics:cards.totalCost.description')}
      </p>
    </div>
  );
}
