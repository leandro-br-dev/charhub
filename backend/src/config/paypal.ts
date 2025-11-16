import { Client, Environment } from '@paypal/paypal-server-sdk';
import { logger } from './logger';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_BASE_URL = process.env.PAYPAL_API_BASE_URL || 'https://api-m.sandbox.paypal.com';

if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
  logger.warn('PayPal credentials not configured - Payment features will be disabled');
}

/**
 * PayPal client instance
 * Initialized only if credentials are present
 */
export const paypalClient = (PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET)
  ? new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: PAYPAL_CLIENT_ID,
        oAuthClientSecret: PAYPAL_CLIENT_SECRET,
      },
      environment: PAYPAL_API_BASE_URL.includes('sandbox') ? Environment.Sandbox : Environment.Production,
    })
  : null;

/**
 * Check if PayPal is configured and enabled
 */
export function isPayPalEnabled(): boolean {
  return paypalClient !== null;
}

/**
 * Verify that PayPal is properly configured
 * Throws error if not configured when required
 */
export function requirePayPal() {
  if (!paypalClient) {
    throw new Error('PayPal is not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET environment variables.');
  }
  return paypalClient;
}

if (paypalClient) {
  logger.info('PayPal SDK initialized successfully');
} else {
  logger.warn('PayPal SDK not initialized - payments and subscriptions disabled');
}
