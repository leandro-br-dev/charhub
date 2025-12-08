# Credits System - Usage Guide

**Purpose**: Guide for developers to integrate the credits system into new features.

**For implementation details**: See [features/implemented/credits-system.md](../../05-business/planning/features/implemented/credits-system.md)

---

## Overview

The credits system enables monetization of premium features by requiring users to spend credits for certain operations.

---

## Quick Start

```typescript
import { requireCredits, deductCredits } from '../services/creditService';

// Example: Chat message requiring 1 credit
export async function sendChatMessage(userId: string, message: string) {
  // 1. Check if user has sufficient credits
  await requireCredits(userId, 1);

  // 2. Perform operation
  const result = await chatService.send(message);

  // 3. Deduct credits and log transaction
  await deductCredits(userId, 1, 'CHAT_MESSAGE', {
    messageId: result.id,
    conversationId: result.conversationId
  });

  return result;
}
```

---

## Available Functions

### `requireCredits(userId, amount)`

Checks if user has sufficient credits. Throws `InsufficientCreditsError` if not.

```typescript
await requireCredits(userId, 10);
// Throws if user has < 10 credits
```

**When to use**: Before any paid operation to validate balance.

---

### `deductCredits(userId, amount, reason, metadata?)`

Deducts credits from user balance and creates transaction record.

```typescript
await deductCredits(userId, 10, 'IMAGE_GENERATION', {
  imageUrl: 'https://...',
  prompt: 'A beautiful sunset'
});
```

**Parameters**:
- `userId` - User ID
- `amount` - Credits to deduct (positive number)
- `reason` - Transaction reason (enum: see below)
- `metadata` - Optional JSON object with additional context

---

### `addCredits(userId, amount, reason, metadata?)`

Adds credits to user balance (for rewards, purchases, refunds).

```typescript
await addCredits(userId, 200, 'INITIAL_BONUS');
await addCredits(userId, 20, 'DAILY_REWARD');
await addCredits(userId, 100, 'PURCHASE', {
  transactionId: 'txn_123',
  paymentMethod: 'paypal'
});
```

---

### `getUserBalance(userId)`

Returns current credit balance.

```typescript
const balance = await getUserBalance(userId);
console.log(`User has ${balance} credits`);
```

---

## Transaction Reasons (Enum)

### Deductions
- `CHAT_MESSAGE` - Sending chat message
- `IMAGE_GENERATION` - Generating AI image
- `PREMIUM_FEATURE` - Using premium feature
- `STORY_GENERATION` - Generating story

### Additions
- `INITIAL_BONUS` - New user signup bonus
- `DAILY_REWARD` - Daily login reward
- `FIRST_CHAT_REWARD` - First chat completion reward
- `PURCHASE` - User purchased credits
- `REFUND` - Refund for failed operation
- `ADMIN_GRANT` - Manual credit grant by admin

---

## Credit Costs

Current cost table (as of 2025-12-07):

| Feature | Cost | Source File |
|---------|------|-------------|
| Chat message | 1 credit | `backend/src/data/service-costs.json` |
| Image generation | 10 credits | `backend/src/data/service-costs.json` |
| Story generation | 5 credits | `backend/src/data/service-costs.json` |
| Premium feature access | 5 credits | `backend/src/data/service-costs.json` |

**To update costs**: Edit `backend/src/data/service-costs.json`

---

## Error Handling

```typescript
import { InsufficientCreditsError } from '../errors/CreditErrors';

try {
  await requireCredits(userId, 10);
  // ... perform operation
} catch (error) {
  if (error instanceof InsufficientCreditsError) {
    return res.status(402).json({
      error: 'INSUFFICIENT_CREDITS',
      required: 10,
      current: error.currentBalance,
      message: 'You need 10 credits to use this feature'
    });
  }
  throw error;
}
```

**HTTP Status**: Use `402 Payment Required` for insufficient credits errors.

---

## Frontend Integration

### Check Balance Before Operation

```typescript
import { api } from '@/lib/api';

async function handlePremiumFeature() {
  // Get user balance
  const { balance } = await api.get('/api/v1/credits/balance');

  if (balance < 10) {
    toast.error('Insufficient credits. You need 10 credits.');
    return;
  }

  // Proceed with operation
  await api.post('/api/v1/premium-feature');
}
```

### Update Balance in UI

Use TanStack Query to keep balance synchronized:

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';

export function useCreditBalance() {
  return useQuery({
    queryKey: ['credits', 'balance'],
    queryFn: async () => {
      const res = await api.get('/api/v1/credits/balance');
      return res.data.balance;
    },
    refetchInterval: 30000 // Refetch every 30s
  });
}

// Invalidate after credit operations
const queryClient = useQueryClient();
await api.post('/api/v1/chat/send');
queryClient.invalidateQueries({ queryKey: ['credits', 'balance'] });
```

---

## Database Schema

```prisma
model CreditTransaction {
  id            String   @id @default(uuid())
  userId        String
  amount        Int      // Positive for addition, negative for deduction
  balanceBefore Int
  balanceAfter  Int
  reason        String
  metadata      Json?
  createdAt     DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([createdAt])
}

model User {
  id              String              @id @default(uuid())
  creditBalance   Int                 @default(200) // Initial bonus
  creditTransactions CreditTransaction[]
}
```

---

## Testing

```typescript
import { requireCredits, deductCredits, addCredits } from '../services/creditService';

describe('Credits Service', () => {
  it('should deduct credits and create transaction', async () => {
    const userId = 'user_123';

    // Add initial credits
    await addCredits(userId, 100, 'INITIAL_BONUS');

    // Deduct credits
    await deductCredits(userId, 10, 'CHAT_MESSAGE');

    // Verify balance
    const balance = await getUserBalance(userId);
    expect(balance).toBe(90);
  });

  it('should throw error on insufficient credits', async () => {
    const userId = 'user_456';
    await addCredits(userId, 5, 'INITIAL_BONUS');

    await expect(
      requireCredits(userId, 10)
    ).rejects.toThrow(InsufficientCreditsError);
  });
});
```

---

## See Also

- **Implementation Spec**: [features/implemented/credits-system.md](../../05-business/planning/features/implemented/credits-system.md) - Full technical specification
- **API Reference**: Backend API endpoints for credits operations
- **Service Costs**: `backend/src/data/service-costs.json` - Cost configuration file
- **Credit Verification Guide**: [credit-verification.md](../../02-guides/development/credit-verification.md) - Integration patterns

---

**Last Updated**: 2025-12-07
