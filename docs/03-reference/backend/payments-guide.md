# Payment System Configuration Guide

This guide explains how to configure payment providers (Stripe and PayPal) for both development and production environments.

## Table of Contents

- [Overview](#overview)
- [Stripe Configuration](#stripe-configuration)
  - [Test Mode (Development)](#test-mode-development)
  - [Production Mode](#production-mode)
  - [Switching to Production](#switching-to-production)
- [PayPal Configuration](#paypal-configuration)
- [Environment Variables Reference](#environment-variables-reference)
- [Security Best Practices](#security-best-practices)

---

## Overview

CharHub supports two payment providers:
- **Stripe**: Primary payment provider (credit/debit cards)
- **PayPal**: Alternative payment provider

Both providers have separate Test and Live (Production) modes with different API keys.

---

## Stripe Configuration

### Test Mode (Development)

Test mode allows you to simulate payments without charging real money. All test transactions use fake card numbers provided by Stripe.

#### 1. Get Test Mode Keys

1. Go to [Stripe Dashboard (Test Mode)](https://dashboard.stripe.com/test/apikeys)
2. Copy the following keys:
   - **Secret Key**: starts with `sk_test_...`
   - **Publishable Key**: starts with `pk_test_...`

#### 2. Create Price IDs for Each Plan

1. Go to [Products (Test Mode)](https://dashboard.stripe.com/test/products)
2. Create a Product for each plan:
   - **Plus Plan**: $5/month
   - **Premium Plan**: $10/month
   - *(Free plan doesn't need a Stripe Price ID)*
3. Copy the **Price ID** for each (starts with `price_...`)

#### 3. Configure Webhook

1. Go to [Webhooks (Test Mode)](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. Set URL: `https://your-dev-domain.com/api/v1/webhooks/stripe`
4. Select events to listen:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing Secret** (starts with `whsec_...`)

#### 4. Update Environment Variables

**Backend** (`.env` in root):
```bash
# Test Mode Keys
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Test Mode Price IDs
STRIPE_PRICE_FREE=
STRIPE_PRICE_PLUS=price_your_test_plus_id
STRIPE_PRICE_PREMIUM=price_your_test_premium_id
```

**Frontend** (`frontend/.env`):
```bash
# Test Mode Publishable Key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

#### 5. Test with Fake Cards

Use these test card numbers in development:
- **Success**: `4242 4242 4242 4242`
- **Declined**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0027 6000 3184`

More test cards: [Stripe Testing Guide](https://stripe.com/docs/testing)

---

### Production Mode

Production mode processes real payments and charges real money.

#### 1. Activate Your Stripe Account

Before going live:
1. Complete business verification in Stripe Dashboard
2. Add banking information for payouts
3. Review and accept Stripe Terms of Service
4. Activate your account

#### 2. Get Live Mode Keys

1. Go to [Stripe Dashboard (Live Mode)](https://dashboard.stripe.com/apikeys)
2. Toggle to **Live Mode** (switch at top)
3. Copy the following keys:
   - **Secret Key**: starts with `sk_live_...`
   - **Publishable Key**: starts with `pk_live_...`

#### 3. Create Production Products and Prices

1. Go to [Products (Live Mode)](https://dashboard.stripe.com/products)
2. Toggle to **Live Mode**
3. Create the same Products as in Test Mode:
   - **Plus Plan**: $5/month recurring
   - **Premium Plan**: $10/month recurring
4. Copy the **Price IDs** (starts with `price_...`)

#### 4. Configure Production Webhook

1. Go to [Webhooks (Live Mode)](https://dashboard.stripe.com/webhooks)
2. Toggle to **Live Mode**
3. Click "Add endpoint"
4. Set URL: `https://charhub.app/api/v1/webhooks/stripe`
5. Select the same events as Test Mode
6. Copy the **Signing Secret** (starts with `whsec_...`)

#### 5. Update Production Environment Variables

**Backend Production** (server `.env`):
```bash
# LIVE Mode Keys
STRIPE_SECRET_KEY=sk_live_your_LIVE_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_LIVE_webhook_secret_here

# LIVE Mode Price IDs
STRIPE_PRICE_FREE=
STRIPE_PRICE_PLUS=price_your_LIVE_plus_id
STRIPE_PRICE_PREMIUM=price_your_LIVE_premium_id
```

**Frontend Production** (`frontend/.env.production`):
```bash
# LIVE Mode Publishable Key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_LIVE_publishable_key_here
```

---

### Switching to Production

Follow this checklist when deploying to production:

#### Pre-Deployment Checklist

- [ ] Stripe account fully activated and verified
- [ ] Live mode products and prices created
- [ ] Live mode webhook configured with production URL
- [ ] All live mode keys obtained

#### Backend Deployment

1. **Update `.env` on production server:**
   ```bash
   # Replace ALL test keys with live keys
   STRIPE_SECRET_KEY=sk_live_...        # NOT sk_test_!
   STRIPE_WEBHOOK_SECRET=whsec_...      # From LIVE webhook
   STRIPE_PRICE_PLUS=price_...          # From LIVE product
   STRIPE_PRICE_PREMIUM=price_...       # From LIVE product
   ```

2. **Run database seed to update plans:**
   ```bash
   npm run db:seed:force
   ```

3. **Restart backend:**
   ```bash
   docker compose restart backend
   # OR on production: pm2 restart backend
   ```

#### Frontend Deployment

1. **Update `frontend/.env.production`:**
   ```bash
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...  # NOT pk_test_!
   ```

2. **Build frontend with production config:**
   ```bash
   npm run build
   ```

3. **Deploy built files to CDN/hosting**

#### Verification

After deployment, verify:

- [ ] Test a real payment with a real card (small amount)
- [ ] Verify payment appears in Stripe Live Dashboard
- [ ] Verify webhook events are being received
- [ ] Verify subscription activates in database
- [ ] Check logs for any errors

---

## PayPal Configuration

### Test Mode (Sandbox)

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Create a Sandbox Business Account
3. Get **Client ID** and **Client Secret** from app credentials
4. Create Sandbox Plans in PayPal Dashboard

**Environment Variables:**
```bash
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
```

### Production Mode

1. Switch PayPal app to Live mode
2. Get **Live Client ID** and **Live Client Secret**
3. Create Live Plans in PayPal Dashboard

**Environment Variables:**
```bash
PAYPAL_MODE=live
PAYPAL_CLIENT_ID=your_live_client_id
PAYPAL_CLIENT_SECRET=your_live_client_secret
```

---

## Environment Variables Reference

### Backend Variables

| Variable | Description | Example (Test) | Example (Live) |
|----------|-------------|----------------|----------------|
| `STRIPE_SECRET_KEY` | Backend API key | `sk_test_...` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification | `whsec_...` | `whsec_...` |
| `STRIPE_PRICE_FREE` | Free plan Price ID | *(empty)* | *(empty)* |
| `STRIPE_PRICE_PLUS` | Plus plan Price ID | `price_test_...` | `price_live_...` |
| `STRIPE_PRICE_PREMIUM` | Premium plan Price ID | `price_test_...` | `price_live_...` |

### Frontend Variables

| Variable | Description | Example (Test) | Example (Live) |
|----------|-------------|----------------|----------------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | Frontend API key | `pk_test_...` | `pk_live_...` |

---

## Security Best Practices

### ⚠️ Critical Security Rules

1. **Never Commit Real Keys to Git**
   - Keep `.env` files in `.gitignore`
   - Use environment-specific files (`.env.production`, `.env.development`)
   - Use secret management tools in production (AWS Secrets Manager, etc.)

2. **Never Use Secret Keys in Frontend**
   - Frontend should ONLY use Publishable Keys (`pk_test_...` or `pk_live_...`)
   - Secret Keys (`sk_test_...` or `sk_live_...`) must ONLY be on backend

3. **Verify Webhook Signatures**
   - Always validate webhook requests using `STRIPE_WEBHOOK_SECRET`
   - Reject webhooks that fail signature verification
   - *(Already implemented in `backend/src/services/payments/StripeProvider.ts`)*

4. **Rotate Keys Regularly**
   - Rotate API keys every 6-12 months
   - Immediately rotate if a key is compromised
   - Update both backend and frontend when rotating

5. **Use Different Keys for Each Environment**
   - Test keys for development/staging
   - Live keys only for production
   - Never mix test and live keys

6. **Monitor Stripe Dashboard**
   - Enable email notifications for failed payments
   - Set up fraud detection rules
   - Review suspicious activity regularly

---

## Troubleshooting

### Common Issues

**"Invalid API Key"**
- Verify key format (test vs live)
- Check key is correctly copied (no extra spaces)
- Ensure backend and frontend keys match environment

**"Webhook signature verification failed"**
- Verify `STRIPE_WEBHOOK_SECRET` matches webhook in Stripe Dashboard
- Check webhook URL is correct
- Ensure webhook is using correct mode (test/live)

**"Price ID not found"**
- Verify Price ID exists in correct mode (test/live)
- Check Price ID is correctly copied
- Run `npm run db:seed:force` after updating Price IDs

**"Payment succeeded but subscription not activated"**
- Check webhook is configured and receiving events
- Review backend logs for errors
- Verify database connection

---

## Additional Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Webhook Guide](https://stripe.com/docs/webhooks)
- [Stripe Best Practices](https://stripe.com/docs/security/best-practices)
- [PayPal Developer Documentation](https://developer.paypal.com/docs/)

---

**Last Updated**: December 2025
