/**
 * Payment Provider Interface
 *
 * This interface defines the contract for all payment providers (Stripe, PayPal, etc.)
 * Implementing this interface ensures consistency across different payment platforms.
 */

export interface SubscriptionResult {
  subscriptionId: string;
  clientSecret?: string;      // For Stripe Elements (inline checkout)
  approvalUrl?: string;        // For PayPal redirect
  customerId?: string;         // Stripe Customer ID
}

export interface WebhookResult {
  eventType: string;
  subscriptionId?: string;
  userId?: string;
  planId?: string;
  action: 'ACTIVATED' | 'CANCELLED' | 'UPDATED' | 'PAYMENT_FAILED' | 'PAYMENT_SUCCEEDED' | 'NONE';
  metadata?: Record<string, any>;
}

export interface SubscriptionStatus {
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

/**
 * Payment Provider Interface
 *
 * All payment providers must implement this interface
 */
export interface IPaymentProvider {
  /**
   * Create a new subscription for a user
   *
   * @param userId - User ID from database
   * @param planId - Plan ID from database
   * @param userEmail - User's email address
   * @returns Subscription details (ID, client secret or approval URL)
   */
  createSubscription(
    userId: string,
    planId: string,
    userEmail: string
  ): Promise<SubscriptionResult>;

  /**
   * Cancel a subscription (at the end of the current period)
   *
   * @param subscriptionId - Provider's subscription ID
   * @param reason - Optional cancellation reason
   */
  cancelSubscription(
    subscriptionId: string,
    reason?: string
  ): Promise<void>;

  /**
   * Reactivate a previously canceled subscription
   *
   * @param subscriptionId - Provider's subscription ID
   */
  reactivateSubscription(subscriptionId: string): Promise<void>;

  /**
   * Change the plan of an existing subscription
   *
   * @param subscriptionId - Provider's subscription ID
   * @param newPlanId - New plan ID from database
   */
  changePlan(
    subscriptionId: string,
    newPlanId: string
  ): Promise<void>;

  /**
   * Get the current status of a subscription
   *
   * @param subscriptionId - Provider's subscription ID
   * @returns Current subscription status
   */
  getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionStatus>;

  /**
   * Process a webhook event from the payment provider
   *
   * @param event - Raw event data from provider
   * @param signature - Webhook signature for verification (optional)
   * @returns Parsed webhook result with action to take
   */
  processWebhook(
    event: any,
    signature?: string
  ): Promise<WebhookResult>;
}
