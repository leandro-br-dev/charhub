/**
 * Payment Provider Factory
 *
 * Factory pattern for creating payment provider instances
 * based on the PaymentProvider enum value
 */

import { PaymentProvider } from '../../generated/prisma';
import { IPaymentProvider } from './IPaymentProvider';
import { PayPalProvider } from './PayPalProvider';
// import { StripeProvider } from './StripeProvider'; // Will be implemented in Phase 2

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
        // Temporary: Return PayPal until Stripe is implemented
        // return new StripeProvider();
        throw new Error('Stripe provider not yet implemented. Use PAYPAL for now.');

      case 'PAYPAL':
        return new PayPalProvider();

      default:
        // Default to PayPal for now (will be Stripe in Phase 2)
        return new PayPalProvider();
    }
  }

  /**
   * Get the default payment provider
   *
   * @returns Default payment provider instance
   */
  static getDefaultProvider(): IPaymentProvider {
    // Default to PayPal for now (will be Stripe in Phase 2)
    return new PayPalProvider();
  }
}
