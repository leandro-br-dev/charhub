---
name: charhub-testing-standards
description: Testing standards and conventions for CharHub. Use when writing unit tests, integration tests, or E2E tests for backend or frontend code.
---

# CharHub Testing Standards

## Purpose

Define testing standards, coverage requirements, and conventions for CharHub backend and frontend testing.

## Testing Philosophy

**Test pyramid**:
- **Many** unit tests (fast, isolated)
- **Some** integration tests (API endpoints, database)
- **Few** E2E tests (critical user flows only)

## Coverage Requirements

| Target | Minimum Coverage | Recommended |
|--------|------------------|-------------|
| Backend services | >80% | >90% |
| Frontend components | >70% | >80% |
| Critical paths | 100% | 100% |

### Critical Paths

Always 100% coverage for:
- Authentication/authorization
- Payment processing
- Data persistence
- Security-related functions
- Public API endpoints

## Test Organization

### Backend Test Structure

```
backend/src/features/character/
├── character.service.ts
├── character.service.spec.ts       # Unit tests
├── character.controller.ts
├── character.controller.spec.ts    # Unit tests
└── character.e2e-spec.ts           # E2E tests
```

### Frontend Test Structure

```
frontend/src/components/
├── CharacterCard.vue
└── CharacterCard.spec.ts           # Component tests

frontend/src/composables/
├── useCharacterDetail.ts
└── useCharacterDetail.spec.ts      # Composable tests
```

## Test Naming

### Describe/Test Pattern

```typescript
// ✅ GOOD - Clear, descriptive names
describe('CharacterService', () => {
  describe('findById', () => {
    it('should return character when found', async () => {
      // ...
    });

    it('should return null when not found', async () => {
      // ...
    });

    it('should throw NotFoundException for invalid ID format', async () => {
      // ...
    });
  });
});

// ❌ BAD - Generic names
describe('CharacterService', () => {
  it('should work', async () => {
    // ...
  });

  it('should return character', async () => {
    // ...
  });
});
```

### Test Name Format

```
"should {expected outcome} when {condition/state}"

Examples:
✅ "should return character when valid ID provided"
✅ "should throw error when user not authenticated"
✅ "should create character and return created object"
✅ "should reject when validation fails"
```

## Backend Testing (Jest)

### Service Unit Tests

```typescript
describe('CharacterService', () => {
  let service: CharacterService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new CharacterService(mockPrisma);
  });

  describe('findById', () => {
    it('should return character when found', async () => {
      const mockCharacter = {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
      };
      mockPrisma.character.findUnique.mockResolvedValue(mockCharacter);

      const result = await service.findById('1');

      expect(result).toEqual(mockCharacter);
      expect(mockPrisma.character.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should return null when not found', async () => {
      mockPrisma.character.findUnique.mockResolvedValue(null);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });
});
```

### Controller Unit Tests

```typescript
describe('CharacterController', () => {
  let controller: CharacterController;
  let service: DeepMockProxy<CharacterService>;

  beforeEach(() => {
    service = mockDeep<CharacterService>();
    controller = new CharacterController(service);
  });

  describe('findAll', () => {
    it('should return array of characters', async () => {
      const mockCharacters = [
        { id: '1', firstName: 'John' },
        { id: '2', firstName: 'Jane' },
      ];
      service.findAll.mockResolvedValue(mockCharacters);

      const result = await controller.findAll();

      expect(result).toEqual(mockCharacters);
    });
  });
});
```

### Integration Tests

```typescript
describe('CharacterController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.character.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/characters (GET)', () => {
    it('should return array of characters', async () => {
      // Setup test data
      await prisma.character.createMany({
        data: [
          { firstName: 'John', lastName: 'Doe' },
          { firstName: 'Jane', lastName: 'Smith' },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/characters')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('id');
    });
  });
});
```

## Frontend Testing (Vitest)

### Component Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import CharacterCard from './CharacterCard.vue';

describe('CharacterCard', () => {
  const mockCharacter = {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    type: 'BASIC',
    isActive: true,
  };

  it('displays character name', () => {
    const wrapper = mount(CharacterCard, {
      props: { character: mockCharacter },
    });

    expect(wrapper.text()).toContain('John Doe');
  });

  it('emits edit event when edit button clicked', async () => {
    const wrapper = mount(CharacterCard, {
      props: { character: mockCharacter },
    });

    await wrapper.find('[data-test="edit-button"]').trigger('click');

    expect(wrapper.emitted('edit')).toBeTruthy();
    expect(wrapper.emitted('edit')?.[0]).toEqual([mockCharacter]);
  });

  it('does not show actions when showActions is false', () => {
    const wrapper = mount(CharacterCard, {
      props: {
        character: mockCharacter,
        showActions: false,
      },
    });

    expect(wrapper.find('[data-test="edit-button"]').exists()).toBe(false);
  });
});
```

### Composable Tests

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useCharacterDetail } from './useCharacterDetail';
import * as api from '@/api/character';

vi.mock('@/api/character');

describe('useCharacterDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches character on mount', async () => {
    const mockCharacter = { id: '1', firstName: 'John' };
    vi.spyOn(api, 'getCharacter').mockResolvedValue(mockCharacter);

    const characterId = ref('1');
    const { data } = useCharacterDetail(characterId);

    await nextTick();

    expect(api.getCharacter).toHaveBeenCalledWith('1');
    expect(data.value).toEqual(mockCharacter);
  });

  it('sets loading state correctly', async () => {
    vi.spyOn(api, 'getCharacter').mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({}), 100))
    );

    const characterId = ref('1');
    const { loading } = useCharacterDetail(characterId);

    expect(loading.value).toBe(true);

    await vi.runAllTimers();

    expect(loading.value).toBe(false);
  });

  it('sets error state on failure', async () => {
    const mockError = new Error('Not found');
    vi.spyOn(api, 'getCharacter').mockRejectedValue(mockError);

    const characterId = ref('1');
    const { error } = useCharacterDetail(characterId);

    await nextTick();

    expect(error.value).toEqual(mockError);
  });
});
```

