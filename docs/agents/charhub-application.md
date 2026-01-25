# CharHub: Application of Skills & Subagents

**Last Updated**: 2025-01-24
**Branch**: `feature/ai-agents-refactor`

---

## Executive Summary

This document outlines how CharHub will leverage Claude Code's **Skills** and **Subagents** to create a more maintainable, scalable, and consistent development workflow.

### Current State

CharHub currently uses a **subagent-only approach** documented in:
- `docs/agents/coder/CLAUDE.md` (Agent Coder orchestration)
- `docs/agents/coder/sub-agents/*.md` (8 specialized subagents)

### Proposed Refactor

**Introduce Skills** to:
1. Reduce documentation duplication
2. Ensure consistent pattern enforcement
3. Make conventions easily distributable via git
4. Allow subagents to inherit domain knowledge automatically

---

## Architecture Vision

### Before (Subagent-Only)

```
Agent Coder (main conversation)
    │
    ├─→ backend-developer (subagent)
    │   └─ Has embedded patterns in prompt
    │
    ├─→ frontend-specialist (subagent)
    │   └─ Has embedded patterns in prompt
    │
    └─→ test-writer (subagent)
        └─ Has embedded patterns in prompt

Problem: Patterns duplicated across subagent files
```

### After (Skills + Subagents)

```
Agent Coder (main conversation)
    │
    │ Skills (domain knowledge)
    ├─ charhub-api-conventions
    ├─ charhub-frontend-patterns
    ├─ charhub-i18n-system
    └─ charhub-testing-patterns
        │
    ▼
Subagents (execution specialists)
    │
    ├─→ backend-developer
    │   └─ loads: api-conventions, nestjs-patterns, prisma-best-practices
    │
    ├─→ frontend-specialist
    │   └─ loads: frontend-patterns, vue3-conventions, i18n-system
    │
    └─→ test-writer
        └─ loads: testing-patterns, jest-conventions

Benefit: Single source of truth for patterns
```

---

## Proposed Skills Structure

### Domain Skills (`.claude/skills/`)

```
.claude/skills/
├── charhub-api-conventions/
│   └── SKILL.md
├── charhub-frontend-patterns/
│   └── SKILL.md
├── charhub-i18n-system/
│   ├── SKILL.md
│   ├── frontend-keys.md
│   └── backend-patterns.md
├── charhub-testing-patterns/
│   └── SKILL.md
└── charhub-nestjs-patterns/
    └── SKILL.md
```

---

## Skill Specifications

### 1. charhub-api-conventions

**Purpose**: API endpoint development standards

```yaml
---
name: charhub-api-conventions
description: API development conventions for CharHub NestJS backend. Use when implementing or reviewing API endpoints, controllers, or services.
---

# CharHub API Conventions

## Endpoint Structure

### Route Naming
- Use **kebab-case** for route paths
- ✅ `/user-settings`, `/character-avatar`
- ❌ `/userSettings`, `/characterAvatar`

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `403` - Forbidden (permission denied)
- `404` - Not Found
- `500` - Internal Server Error

## Error Response Format

### Current Pattern
```typescript
// Controller
@Post()
async create(@Body() dto: CreateDto) {
  try {
    return await this.service.create(dto);
  } catch (error) {
    if (error.code === 'P2003') {
      throw new ForbiddenException('Admin access required');
    }
    throw new InternalServerErrorException('Failed to create resource');
  }
}
```

### Response Shape
```json
{
  "error": "Error message in English"
}
```

### Future i18n Pattern (Planned - see #129)
```typescript
import { apiT } from '../../utils/api-i18n';

const message = await apiT(req, 'api.error.admin_required');
throw new ForbiddenException(message);
```

## Input Validation

### Use Zod Schemas
```typescript
import { z } from 'zod';

const createConfigSchema = z.object({
  key: z.string().regex(/^[a-zA-Z0-9._-]+$/),
  value: z.string().min(1),
  description: z.string().optional(),
});

const validatedData = createConfigSchema.parse(req.body);
```

## TypeScript Best Practices

### Avoid `any` Types
```typescript
// ❌ BAD
function processUser(user: any) { }

