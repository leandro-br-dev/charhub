---
name: charhub-jest-patterns
description: Jest testing patterns for CharHub backend. Use when writing Jest tests for Express services, controllers, or backend utilities.
---

# CharHub Jest Patterns

## Purpose

Define Jest-specific patterns, mocking strategies, and conventions for CharHub backend testing.

## Test File Setup

### Imports and Setup

```typescript
// character.service.spec.ts
import { CharacterService } from './character.service';
import { PrismaService } from '../database/prisma.service';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

describe('CharacterService', () => {
  let service: CharacterService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    // Clear mocks before each test
    mockPrisma = mockDeep<PrismaClient>();

    // Create service with mocked dependencies
    service = new CharacterService(mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
```

## Mocking Patterns

### Mocking Prisma

```typescript
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';

describe('CharacterService', () => {
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new CharacterService(mockPrisma);
  });

  it('should find character by id', async () => {
    const mockCharacter = {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
    };

    // Setup mock
    mockPrisma.character.findUnique.mockResolvedValue(mockCharacter);

    // Execute
    const result = await service.findById('1');

    // Assert
    expect(result).toEqual(mockCharacter);
    expect(mockPrisma.character.findUnique).toHaveBeenCalledWith({
      where: { id: '1' },
    });
  });
});
```

### Mocking Service Dependencies

```typescript
describe('CharacterController', () => {
  let controller: CharacterController;
  let mockService: DeepMockProxy<CharacterService>;

  beforeEach(() => {
    mockService = mockDeep<CharacterService>();
    controller = new CharacterController(mockService);
  });

  it('should return character', async () => {
    const mockCharacter = { id: '1', name: 'John' };
    mockService.findById.mockResolvedValue(mockCharacter);

    const result = await controller.findById('1');

    expect(result).toEqual(mockCharacter);
  });
});
```

### Mocking Module Exports

```typescript
// Mock entire module
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Use in test
import { logger } from '@/lib/logger';

describe('MyService', () => {
  it('should log error', () => {
    // logger.info is a mock function
    logger.info('test');
    expect(logger.info).toHaveBeenCalledWith('test');
  });
});
```

## NestJS Testing Module

### Unit Test with TestingModule

```typescript
describe('CharacterController (unit)', () => {
  let controller: CharacterController;
  let service: DeepMockProxy<CharacterService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CharacterController],
      providers: [
        {
          provide: CharacterService,
          useValue: mockDeep<CharacterService>(),
        },
      ],
    }).compile();

    controller = module.get<CharacterController>(CharacterController);
    service = module.get(CharacterService);
  });

  it('should return array of characters', async () => {
    const mockCharacters = [
      { id: '1', name: 'John' },
      { id: '2', name: 'Jane' },
    ];
    service.findAll.mockResolvedValue(mockCharacters);

    const result = await controller.findAll();

    expect(result).toEqual(mockCharacters);
  });
});
```

### Integration Test with TestingModule

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

  beforeEach(async () => {
    // Clean database before each test
    await prisma.character.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });
});
```

## Async Testing

### Testing Promises

```typescript
// ✅ GOOD - async/await
it('should return character', async () => {
  const result = await service.findById('1');
  expect(result).toBeDefined();
});

// ✅ GOOD - return promise
it('should return character', () => {
  return expect(service.findById('1')).resolves.toBeDefined();
});

// ✅ GOOD - await expect
it('should throw error', async () => {
  await expect(service.findById('invalid')).rejects.toThrow(NotFoundException);
});

// ❌ BAD - not waiting
it('should return character', () => {
  service.findById('1');
  expect(result).toBeDefined(); // Fails - test ends before promise
});
```

### Testing Async Errors

```typescript
it('should throw NotFoundException', async () => {
  mockPrisma.character.findUnique.mockResolvedValue(null);

  await expect(service.findById('1')).rejects.toThrow(NotFoundException);
  await expect(service.findById('1')).rejects.toThrow('Character not found');
});

it('should handle Prisma error', async () => {
  const prismaError = { code: 'P2002', message: 'Unique constraint' };
  mockPrisma.character.create.mockRejectedValue(prismaError);

  await expect(service.create(data)).rejects.toThrow(ConflictException);
});
```

## Matchers

### Custom Matchers

```typescript
// Setup custom matchers
import { toBeValidCharacter } from './test-helpers';

expect.extend({
  toBeValidCharacter(received: Character) {
    const pass = received.id && received.firstName && received.lastName;
    return {
      pass,
      message: () => pass
        ? `expected ${received} not to be valid`
        : `expected ${received} to be valid character`,
    };
  },
});

