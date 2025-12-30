# Code Quality Standards

**Reference guide** for coding standards and best practices

**When to use**: Throughout implementation, review before creating PR

---

## 📋 Quick Standards Summary

### TypeScript
- ✅ No `any` types
- ✅ Export interfaces for reuse
- ✅ Strict mode enabled
- ✅ Explicit return types

### i18n (Internationalization)
- ✅ ALL frontend text uses translation keys
- ✅ No hardcoded user-facing strings
- ✅ Keys in English, descriptive naming

### API Design
- ✅ RESTful conventions
- ✅ Input validation with Zod
- ✅ Proper error handling
- ✅ Consistent response format

### Frontend
- ✅ Follow existing component patterns
- ✅ Tailwind CSS for styling
- ✅ TanStack Query for API calls
- ✅ Proper loading and error states

---

## 🔷 TypeScript Standards

### 1. No `any` Types

**❌ Bad:**
```typescript
function processData(data: any) {
  return data.map((item: any) => item.name);
}
```

**✅ Good:**
```typescript
interface DataItem {
  name: string;
  id: number;
}

function processData(data: DataItem[]): string[] {
  return data.map(item => item.name);
}
```

**Why**: `any` defeats TypeScript's type safety. Always define explicit types.

---

### 2. Export Interfaces for Reuse

**❌ Bad:**
```typescript
// backend/src/routes/characters.ts
function createCharacter(req: Request, res: Response) {
  const data = req.body; // Implicit any
  // ...
}
```

**✅ Good:**
```typescript
// backend/src/types/character.ts
export interface CreateCharacterRequest {
  name: string;
  description: string;
  visibility: 'public' | 'private';
}

// backend/src/routes/characters.ts
import { CreateCharacterRequest } from '../types/character';

function createCharacter(
  req: Request<{}, {}, CreateCharacterRequest>,
  res: Response
) {
  const { name, description, visibility } = req.body;
  // TypeScript knows the types!
}
```

**Why**: Shared types ensure consistency between backend and frontend.

---

### 3. Strict Mode Enabled

**tsconfig.json should have:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**This catches common errors:**
- Uninitialized variables
- Null/undefined misuse
- Implicit any types
- Missing return statements

---

### 4. Explicit Return Types

**❌ Bad:**
```typescript
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

**✅ Good:**
```typescript
interface Item {
  price: number;
}

function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

**Why**: Makes function contracts clear, prevents accidental type changes.

---

## 🌍 i18n (Internationalization) Standards

### 1. ALL Frontend Text Uses Translation Keys

**❌ Bad (Hardcoded):**
```tsx
function LoginButton() {
  return <button>Login</button>;
}

function ErrorMessage() {
  return <div>Something went wrong. Please try again.</div>;
}
```

**✅ Good (i18n):**
```tsx
import { useTranslation } from 'react-i18next';

function LoginButton() {
  const { t } = useTranslation('auth');
  return <button>{t('login_button')}</button>;
}

function ErrorMessage() {
  const { t } = useTranslation('common');
  return <div>{t('errors.generic')}</div>;
}
```

**Translation files:**
```json
// frontend/public/locales/en/auth.json
{
  "login_button": "Login"
}

// frontend/public/locales/en/common.json
{
  "errors": {
    "generic": "Something went wrong. Please try again."
  }
}
```

---

### 2. No Hardcoded User-Facing Strings

**What needs translation:**
- ✅ Button labels
- ✅ Page titles
- ✅ Error messages
- ✅ Success notifications
- ✅ Form labels and placeholders
- ✅ Tooltips and help text
- ✅ Menu items
- ✅ Modal titles and content

**What doesn't need translation:**
- ❌ API endpoints (`/api/v1/characters`)
- ❌ Log messages (backend console)
- ❌ Environment variable names
- ❌ Database column names
- ❌ HTML classes/IDs

---

### 3. Descriptive Translation Key Naming

**❌ Bad keys:**
```json
{
  "btn1": "Save",
  "msg": "Success",
  "text": "Click here"
}
```