// ✅ GOOD
interface User {
  id: string;
  role: 'ADMIN' | 'BASIC' | 'PREMIUM' | 'BOT';
}
function processUser(user: User) { }
```

## Service Layer Patterns

### Structured Logging
```typescript
// ✅ GOOD
logger.info({ characterId, duration }, 'Avatar correction completed');

// ❌ BAD
logger.info('Avatar correction completed');
```

### Error Handling
- Always wrap Prisma operations in try-catch
- Use NestJS built-in exceptions
- Log errors with context before throwing

## Database Operations

### Prisma Query Patterns
- Use `select` to limit returned fields
- Use `include` for relations judiciously
- Always handle Prisma error codes (P2002, P2003, etc.)

## Testing
- Write unit tests for services
- Write integration tests for controllers
- Mock Prisma client in tests
```

---

### 2. charhub-frontend-patterns

**Purpose**: Vue 3 and frontend development standards

```yaml
---
name: charhub-frontend-patterns
description: Vue 3 frontend patterns for CharHub. Use when implementing components, composables, or UI features.
---

# CharHub Frontend Patterns

## Component Structure

### Script Setup Pattern
```typescript
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// Props
interface Props {
  characterId: string;
}
const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  update: [value: string];
}>();

// Composables
const { data, loading, error } = useCharacterDetail(() => props.characterId);
</script>
```

## i18n Requirements

### ALL User-Facing Text Must Use i18n
```typescript
// ❌ BAD - Hardcoded
<button>Submit</button>
<span>Error occurred</span>

// ✅ GOOD - i18n keys
<button>{{ t('common.submit') }}</button>
<span>{{ t('error.generic') }}</span>
```

### Translation Key Organization
```
frontend/src/locales/
├── en-US.json
│   ├── common
│   ├── components
│   ├── pages
│   └── api
└── pt-BR.json
    ├── common
    ├── components
    ├── pages
    └── api
```

### Adding New Translations
1. Add key to BOTH en-US.json and pt-BR.json
2. Run `npm run translations:compile`
3. Verify frontend build succeeds (fails on missing keys)

## Composables Pattern

### Naming Convention
- Use `use` prefix: `useCharacterDetail`, `useAuth`
- Accept getter functions for reactive parameters

```typescript
// ✅ GOOD
export function useCharacterDetail(characterId: ComputedRef<string> | Ref<string>) {
  const data = ref<Character | null>(null);
  // ...
  return { data, loading, error };
}
```

## TypeScript in Components

### Define Interfaces
```typescript
interface Character {
  id: string;
  firstName: string;
  lastName: string;
}

interface Props {
  character: Character;
}
```

## Routing

### Route Naming (kebab-case)
- `/character-list` (not `/characterList`)
- `/user-settings` (not `/userSettings`)
```

---

### 3. charhub-i18n-system

**Purpose**: Internationalization system patterns

```yaml
---
name: charhub-i18n-system
description: CharHub internationalization system. Use when adding translations or working with i18n in frontend or backend.
---

# CharHub i18n System

## Frontend i18n

### Translation Files Location
```
frontend/src/locales/
├── en-US.json
└── pt-BR.json
```

### Key Structure (Flat or Nested)
```json
{
  "common": {
    "submit": "Submit",
    "cancel": "Cancel",
    "delete": "Delete"
  },
  "components": {
    "characterCard": {
      "viewDetails": "View Details",
      "edit": "Edit"
    }
  }
}
```

### Usage in Components
```typescript
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// Simple key
{{ t('common.submit') }}

// Nested key
{{ t('components.characterCard.viewDetails') }}

// With parameters
{{ t('error.withMessage', { message: error.value }) }}
```

### Adding New Translations

**Process**:
1. Add key to `en-US.json`
2. Add corresponding key to `pt-BR.json`
3. Run `npm run translations:compile`
4. Verify build: `npm run build:frontend`

**CRITICAL**: Build fails if keys are missing between languages

## Backend i18n (Future)

### Current State
API responses use hardcoded English strings:

```typescript
throw new ForbiddenException('Admin access required');
```

### Planned Implementation (#129)
```typescript
import { apiT } from '../../utils/api-i18n';

