# Stripe Environment Variables

Add these variables to your `backend/.env` file:

## Required Variables

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_xxx    # Get from https://dashboard.stripe.com/test/apikeys
STRIPE_WEBHOOK_SECRET=whsec_xxx  # Get from https://dashboard.stripe.com/test/webhooks

# For Production (when ready)
# STRIPE_SECRET_KEY=sk_live_xxx
# STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## Getting Your Keys

### 1. Stripe Secret Key
1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy the "Secret key" (starts with `sk_test_`)
3. Add to `.env` as `STRIPE_SECRET_KEY`

### 2. Stripe Webhook Secret
1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Enter your webhook URL: `https://your-domain.com/api/v1/webhooks/stripe`
4. Select events to listen to:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copy the "Signing secret" (starts with `whsec_`)
6. Add to `.env` as `STRIPE_WEBHOOK_SECRET`

## Testing Webhooks Locally

Use Stripe CLI to forward webhooks to your local server:

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe
```

The CLI will output a webhook signing secret to use for local testing.
