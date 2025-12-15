/**
 * Payment Provider Factory
 *
 * Factory pattern for creating payment provider instances
 * based on the PaymentProvider enum value
 */

import { PaymentProvider } from '../../generated/prisma';
import { IPaymentProvider } from './IPaymentProvider';
import { StripeProvider } from './StripeProvider';
import { PayPalProvider } from './PayPalProvider';

export class PaymentProviderFactory {
  /**
   * Get a payment provider instance based on the enum value
   *
   * @param provider - PaymentProvider enum value
   * @returns Payment provider instance
   */
  static getProvider(provider: PaymentProvider): IPaymentProvider {
    switch (provider) {
      case 'STRIPE':
        return new StripeProvider();

      case 'PAYPAL':
        return new PayPalProvider();

      default:
        // Default to Stripe
        return new StripeProvider();
    }
  }

  /**
   * Get the default payment provider
   *
   * @returns Default payment provider instance (Stripe)
   */
  static getDefaultProvider(): IPaymentProvider {
    return new StripeProvider();
  }
}