const message = await apiT(req, 'api.error.admin_required');
throw new ForbiddenException(message);
```

### Backend Translation Structure (Planned)
```
backend/src/locales/
├── en-US.json
└── pt-BR.json
```

## Language Detection

### Frontend
- Detects from browser `navigator.language`
- Falls back to `en-US`
- Stored in localStorage

### Backend (Planned)
- From `Accept-Language` header
- User preference in database
- Falls back to `en-US`

## Best Practices

### DO
- Always use i18n for user-facing text
- Keep key structure consistent
- Use descriptive key names
- Add both languages simultaneously

### DON'T
- Hardcode user-facing strings
- Add keys to only one language
- Use overly generic key names (`text1`, `label2`)
```

---

### 4. charhub-testing-patterns

**Purpose**: Testing standards and conventions

```yaml
---
name: charhub-testing-patterns
description: Testing patterns for CharHub. Use when writing unit tests, integration tests, or E2E tests.
---

# CharHub Testing Patterns

## Unit Tests

### Location
```
backend/src/**/*.spec.ts
frontend/src/**/*.spec.ts
```

### Backend Unit Test Pattern
```typescript
describe('CharacterService', () => {
  let service: CharacterService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = createMock<PrismaClient>();
    service = new CharacterService(mockPrisma as unknown as PrismaClient);
  });

  describe('findById', () => {
    it('should return character when found', async () => {
      const mockCharacter = { id: '1', firstName: 'John' };
      mockPrisma.character.findUnique.mockResolvedValue(mockCharacter);

      const result = await service.findById('1');

      expect(result).toEqual(mockCharacter);
    });
  });
});
```

### Frontend Unit Test Pattern
```typescript
import { mount } from '@vue/test-utils';
import CharacterCard from './CharacterCard.vue';

describe('CharacterCard', () => {
  it('displays character name', () => {
    const wrapper = mount(CharacterCard, {
      props: {
        character: { id: '1', firstName: 'John', lastName: 'Doe' }
      }
    });

    expect(wrapper.text()).toContain('John Doe');
  });
});
```

## Integration Tests

### API Integration Tests
```typescript
describe('CharacterController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/characters (GET)', () => {
    return request(app.getHttpServer())
      .get('/characters')
      .expect(200)
      .expect(Array);
  });
});
```

## Prisma Testing Best Practices

### DON'T Use expect.objectContaining for Selects
```typescript
// ❌ WRONG
expect(mockPrisma.character.findMany).toHaveBeenCalledWith({
  select: expect.objectContaining({
    id: true,
    firstName: true,
  }),
});

// ✅ CORRECT
expect(mockPrisma.character.findMany).toHaveBeenCalledWith({
  select: expect.anything(),
});
```

### Reason: Prisma select objects have complex nested structure. The service logic matters, not the exact select shape.

## Test Coverage Goals

- **Backend**: >80% coverage on services
- **Frontend**: >70% coverage on components
- **Critical paths**: 100% coverage (auth, payments)

## Running Tests

### Backend
```bash
cd backend
npm test                    # All tests
npm test -- character       # Specific file
npm test -- --coverage      # With coverage
```

### Frontend
```bash
cd frontend
npm test                    # All tests
npm run test:ui             # UI mode
```

## Database Migrations Before Testing

**CRITICAL**: Always run migrations before testing

```bash
cd backend
npx prisma migrate deploy
npm test
```

Tests fail if schema doesn't match migrations.
```

---

### 5. charhub-nestjs-patterns

**Purpose**: NestJS-specific patterns and conventions

```yaml
---
name: charhub-nestjs-patterns
description: NestJS framework patterns for CharHub backend. Use when implementing modules, controllers, services, or middleware.
---

# CharHub NestJS Patterns

## Module Structure

### Standard Module Organization
```
backend/src/features/character/
├── character.module.ts
├── character.controller.ts
├── character.service.ts
├── character.dto.ts
└── character.spec.ts
```

### Module Definition
```typescript
@Module({
  controllers: [CharacterController],
  providers: [CharacterService],
  exports: [CharacterService],
  imports: [PrismaModule],
})
export class CharacterModule {}
```

## Controller Patterns

### Route Naming (kebab-case)
```typescript
@Controller('user-settings')  // ✅ GOOD
@Controller('userSettings')    // ❌ BAD
export class UserSettingsController {}
```

### Dependency Injection
```typescript
@Controller('characters')
export class CharacterController {
  constructor(
    private readonly characterService: CharacterService,
    private readonly logger: LoggerService,
  ) {}

