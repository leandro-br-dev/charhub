# Test Utilities

This folder contains utilities for writing tests in CharHub backend.

## Files

### `database.ts`
Database management utilities for tests.

**Functions**:
- `getTestDb()` - Get singleton test database instance
- `setupTestDatabase()` - Initialize test database connection
- `cleanDatabase()` - Delete all data from tables (for test isolation)
- `teardownTestDatabase()` - Disconnect from test database
- `seedTestPlans()` - Seed basic Free/Plus/Premium plans

**Usage**:
```typescript
import { setupTestDatabase, cleanDatabase, teardownTestDatabase } from '../test-utils/database';

describe('My Test Suite', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase(); // Clean before each test
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should test something', async () => {
    // Your test here
  });
});
```

### `factories.ts`
Factory functions to create test data.

**Functions**:
- `createTestUser(overrides?)` - Create test user
- `createTestUserWithBalance(balance, overrides?)` - Create user with specific credit balance
- `createTestPlan(overrides?)` - Create test plan
- `createTestUserPlan(userId, planId, overrides?)` - Create user subscription
- `createTestTransaction(userId, overrides?)` - Create credit transaction

**Usage**:
```typescript
import { createTestUser, createTestUserWithBalance } from '../test-utils/factories';

it('should deduct credits from user', async () => {
  const user = await createTestUserWithBalance(100);
  // user now has 100 credits

  await creditService.deductCredits(user.id, 10, 'CHAT_MESSAGE');

  const balance = await creditService.getCurrentBalance(user.id);
  expect(balance).toBe(90);
});
```

## Best Practices

1. **Test Isolation**: Always clean database between tests
   ```typescript
   beforeEach(async () => {
     await cleanDatabase();
   });
   ```

2. **Use Factories**: Don't create data manually, use factories
   ```typescript
   // ✅ Good
   const user = await createTestUser({ email: 'custom@test.com' });

   // ❌ Bad
   const user = await db.user.create({ data: { email: 'custom@test.com', name: '...' } });
   ```

3. **Test Database**: Use separate test database
   ```bash
   # .env.test
   DATABASE_URL_TEST=postgresql://user:password@localhost:5432/charhub_test
   ```

4. **Cleanup**: Always disconnect in afterAll
   ```typescript
   afterAll(async () => {
     await teardownTestDatabase();
   });
   ```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- src/services/__tests__/creditService.test.ts
```

## Coverage Thresholds

Configured in `jest.config.js`:
- Branches: 50%
- Functions: 50%
- Lines: 50%
- Statements: 50%

**Note**: These are minimum thresholds. Aim for 70%+ coverage for production-critical code.