**✅ Good keys:**
```json
{
  "save_button": "Save",
  "success_message": "Changes saved successfully",
  "learn_more_link": "Click here to learn more"
}
```

**Naming conventions:**
- Use snake_case
- Be descriptive: `delete_character_confirmation` not `confirm`
- Group related keys: `errors.not_found`, `errors.unauthorized`
- Action + context: `save_character_button`, `edit_profile_link`

---

### 4. Namespace Organization

**File structure:**
```
frontend/public/locales/en/
├── common.json          # Shared UI elements (buttons, errors)
├── auth.json            # Authentication/registration
├── dashboard.json       # Dashboard-specific
├── characters.json      # Character management
└── profile.json         # User profile
```

**Usage:**
```tsx
const { t } = useTranslation('characters');
// Looks in frontend/public/locales/en/characters.json
```

---

## 🌐 API Design Standards

### 1. RESTful Conventions

**Resource-based URLs:**
```
✅ GET    /api/v1/characters           (List characters)
✅ POST   /api/v1/characters           (Create character)
✅ GET    /api/v1/characters/:id       (Get character)
✅ PUT    /api/v1/characters/:id       (Update character)
✅ DELETE /api/v1/characters/:id       (Delete character)

❌ GET    /api/v1/getCharacters
❌ POST   /api/v1/createCharacter
❌ GET    /api/v1/character/get/:id
```

**HTTP methods:**
- `GET` - Retrieve data (idempotent, no side effects)
- `POST` - Create new resource
- `PUT` - Update entire resource
- `PATCH` - Partial update
- `DELETE` - Remove resource

**Status codes:**
- `200` - Success (GET, PUT, PATCH)
- `201` - Created (POST)
- `204` - No Content (DELETE)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (authenticated but no permission)
- `404` - Not Found
- `500` - Internal Server Error

---

### 2. Input Validation with Zod

**❌ Bad (No validation):**
```typescript
app.post('/api/v1/characters', async (req, res) => {
  const { name, description } = req.body;
  // What if name is missing? What if it's 10000 characters?
  const character = await createCharacter(name, description);
  res.json(character);
});
```

**✅ Good (Zod validation):**
```typescript
import { z } from 'zod';

const createCharacterSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(10).max(5000),
  visibility: z.enum(['public', 'private']).default('private'),
});

app.post('/api/v1/characters', async (req, res) => {
  try {
    const data = createCharacterSchema.parse(req.body);
    const character = await createCharacter(data);
    res.status(201).json(character);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }
    throw error;
  }
});
```

**Common Zod patterns:**
```typescript
// String validation
z.string().min(1).max(255)
z.string().email()
z.string().url()
z.string().uuid()

// Number validation
z.number().int().positive()
z.number().min(0).max(100)

// Enums
z.enum(['draft', 'published', 'archived'])

// Arrays
z.array(z.string())
z.array(characterSchema).min(1).max(50)

// Objects
z.object({
  name: z.string(),
  age: z.number().optional(),
})

// Dates
z.date()
z.string().datetime()
```

---

### 3. Proper Error Handling

**❌ Bad (Exposes internals):**
```typescript
app.post('/api/v1/characters', async (req, res) => {
  const character = await db.character.create(req.body);
  res.json(character);
  // If error: sends raw Prisma error to client!
});
```

**✅ Good (Proper error handling):**
```typescript
import { handleAsync } from '../middleware/errorHandler';

app.post('/api/v1/characters', handleAsync(async (req, res) => {
  const data = createCharacterSchema.parse(req.body);

  const character = await db.character.create({
    data: {
      ...data,
      userId: req.user.id, // From auth middleware
    },
  });

  res.status(201).json({
    success: true,
    data: character,
  });
}));

// In errorHandler middleware:
export const handleAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const errorHandler = (err, req, res, next) => {
  console.error('API Error:', err);

  // Zod validation errors
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors,
    });
  }

  // Prisma errors (don't expose to client)
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Resource already exists',
    });
  }

  // Generic error
  res.status(500).json({
    error: 'Internal server error',
  });
};
```