  @Get()
  findAll() {
    return this.characterService.findAll();
  }
}
```

## Service Patterns

### Error Handling
```typescript
@Injectable()
export class CharacterService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
  ) {}

  async findById(id: string) {
    try {
      const character = await this.prisma.character.findUnique({
        where: { id },
      });

      if (!character) {
        throw new NotFoundException(`Character ${id} not found`);
      }

      return character;
    } catch (error) {
      this.logger.error({ id, error }, 'Failed to find character');
      throw error;
    }
  }
}
```

## DTO Patterns

### Validation with class-validator
```typescript
import { IsString, MinLength, IsEnum } from 'class-validator';

export class CreateCharacterDto {
  @IsString()
  @MinLength(1)
  firstName: string;

  @IsString()
  @MinLength(1)
  lastName: string;

  @IsEnum(['BASIC', 'PREMIUM', 'BOT'])
  type: CharacterType;
}
```

### Zod Validation (Preferred for new endpoints)
```typescript
import { z } from 'zod';

export const createCharacterSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  type: z.enum(['BASIC', 'PREMIUM', 'BOT']),
});
```

## Guards and Decorators

### Custom Guards
```typescript
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser;
    return user?.role === 'ADMIN';
  }
}

@UseGuards(AdminGuard)
@Post()
create() {
  // Only admins can access
}
```

## Middleware

### Logging Middleware
```typescript
@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const startTime = Date.now();
    next();
    const duration = Date.now() - startTime;
    // Log request duration
  }
}
```

## Configuration

### ConfigService Pattern
```typescript
@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getApiKey() {
    return this.configService.get<string>('API_KEY');
  }
}
```

## Best Practices

- ✅ Use constructor injection for dependencies
- ✅ Handle errors in services, not controllers
- ✅ Use DTOs for input validation
- ✅ Log with structured data
- ✅ Throw appropriate NestJS exceptions
- ❌ Don't use `@Res()` unless necessary
- ❌ Don't mix business logic in controllers
```

---

## Updated Subagent Configuration

### backend-developer

```yaml
---
name: backend-developer
description: Backend development specialist for CharHub. Implements NestJS APIs, database changes, and services. Use for all backend feature implementation.
tools: Read, Write, Edit, Glob, Grep, Bash
model: inherit
skills:
  - charhub-api-conventions
  - charhub-nestjs-patterns
  - charhub-i18n-system
---

You are a backend development specialist for CharHub.

## Your Expertise

- NestJS framework patterns and conventions
- Prisma ORM and database operations
- API endpoint implementation
- Service layer architecture
- Error handling and logging

## When You're Used

- Implementing new API endpoints
- Adding database fields or migrations
- Creating or modifying services
- Backend TypeScript development

## Your Workflow

1. Read the feature spec completely
2. Understand existing patterns in codebase
3. Implement following CharHub conventions
4. Run `npm run lint:backend`
5. Run `npm run build:backend`
6. Create/update tests as needed

## Critical Rules

- ALWAYS use kebab-case for route paths
- ALL user-facing text must use i18n (future: apiT())
- Use Zod for input validation
- Never use `any` types - define interfaces
- Log with structured data: `logger.info({ id }, 'Message')`
- Run migrations before testing

## Reference

See preloaded skills for detailed conventions.
```

### frontend-specialist

```yaml
---
name: frontend-specialist
description: Frontend development specialist for CharHub Vue 3 application. Implements components, i18n translations, and UI features. Use for all frontend feature implementation.
tools: Read, Write, Edit, Glob, Grep, Bash
model: inherit
skills:
  - charhub-frontend-patterns
  - charhub-i18n-system
---

You are a frontend development specialist for CharHub.

## Your Expertise

- Vue 3 Composition API and script setup
- TypeScript for components
- i18n translation implementation
- Responsive UI design
- Component library usage

## When You're Used

- Creating or modifying Vue components
- Adding i18n translations
- Implementing UI features
- Frontend TypeScript development

## Your Workflow

1. Read the feature spec completely
2. Understand existing component patterns
3. Implement following CharHub conventions
4. Add translations to BOTH en-US.json and pt-BR.json
5. Run `npm run translations:compile`
6. Run `npm run lint:frontend`
7. Run `npm run build:frontend`

## Critical Rules

- ALL user-facing text MUST use i18n keys (no hardcoded strings)
- Use script setup with TypeScript
- Define interfaces for props and data
- Use composables for shared logic
- Follow kebab-case for routes

## Reference

See preloaded skills for detailed conventions.
```

