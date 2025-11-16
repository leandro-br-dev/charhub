import { Router } from 'express';
import paypalWebhookRoutes from './paypal';

const router = Router();

// PayPal webhooks (requires raw body)
router.use('/paypal', paypalWebhookRoutes);

export default router;
