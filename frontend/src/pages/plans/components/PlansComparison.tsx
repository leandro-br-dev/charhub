import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  tier: string;
  name: string;
  description: string;
  priceMonthly: number;
  creditsPerMonth: number;
  features: string[];
  isActive: boolean;
  stripePriceId?: string;
  popular?: boolean;
}

interface PlansComparisonProps {
  plans: Plan[];
  currentPlanId?: string;
  onSelectPlan: (planId: string) => void;
  loading?: boolean;
}

export function PlansComparison({ plans, currentPlanId, onSelectPlan, loading }: PlansComparisonProps) {
  const { t } = useTranslation('plans');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const formatPrice = (price: number) => {
    return price === 0 ? t('free') : `$${price.toFixed(2)}`;
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    onSelectPlan(planId);
  };

  const isCurrentPlan = (planId: string) => planId === currentPlanId;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-8">
      {plans.map((plan) => (
        <Card
          key={plan.id}
          className={`relative flex flex-col ${
            plan.popular ? 'border-primary shadow-lg' : ''
          } ${isCurrentPlan(plan.id) ? 'border-blue-500' : ''}`}
        >
          {plan.popular && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground px-3 py-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {t('most_popular')}
              </Badge>
            </div>
          )}

          {isCurrentPlan(plan.id) && (
            <div className="absolute -top-3 right-4">
              <Badge className="bg-blue-500 text-white px-3 py-1">
                {t('current_plan')}
              </Badge>
            </div>
          )}

          <CardHeader className="pb-4">
            <CardTitle className="text-2xl">{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
          </CardHeader>

          <CardContent className="flex-1 space-y-6">
            {/* Price */}
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">
                {plan.priceMonthly === 0 ? t('free') : `$${plan.priceMonthly}`}
              </span>
              {plan.priceMonthly > 0 && (
                <span className="text-muted-foreground">/{t('month')}</span>
              )}
            </div>

            {/* Credits */}
            <div className="flex items-center gap-2 text-sm bg-secondary/50 rounded-lg p-3">
              <Sparkles className="w-4 h-4 text-primary/70" />
              <span className="font-medium">{plan.creditsPerMonth.toLocaleString()} {t('credits_per_month')}</span>
            </div>

            {/* Features */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-muted-foreground">{t('included_features')}:</p>
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              className="w-full"
              variant={isCurrentPlan(plan.id) ? 'secondary' : plan.popular ? 'primary' : 'secondary'}
              disabled={loading || isCurrentPlan(plan.id) || !plan.isActive}
              onClick={() => handleSelectPlan(plan.id)}
            >
              {isCurrentPlan(plan.id)
                ? t('current_plan')
                : plan.priceMonthly === 0
                ? t('select_free')
                : t('subscribe_to', { plan: plan.name })}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