### test-writer

```yaml
---
name: test-writer
description: Test creation specialist for CharHub. Writes unit, integration, and E2E tests following CharHub testing patterns. Use proactively after feature implementation or when test coverage is low.
tools: Read, Write, Edit, Glob, Grep, Bash
model: inherit
skills:
  - charhub-testing-patterns
  - charhub-nestjs-patterns
  - charhub-frontend-patterns
---

You are a test creation specialist for CharHub.

## Your Expertise

- Unit test creation (Jest, Vitest)
- Integration test creation
- E2E test patterns
- Test coverage analysis
- Prisma mocking

## When You're Used

- Writing tests for new features
- Improving test coverage
- Creating test suites for components/services

## Your Workflow

1. Understand what needs testing
2. Determine test type (unit/integration/e2e)
3. Write tests following CharHub patterns
4. Run tests to verify they pass
5. Check coverage if needed

## Critical Rules

- Run migrations before backend tests
- Don't use expect.objectContaining for Prisma selects
- Mock external dependencies
- Test both success and error cases
- Aim for >80% backend, >70% frontend coverage

## Reference

See preloaded skills for detailed testing patterns.
```

---

## Migration Plan

### Phase 1: Create Skills Foundation

1. Create `.claude/skills/` directory structure
2. Implement core skills:
   - `charhub-api-conventions`
   - `charhub-frontend-patterns`
   - `charhub-i18n-system`
   - `charhub-testing-patterns`
   - `charhub-nestjs-patterns`

### Phase 2: Update Subagent Definitions

1. Add `skills` field to existing subagents
2. Remove duplicated pattern documentation from subagent prompts
3. Reference skills for detailed conventions

### Phase 3: Validation

1. Test that subagents properly load skills
2. Verify consistent application of patterns
3. Iterate on skill descriptions for better discovery

---

## Benefits

| Benefit | Impact |
|---------|--------|
| **Single Source of Truth** | Patterns defined once in skills |
| **Automatic Consistency** | All subagents follow same conventions |
| **Easy Distribution** | Skills via git to entire team |
| **Reduced Duplication** | Remove duplicate docs from subagents |
| **Better Discovery** | Skills invoked automatically by context |
| **Team Scalability** | New team members get conventions via skills |

---

## File Structure After Refactor

```
charhub/
├── .claude/
│   ├── agents/
│   │   ├── backend-developer.md       (streamlined, references skills)
│   │   ├── frontend-specialist.md     (streamlined, references skills)
│   │   ├── test-writer.md             (streamlined, references skills)
│   │   └── ...other subagents
│   └── skills/
│       ├── charhub-api-conventions/
│       │   └── SKILL.md
│       ├── charhub-frontend-patterns/
│       │   └── SKILL.md
│       ├── charhub-i18n-system/
│       │   └── SKILL.md
│       ├── charhub-testing-patterns/
│       │   └── SKILL.md
│       └── charhub-nestjs-patterns/
│           └── SKILL.md
└── docs/
    └── agents/
        ├── sub-agents.md       (reference documentation)
        ├── skills.md           (reference documentation)
        └── charhub-application.md (this file)
```

---

## Next Steps

Awaiting user approval to proceed with:

1. **Phase 1**: Create the 5 core skills in `.claude/skills/`
2. **Phase 2**: Update existing subagent definitions to use skills
3. **Phase 3**: Remove duplicated documentation from subagents
4. **Phase 4**: Test and validate the new architecture

---

## Sources

- [Claude Code Docs - Subagents](https://code.claude.com/docs/en/sub-agents)
- [Claude Code Docs - Skills](https://code.claude.com/docs/pt/skills)
- CharHub existing agent documentation in `docs/agents/coder/`
