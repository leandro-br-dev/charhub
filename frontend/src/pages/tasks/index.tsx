import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePageHeader } from '../../hooks/usePageHeader';
import { Button } from '../../components/ui/Button';
import { creditService } from '../../services';
import { useToast } from '../../contexts/ToastContext';
import { Gift, Sparkles, Clock, MessageSquarePlus } from 'lucide-react';
import { extractErrorMessage } from '../../utils/apiErrorHandler';

export default function TasksPage(): JSX.Element {
  const { t } = useTranslation(['tasks', 'common']);
  const { setTitle } = usePageHeader();
  const { addToast } = useToast();

  const [credits, setCredits] = useState<number | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [firstChatRewardClaimed, setFirstChatRewardClaimed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTitle(t('tasks:title'));

    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [balance, rewardStatus, firstChatStatus] = await Promise.all([
          creditService.getBalance(),
          creditService.getDailyRewardStatus(),
          creditService.getFirstChatRewardStatus(),
        ]);
        setCredits(balance);
        setClaimed(rewardStatus.claimed);
        setFirstChatRewardClaimed(firstChatStatus.claimed);
      } catch (error) {
        console.error('[Tasks] Failed to load initial data:', error);
        addToast(t('common:errors.unexpected'), 'error');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [setTitle, t, addToast]);

  const handleClaimReward = async () => {
    setClaiming(true);
    try {
      const result = await creditService.claimDailyReward();
      setCredits(result.newBalance);
      setClaimed(true);
      addToast(t('tasks:messages.rewardClaimed'), 'success');
    } catch (error: unknown) {
      console.error('[Tasks] Failed to claim reward:', error);
      const errorMsg = extractErrorMessage(error);

      if (errorMsg?.includes('already claimed')) {
        setClaimed(true);
        addToast(t('tasks:messages.alreadyClaimed'), 'info');
      } else {
        addToast(errorMsg || t('tasks:messages.error'), 'error');
      }
    } finally {
      setClaiming(false);
    }
  };

  return (
    <section className="flex flex-col gap-8">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-title">{t('tasks:title')}</h1>
        <p className="max-w-2xl text-sm text-description">
          {t('tasks:subtitle')}
        </p>
      </header>

      {/* Credits Display */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-primary/10 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('tasks:yourCredits')}</p>
              <p className="text-3xl font-bold text-title">
                {loading ? '...' : credits?.toLocaleString() ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Reward Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-green-500/10 p-3">
            <Gift className="h-6 w-6 text-green-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-title mb-2">
              {t('tasks:dailyReward.title')}
            </h2>
            <p className="text-sm text-description mb-4">
              {t('tasks:dailyReward.description')}
            </p>

            <div className="flex items-center gap-4 mb-4">
              <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-semibold text-primary">
                  50 {t('tasks:dailyReward.credits')}
                </span>
              </div>
            </div>

            <Button
              variant={claimed ? 'secondary' : 'primary'}
              onClick={handleClaimReward}
              disabled={claiming || claimed || loading}
            >
              {claiming ? (
                t('tasks:dailyReward.claiming')
              ) : claimed ? (
                t('tasks:dailyReward.claimed')
              ) : (
                t('tasks:dailyReward.claimButton')
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* First Chat Reward Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-blue-500/10 p-3">
            <MessageSquarePlus className="h-6 w-6 text-blue-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-title mb-2">
              {t('tasks:firstChatReward.title')}
            </h2>
            <p className="text-sm text-description mb-4">
              {t('tasks:firstChatReward.description')}
            </p>

            <div className="flex items-center gap-4 mb-4">
              <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-semibold text-primary">
                  25 {t('tasks:dailyReward.credits')}
                </span>
              </div>
            </div>
            <div
              className={`inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 ${
                firstChatRewardClaimed
                  ? 'bg-secondary text-secondary-foreground'
                  : 'bg-green-500 text-white'
              }`}
            >
              {firstChatRewardClaimed
                ? t('tasks:firstChatReward.claimed')
                : t('tasks:firstChatReward.available')}
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Section */}
      <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-muted p-4">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-title">
            {t('tasks:comingSoon')}
          </h3>
          <p className="text-sm text-description max-w-md mx-auto">
            {t('tasks:comingSoonDescription')}
          </p>
        </div>
      </div>
    </section>
  );
}