---

### 4. Consistent Response Format

**✅ Success responses:**
```typescript
// Single resource
res.status(200).json({
  success: true,
  data: character,
});

// List of resources
res.status(200).json({
  success: true,
  data: characters,
  pagination: {
    page: 1,
    limit: 20,
    total: 150,
  },
});

// Creation
res.status(201).json({
  success: true,
  data: character,
  message: 'Character created successfully',
});
```

**✅ Error responses:**
```typescript
// Validation error
res.status(400).json({
  error: 'Validation failed',
  details: [
    { field: 'name', message: 'Name is required' },
    { field: 'description', message: 'Description too short' },
  ],
});

// Not found
res.status(404).json({
  error: 'Character not found',
});

// Unauthorized
res.status(401).json({
  error: 'Authentication required',
});
```

---

## ⚛️ Frontend Standards

### 1. Follow Existing Component Patterns

**Before creating a new component, check existing similar components:**

```bash
# Find similar components
find frontend/src/components -name "*.tsx" | grep -i "button"
find frontend/src/components -name "*.tsx" | grep -i "modal"
```

**Example: Button component pattern**
```tsx
// frontend/src/components/ui/Button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'rounded font-medium transition-colors',
          {
            'bg-blue-600 hover:bg-blue-700 text-white': variant === 'primary',
            'bg-gray-200 hover:bg-gray-300 text-gray-900': variant === 'secondary',
            'bg-red-600 hover:bg-red-700 text-white': variant === 'danger',
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2 text-base': size === 'md',
            'px-6 py-3 text-lg': size === 'lg',
            'opacity-50 cursor-not-allowed': loading,
          },
          className
        )}
        disabled={loading}
        {...props}
      >
        {loading ? 'Loading...' : children}
      </button>
    );
  }
);
```

---

### 2. Tailwind CSS for Styling

**✅ Use Tailwind utility classes:**
```tsx
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
  <h2 className="text-xl font-bold text-gray-900">Title</h2>
  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
    Action
  </button>
</div>
```

**❌ Don't use inline styles:**
```tsx
<div style={{ display: 'flex', padding: '16px', background: 'white' }}>
  <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Title</h2>
</div>
```

**Use `cn()` utility for conditional classes:**
```tsx
import { cn } from '@/lib/utils';

<button
  className={cn(
    'px-4 py-2 rounded',
    isActive && 'bg-blue-600 text-white',
    isDisabled && 'opacity-50 cursor-not-allowed'
  )}
>
  Click me
</button>
```

**Common Tailwind patterns:**
```tsx
// Layout
<div className="flex flex-col gap-4">           // Vertical stack
<div className="grid grid-cols-3 gap-4">        // Grid layout
<div className="flex items-center justify-between"> // Horizontal space-between

// Spacing
<div className="p-4">     // Padding all sides
<div className="px-4 py-2"> // Padding horizontal/vertical
<div className="mt-4 mb-8"> // Margin top/bottom

// Typography
<h1 className="text-3xl font-bold text-gray-900">
<p className="text-base text-gray-600">
<span className="text-sm font-medium text-blue-600">

// Colors
<div className="bg-white text-gray-900">        // Light mode
<div className="bg-gray-800 text-white">        // Dark elements
<button className="bg-blue-600 hover:bg-blue-700"> // Interactive

// Responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
<div className="hidden md:block">  // Show on medium+ screens
```

---

### 3. TanStack Query for API Calls

**✅ Good (TanStack Query):**
```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

function CharacterList() {
  const { t } = useTranslation('characters');
  const queryClient = useQueryClient();

  // Fetch data
  const { data, isLoading, error } = useQuery({
    queryKey: ['characters'],
    queryFn: async () => {
      const response = await fetch('/api/v1/characters');
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
  });

  // Mutation for creating character
  const createMutation = useMutation({
    mutationFn: async (newCharacter) => {
      const response = await fetch('/api/v1/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCharacter),
      });
      if (!response.ok) throw new Error('Failed to create');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      toast.success(t('character_created'));
    },
    onError: () => {
      toast.error(t('errors.create_failed'));
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data.map(character => (
        <div key={character.id}>{character.name}</div>
      ))}
    </div>
  );
}
```