## Critical: Prisma Select Testing

### DON'T Test Select Shape

```typescript
// ❌ WRONG - This doesn't work
expect(mockPrisma.character.findMany).toHaveBeenCalledWith({
  select: expect.objectContaining({
    id: true,
    firstName: true,
  }),
});

// ✅ CORRECT - Use expect.anything()
expect(mockPrisma.character.findMany).toHaveBeenCalledWith({
  select: expect.anything(), // Prisma handles validation
});
```

**Reason**: Prisma select objects have complex nested structure. The service logic matters, not the exact select shape.

## Database Testing

### Before Running Tests

**CRITICAL**: Always run migrations first

```bash
cd backend
npx prisma migrate deploy
npm test
```

Tests fail if database schema doesn't match migrations.

### Test Database Isolation

```typescript
describe('CharacterService', () => {
  beforeAll(async () => {
    // Use test database URL
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    await runMigrations();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.character.deleteMany();
  });
});
```

## Test Utilities

### Common Test Helpers

```typescript
// test/helpers.ts
export const mockCharacter = (overrides?: Partial<Character>): Character => ({
  id: '1',
  firstName: 'John',
  lastName: 'Doe',
  type: 'BASIC',
  isActive: true,
  ...overrides,
});

export const mockUser = (overrides?: Partial<User>): User => ({
  id: '1',
  email: 'test@example.com',
  role: 'BASIC',
  ...overrides,
});

// Wait for async updates
export const tick = () => new Promise(resolve => setTimeout(resolve, 0));
```

## Test Data Management

### Fixtures

```typescript
// test/fixtures/characters.ts
export const characterFixtures = {
  basic: {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    type: 'BASIC' as const,
  },
  premium: {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    type: 'PREMIUM' as const,
  },
};
```

## Async Testing

### Testing Async Code

```typescript
it('should handle async operation', async () => {
  // ✅ GOOD - Use async/await
  const result = await service.findById('1');
  expect(result).toBeDefined();

  // ✅ GOOD - Return promise
  return expect(service.findById('1')).resolves.toBeDefined();

  // ❌ BAD - Not waiting for promise
  service.findById('1');
  expect(result).toBeDefined(); // Fails - test finishes before promise
});
```

### Waiting for Updates

```typescript
// Vitest/Vue Test Utils
import { nextTick } from 'vue';

it('should update after async operation', async () => {
  wrapper.vm.updateData();
  await nextTick(); // Wait for Vue reactivity
  expect(wrapper.text()).toContain('Updated');
});
```

## Mocking

### Mocking Dependencies

```typescript
// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    character: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock API
vi.mock('@/api/character', () => ({
  getCharacter: vi.fn(),
  createCharacter: vi.fn(),
}));
```

### Mock Implementation

```typescript
it('should handle error', async () => {
  vi.spyOn(service, 'findById').mockRejectedValue(
    new Error('Not found')
  );

  await expect(wrapper.vm.fetchCharacter()).rejects.toThrow('Not found');
});
```

## Best Practices

### DO

✅ Test behavior, not implementation
✅ Use descriptive test names
✅ Follow AAA pattern (Arrange, Act, Assert)
✅ Clean up test data after each test
✅ Run migrations before tests
✅ Mock external dependencies
✅ Test error cases
✅ Keep tests independent

### DON'T

❌ Test implementation details
❌ Use generic test names
❌ Skip cleanup between tests
❌ Test private methods
❌ Test Prisma select shapes exactly
❌ Forget to run migrations
❌ Write dependent tests
❌ Skip error cases

## Running Tests

### Backend

```bash
cd backend
npm test                      # All tests
npm test -- character          # Specific file
npm test -- --coverage        # With coverage
npm test -- --watch           # Watch mode
```

### Frontend

```bash
cd frontend
npm test                      # All tests
npm run test:ui               # UI mode
npm run test:coverage         # With coverage
```

## Related Skills

- `charhub-jest-patterns` - Jest-specific patterns
- `charhub-vitest-patterns` - Vitest-specific patterns
- `charhub-prisma-patterns` - Database testing