// Use in tests
it('should create valid character', async () => {
  const character = await service.create(data);
  expect(character).toBeValidCharacter();
});
```

### Common Matchers

```typescript
// Equality
expect(value).toBe(expected);           // Strict equality
expect(value).toEqual(expected);         // Deep equality
expect(value).toStrictEqual(expected);   // Strict deep equality

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();

// Numbers
expect(value).toBeGreaterThan(5);
expect(value).toBeLessThanOrEqual(10);

// Strings
expect(str).toContain('text');
expect(str).toMatch(/regex/);

// Arrays
expect(array).toHaveLength(3);
expect(array).toContain(item);
expect(array).toEqual(expect.arrayContaining([item1, item2]));

// Objects
expect(obj).toHaveProperty('key');
expect(obj).toMatchObject({ key: 'value' });

// Functions
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledTimes(1);
expect(fn).toHaveBeenCalledWith(arg1, arg2);
expect(fn).toHaveBeenLastCalledWith(lastArg);

// Async
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow(Error);
```

## Test Doubles

### Spies

```typescript
it('should call logger', () => {
  const loggerSpy = vi.spyOn(logger, 'info');

  service.doSomething();

  expect(loggerSpy).toHaveBeenCalledWith('Action completed');
  expect(loggerSpy).toHaveBeenCalledTimes(1);
});

it('should call service method', () => {
  const findByIdSpy = vi.spyOn(service, 'findById');

  controller.findById('1');

  expect(findByIdSpy).toHaveBeenCalledWith('1');
});
```

### Stubbing

```typescript
it('should use stubbed implementation', () => {
  vi.spyOn(service, 'findById').mockResolvedValue({
    id: '1',
    name: 'Stubbed Character',
  });

  const result = await controller.findById('1');

  expect(result.name).toBe('Stubbed Character');
});
```

## Test Isolation

### Isolation Between Tests

```typescript
describe('CharacterService', () => {
  let service: CharacterService;

  beforeEach(() => {
    // Fresh service for each test
    service = new CharacterService(mockPrisma);
  });

  afterEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
  });

  it('test 1', () => {
    // Independent from other tests
  });

  it('test 2', () => {
    // Independent from other tests
  });
});
```

### Database Cleanup

```typescript
describe('CharacterService (integration)', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    // Setup test database
    prisma = new PrismaService();
    await prisma.$connect();
  });

  beforeEach(async () => {
    // Clean before each test
    await prisma.character.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
```

## Parameterized Tests

### Test.each

```typescript
describe('Character validation', () => {
  it.each([
    ['John', 'Doe', true],
    ['', 'Doe', false],
    ['John', '', false],
    ['', '', false],
  ])(
    'should validate firstName="%s" and lastName="%s" as %s',
    (firstName, lastName, expected) => {
      const result = service.validateName(firstName, lastName);
      expect(result).toBe(expected);
    }
  );
});
```

## Setup and Teardown

### Execution Order

```
beforeAll → describe → beforeEach → it → afterEach → afterAll
```

### Example

```typescript
describe('MyService', () => {
  beforeAll(async () => {
    // Runs once before all tests in suite
    await setupDatabase();
  });

  afterAll(async () => {
    // Runs once after all tests in suite
    await cleanupDatabase();
  });

  beforeEach(() => {
    // Runs before each test
    mockService = createMock();
  });

  afterEach(() => {
    // Runs after each test
    vi.clearAllMocks();
  });

  it('test 1', () => {
    // Test here
  });
});
```

## Best Practices

### DO

✅ Use `jest-mock-extended` for mocking
✅ Follow AAA pattern (Arrange, Act, Assert)
✅ Clean up after each test
✅ Use descriptive test names
✅ Test error cases
✅ Use `expect.anything()` for Prisma selects
✅ Run migrations before integration tests

### DON'T

❌ Test private methods
❌ Test implementation details
❌ Skip cleanup
❌ Use generic test names
❌ Only test happy path
❌ Test Prisma select shapes exactly
❌ Forget database migrations

## Running Tests

```bash
# All tests
npm test

# Specific file
npm test -- character.service.spec

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage

# Update snapshots
npm test -- -u
```

## Related Skills

- `charhub-testing-standards` - General testing standards
- `charhub-nestjs-patterns` - NestJS patterns
- `charhub-prisma-patterns` - Prisma testing