**Why TanStack Query:**
- Automatic caching
- Background refetching
- Deduplication of requests
- Loading and error states
- Optimistic updates
- Automatic retry on failure

---

### 4. Proper Loading and Error States

**✅ Good (All states handled):**
```tsx
function CharacterDetail({ id }: { id: string }) {
  const { t } = useTranslation('characters');
  const { data, isLoading, error } = useQuery({
    queryKey: ['character', id],
    queryFn: () => fetchCharacter(id),
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-800">{t('errors.load_failed')}</p>
        <button onClick={() => refetch()}>{t('retry')}</button>
      </div>
    );
  }

  // Empty state
  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">{t('not_found')}</p>
      </div>
    );
  }

  // Success state
  return (
    <div>
      <h1>{data.name}</h1>
      <p>{data.description}</p>
    </div>
  );
}
```

**Loading states:**
- Use skeleton screens for better UX
- Show spinners for quick operations
- Disable buttons during mutations: `disabled={mutation.isPending}`

**Error states:**
- Display user-friendly messages (translated)
- Offer retry action when possible
- Log detailed errors to console for debugging

---

## 🚨 Common Mistakes to Avoid

### 1. TypeScript Mistakes

**❌ Using `any`:**
```typescript
const data: any = fetchData(); // Defeats type safety
```

**❌ Ignoring TypeScript errors:**
```typescript
// @ts-ignore
const value = data.unknownProperty;
```

**❌ Not typing function parameters:**
```typescript
function calculate(x, y) {  // Implicit any
  return x + y;
}
```

---

### 2. i18n Mistakes

**❌ Hardcoding text:**
```tsx
<button>Save Changes</button>  // Should use t('save_changes')
```

**❌ Concatenating translations:**
```tsx
{t('hello') + ' ' + userName}  // Use interpolation instead
{t('hello', { name: userName })}  // ✅
```

**❌ Using wrong namespace:**
```tsx
const { t } = useTranslation('common');
t('characters.edit_button');  // Won't work! Use 'characters' namespace
```

---

### 3. API Mistakes

**❌ Not validating input:**
```typescript
app.post('/api/v1/users', async (req, res) => {
  const user = await db.user.create(req.body);  // Dangerous!
});
```

**❌ Exposing internal errors:**
```typescript
} catch (error) {
  res.status(500).json({ error: error.message });  // May expose DB details!
}
```

**❌ Not using proper status codes:**
```typescript
res.json({ error: 'Not found' });  // Should be res.status(404).json(...)
```

---

### 4. Frontend Mistakes

**❌ Not handling loading states:**
```tsx
const { data } = useQuery({ queryKey: ['data'], queryFn: fetchData });
return <div>{data.name}</div>;  // Crashes if data is undefined!
```

**❌ Inline styles instead of Tailwind:**
```tsx
<div style={{ marginTop: '16px' }}>  // Use className="mt-4"
```

**❌ Not using translation hooks:**
```tsx
<button>Delete</button>  // Hardcoded!
```

---

## 📚 See Also

- **[feature-implementation.md](feature-implementation.md)** - Implementation workflow
- **[testing.md](testing.md)** - Testing procedures
- **[pr-creation.md](pr-creation.md)** - Creating Pull Requests
- **[../CLAUDE.md](../CLAUDE.md)** - Overall Agent Coder workflow
- **[../../03-reference/backend/README.md](../../03-reference/backend/README.md)** - Backend patterns
- **[../../03-reference/frontend/README.md](../../03-reference/frontend/README.md)** - Frontend patterns
- **[../../03-reference/backend/translation-system.md](../../03-reference/backend/translation-system.md)** - i18n details

---

**Remember**: Code quality is not optional. Follow these standards consistently! 💎
