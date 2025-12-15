import { Router } from 'express';
import paypalWebhookRoutes from './paypal';
import stripeWebhookRoutes from './stripe';

const router = Router();

// PayPal webhooks (requires raw body)
router.use('/paypal', paypalWebhookRoutes);

// Stripe webhooks (requires raw body for signature verification)
router.use('/stripe', stripeWebhookRoutes);

export default router;
