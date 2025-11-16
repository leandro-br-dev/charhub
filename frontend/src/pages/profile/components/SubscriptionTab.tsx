import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { subscriptionService, creditService } from '../../../services';
import type { CurrentSubscription } from '../../../services/subscriptionService';

export function SubscriptionTab() {
  const { t } = useTranslation(['profile', 'common']);
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [subscriptionData, creditsData] = await Promise.all([
          subscriptionService.getStatus(),
          creditService.getBalance(),
        ]);
        setSubscription(subscriptionData);
        setCredits(creditsData);
      } catch (error) {
        console.error('[SubscriptionTab] Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-title">{t('profile:subscription.header')}</h2>
        <p className="mt-2 text-sm text-description">{t('profile:subscription.description')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Current Plan */}
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="text-sm font-medium text-content mb-2">
            {t('profile:subscription.currentPlan')}
          </div>
          {loading ? (
            <div className="text-muted text-sm">{t('profile:subscription.loadingPlan')}</div>
          ) : (
            <div className="space-y-1">
              <div className="text-2xl font-bold text-title">{subscription?.plan.name}</div>
              {subscription && !subscription.isFree && (
                <div className="text-sm text-muted">
                  ${subscription.plan.priceMonthly.toFixed(2)}/month
                </div>
              )}
            </div>
          )}
        </div>

        {/* Credits */}
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="text-sm font-medium text-content mb-2">
            {t('profile:subscription.credits')}
          </div>
          {loading ? (
            <div className="text-muted text-sm">{t('profile:subscription.loadingCredits')}</div>
          ) : (
            <div className="text-2xl font-bold text-title">
              {credits?.toLocaleString() ?? 0}
            </div>
          )}
        </div>
      </div>

      {/* View Plans Button */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={() => navigate('/plans')}
        >
          {t('profile:subscription.viewPlans')}
        </Button>
      </div>
    </div>
  );
}
