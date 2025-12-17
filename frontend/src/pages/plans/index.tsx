import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PlansComparison } from './components/PlansComparison';
import { StripeCheckout } from '../../components/payments/StripeCheckout';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { subscriptionService, planService } from '../../services';
import type { Plan, CurrentSubscription } from '../../services/subscriptionService';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';

export default function PlansPage() {
  const { t } = useTranslation('plans');
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stripe checkout state
  const [checkoutData, setCheckoutData] = useState<{
    clientSecret: string;
    provider: string;
    planName: string;
    subscriptionId: string;
  } | null>(null);

  useEffect(() => {
    loadData();

    // Check for success parameter from PayPal redirect
    if (searchParams.get('success') === 'true') {
      addToast(t('subscription_activated'), 'success');
      window.history.replaceState({}, '', '/plans');
    }

    if (searchParams.get('cancelled') === 'true') {
      addToast(t('subscription_cancelled'), 'info');
      window.history.replaceState({}, '', '/plans');
    }
  }, [searchParams, t, addToast]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [plansData, subscriptionData] = await Promise.all([
        planService.list(),
        subscriptionService.getStatus(),
      ]);

      setPlans(plansData);
      setCurrentSubscription(subscriptionData);
    } catch (err: any) {
      console.error('[Plans] Failed to load data:', err);
      setError(err.response?.data?.message || t('error_loading_plans'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;

    // If it's the free plan, just switch directly
    if (plan.priceMonthly === 0) {
      await switchToFreePlan(planId);
      return;
    }

    // For paid plans, subscribe via appropriate provider
    try {
      const response = await subscriptionService.subscribe(planId);

      // Check which provider was used
      if (response.provider === 'STRIPE' && response.clientSecret) {
        // Show Stripe checkout inline
        setCheckoutData({
          clientSecret: response.clientSecret,
          provider: response.provider,
          planName: plan.name,
          subscriptionId: response.subscriptionId,
        });
      } else if (response.provider === 'PAYPAL' && response.approvalUrl) {
        // Redirect to PayPal
        window.location.href = response.approvalUrl;
      } else {
        throw new Error('Invalid subscription response');
      }
    } catch (err: any) {
      console.error('[Plans] Failed to subscribe:', err);
      addToast(err.response?.data?.message || t('error_starting_subscription'), 'error');
    }
  };

  const handleStripeSuccess = async () => {
    if (!checkoutData) return;

    try {
      // Call backend to activate the subscription
      await subscriptionService.activateStripeSubscription(checkoutData.subscriptionId);

      setCheckoutData(null);
      addToast(t('subscription_activated'), 'success');
      await loadData();
    } catch (err: any) {
      console.error('[Plans] Failed to activate subscription:', err);
      addToast(err.response?.data?.message || 'Erro ao ativar assinatura', 'error');
    }
  };

  const handleStripeError = (error: string) => {
    console.error('[Plans] Stripe payment failed:', error);
    addToast(error || t('payment_failed'), 'error');
  };

  const handleBackToPlans = () => {
    setCheckoutData(null);
  };

  const switchToFreePlan = async (planId: string) => {
    try {
      if (currentSubscription && !currentSubscription.isFree) {
        await subscriptionService.cancel('Switching to free plan');
      }

      addToast(t('plan_changed_to_free'), 'success');
      await loadData();
    } catch (err: any) {
      console.error('[Plans] Failed to switch to free plan:', err);
      addToast(err.response?.data?.message || t('error_changing_plan'), 'error');
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm(t('confirm_cancel_subscription'))) {
      return;
    }

    try {
      await subscriptionService.cancel('User requested cancellation');
      addToast(t('subscription_will_cancel'), 'success');
      await loadData();
    } catch (err: any) {
      console.error('[Plans] Failed to cancel subscription:', err);
      addToast(err.response?.data?.message || t('error_cancelling_subscription'), 'error');
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      await subscriptionService.reactivate();
      addToast(t('subscription_reactivated'), 'success');
      await loadData();
    } catch (err: any) {
      console.error('[Plans] Failed to reactivate subscription:', err);
      addToast(err.response?.data?.message || t('error_reactivating_subscription'), 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If showing Stripe checkout, render that instead
  if (checkoutData) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="secondary"
            onClick={handleBackToPlans}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back_to_plans') || 'Voltar aos planos'}
          </Button>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">
              {t('complete_subscription') || 'Complete sua assinatura'}
            </h1>
            <p className="text-muted-foreground">
              {t('subscribing_to') || 'Assinando'}: <strong>{checkoutData.planName}</strong>
            </p>
          </div>

          <StripeCheckout
            clientSecret={checkoutData.clientSecret}
            onSuccess={handleStripeSuccess}
            onError={handleStripeError}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">{t('title')}</h1>
            <p className="text-xl text-muted-foreground">
              {t('subtitle')}
            </p>
          </div>
        </div>

        {/* Current Subscription Status - Only show for paid plans */}
        {currentSubscription && !currentSubscription.isFree && (
          <div className="mb-8">
            <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
              <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-900 dark:text-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <strong>{t('active_plan')}:</strong> {currentSubscription.plan.name}
                    {currentSubscription.cancelAtPeriodEnd && (
                      <span className="ml-2 text-muted-foreground">
                        ({t('will_cancel_on')}{' '}
                        {currentSubscription.currentPeriodEnd
                          ? new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()
                          : t('soon')}
                        )
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {currentSubscription.cancelAtPeriodEnd ? (
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={handleReactivateSubscription}
                      >
                        {t('reactivate')}
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={handleCancelSubscription}
                      >
                        {t('cancel_subscription')}
                      </Button>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert className="mb-8 border-red-500 bg-red-50 dark:bg-red-950">
            <AlertDescription className="text-red-900 dark:text-red-100">{error}</AlertDescription>
          </Alert>
        )}

        {/* Plans Comparison */}
        <PlansComparison
          plans={plans.map((plan) => ({
            ...plan,
            popular: plan.tier === 'PLUS',
          }))}
          currentPlanId={currentSubscription?.plan.id}
          onSelectPlan={handleSelectPlan}
          loading={loading}
        />

      </div>
  );
}
