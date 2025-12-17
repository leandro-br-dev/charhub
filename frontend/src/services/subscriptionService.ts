import api from '../lib/api';

const API_PREFIX = import.meta.env.VITE_API_VERSION || '/api/v1';
const BASE_PATH = `${API_PREFIX}/subscriptions`;

export interface Plan {
  id: string;
  tier: string;
  name: string;
  description: string;
  priceMonthly: number;
  creditsPerMonth: number;
  features: string[];
  isActive: boolean;
  paypalPlanId?: string;
}

export interface CurrentSubscription {
  plan: Plan;
  status: string;
  isFree: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface SubscribeResponse {
  subscriptionId: string;
  approvalUrl?: string; // PayPal only
  clientSecret?: string; // Stripe only
  provider: 'STRIPE' | 'PAYPAL';
}

export const subscriptionService = {
  /**
   * Get current user subscription status
   */
  async getStatus(): Promise<CurrentSubscription> {
    const response = await api.get<{ success: boolean; data: CurrentSubscription }>(`${BASE_PATH}/status`);
    return response.data.data;
  },

  /**
   * Subscribe to a plan (returns PayPal approval URL)
   */
  async subscribe(planId: string): Promise<SubscribeResponse> {
    const response = await api.post<{ success: boolean; data: SubscribeResponse }>(`${BASE_PATH}/subscribe`, {
      planId
    });
    return response.data.data;
  },

  /**
   * Cancel current subscription
   */
  async cancel(reason?: string): Promise<void> {
    await api.post<{ success: boolean }>(`${BASE_PATH}/cancel`, {
      reason: reason || 'User requested cancellation'
    });
  },

  /**
   * Reactivate a canceled subscription
   */
  async reactivate(): Promise<void> {
    await api.post<{ success: boolean }>(`${BASE_PATH}/reactivate`);
  },

  /**
   * Change to a different plan
   */
  async changePlan(newPlanId: string): Promise<void> {
    await api.post<{ success: boolean }>(`${BASE_PATH}/change-plan`, {
      newPlanId
    });
  },

  /**
   * Activate Stripe subscription after successful payment
   */
  async activateStripeSubscription(subscriptionId: string): Promise<void> {
    await api.post<{ success: boolean }>(`${BASE_PATH}/activate-stripe`, {
      subscriptionId
    });
  }
};
