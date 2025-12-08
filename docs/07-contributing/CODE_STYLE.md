# Code Style Guide

**Last Updated**: 2025-12-08
**Applies to**: All contributors

---

## 📋 Overview

This guide defines code style standards for CharHub. Following these standards ensures:

- **Consistency** across the codebase
- **Readability** for all team members
- **Maintainability** for long-term development
- **Quality** through best practices

---

## 🎯 General Principles

### 1. Clarity Over Cleverness

```typescript
// ✅ Good - Clear and explicit
function calculateUserCredits(userId: string, actionType: string): number {
  const costMap = {
    'CHAT_MESSAGE': 1,
    'IMAGE_GENERATION': 10,
    'STORY_GENERATION': 5
  };
  return costMap[actionType] || 0;
}

// ❌ Bad - Too clever, hard to understand
const cc = (u: string, a: string) => ({CM:1,IG:10,SG:5})[a]||0;
```

### 2. Consistency

Follow existing patterns in the codebase. If you see a pattern used consistently, follow it.

### 3. DRY (Don't Repeat Yourself)

Extract repeated code into reusable functions:

```typescript
// ✅ Good - Reusable function
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);
}

const price1 = formatCurrency(100);
const price2 = formatCurrency(200);

// ❌ Bad - Repeated code
const price1 = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
}).format(100);

const price2 = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
}).format(200);
```

### 4. YAGNI (You Aren't Gonna Need It)

Don't add functionality until it's needed:

```typescript
// ✅ Good - Only what's needed now
interface User {
  id: string;
  name: string;
  email: string;
}

// ❌ Bad - Premature abstraction
interface User {
  id: string;
  name: string;
  email: string;
  preferences?: UserPreferences;  // Not needed yet
  settings?: UserSettings;        // Not needed yet
  metadata?: Record<string, any>; // Speculative
}
```

---

## 📝 TypeScript Standards

### Strict Mode

**Always use TypeScript strict mode:**

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

### Type Annotations

```typescript
// ✅ Good - Explicit types
function getUserById(userId: string): Promise<User> {
  return db.user.findUnique({ where: { id: userId } });
}

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

// ❌ Bad - Implicit any
function getUser(id) {
  return db.user.findUnique({ where: { id } });
}
```

### Avoid `any`

```typescript
// ✅ Good - Proper typing
interface ApiResponse<T> {
  data: T;
  error?: string;
}

async function fetchUser(id: string): Promise<ApiResponse<User>> {
  // Implementation
}

// ❌ Bad - Using any
async function fetchUser(id: string): Promise<any> {
  // Implementation
}
```

### Use `unknown` for Unknown Types

```typescript
// ✅ Good - Use unknown and narrow type
function processData(data: unknown): void {
  if (typeof data === 'string') {
    console.log(data.toUpperCase());
  } else if (typeof data === 'number') {
    console.log(data.toFixed(2));
  }
}

// ❌ Bad - Using any
function processData(data: any): void {
  console.log(data.toUpperCase()); // No type safety
}
```

### Prefer Interfaces Over Types

```typescript
// ✅ Good - Interface for object shapes
interface User {
  id: string;
  name: string;
  email: string;
}

// ✅ Good - Type for unions, aliases
type UserRole = 'admin' | 'user' | 'guest';
type UserId = string;

// ⚠️ Acceptable but prefer interface
type User = {
  id: string;
  name: string;
  email: string;
};
```

### Enums vs Union Types

```typescript
// ✅ Good - Union type for simple cases
type NotificationType = 'EMAIL' | 'SMS' | 'PUSH';

// ✅ Good - Const enum for values that won't change
const enum CreditTransactionType {
  DEDUCTION = 'DEDUCTION',
  ADDITION = 'ADDITION'
}

// ❌ Bad - Regular enum (generates extra code)
enum Status {
  Active,
  Inactive
}
```

---

## ⚛️ React Standards

### Functional Components Only

```typescript
// ✅ Good - Functional component
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ label, onClick, disabled = false }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

// ❌ Bad - Class component
export class Button extends React.Component<ButtonProps> {
  render() {
    return <button onClick={this.props.onClick}>{this.props.label}</button>;
  }
}
```

### Props Interface

```typescript
// ✅ Good - Explicit interface
interface UserCardProps {
  user: User;
  onEdit: (userId: string) => void;
  showAvatar?: boolean;
}

export function UserCard({ user, onEdit, showAvatar = true }: UserCardProps) {
  // Implementation
}

// ❌ Bad - Inline props
export function UserCard(props: { user: any; onEdit: any; showAvatar: any }) {
  // Implementation
}
```

### Hooks Usage

```typescript
// ✅ Good - Proper hook usage
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const data = await fetchUser(userId);
      setUser(data);
      setLoading(false);
    }
    loadUser();
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return <div>{user.name}</div>;
}

// ❌ Bad - Missing types, dependencies
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser(userId).then(setUser);
  }); // Missing dependency array

  return <div>{user?.name}</div>;
}
```

### Component File Structure

```typescript
// ComponentName.tsx

// 1. Imports
import { useState, useEffect } from 'react';
import { User } from '@/types';
import { fetchUser } from '@/services/userService';

// 2. Types/Interfaces
interface UserProfileProps {
  userId: string;
}

// 3. Component
export function UserProfile({ userId }: UserProfileProps) {
  // 3.1 State
  const [user, setUser] = useState<User | null>(null);

  // 3.2 Effects
  useEffect(() => {
    // Effect logic
  }, [userId]);

  // 3.3 Event handlers
  const handleEdit = () => {
    // Handler logic
  };

  // 3.4 Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}

// 4. Helpers (if needed)
function formatUserName(name: string): string {
  return name.toUpperCase();
}
```

### Conditional Rendering

```typescript
// ✅ Good - Clear conditional rendering
function UserStatus({ user }: { user: User }) {
  if (!user.isActive) {
    return <div>User is inactive</div>;
  }

  if (user.isPremium) {
    return <div>Premium User</div>;
  }

  return <div>Regular User</div>;
}

// ⚠️ Acceptable - Ternary for simple cases
function UserBadge({ isPremium }: { isPremium: boolean }) {
  return (
    <span className={isPremium ? 'badge-premium' : 'badge-regular'}>
      {isPremium ? 'Premium' : 'Free'}
    </span>
  );
}

// ❌ Bad - Nested ternaries
function UserBadge({ user }: { user: User }) {
  return (
    <span>
      {user.isPremium
        ? user.isActive
          ? 'Active Premium'
          : 'Inactive Premium'
        : user.isActive
          ? 'Active Free'
          : 'Inactive Free'}
    </span>
  );
}
```

---

## 🎨 Styling Standards

### Tailwind CSS

```typescript
// ✅ Good - Utility classes
<button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
  Click me
</button>

// ✅ Good - Conditional classes
<div className={`
  px-4 py-2 rounded
  ${isPrimary ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}
  ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}
`}>
  Content
</div>

// ❌ Bad - Inline styles (avoid unless dynamic)
<button style={{ padding: '8px 16px', backgroundColor: '#3b82f6' }}>
  Click me
</button>
```

### Class Name Organization

```typescript
// ✅ Good - Grouped by category
<div className="
  /* Layout */
  flex items-center justify-between
  /* Spacing */
  px-4 py-2 gap-2
  /* Colors */
  bg-white text-gray-800
  /* Border */
  border border-gray-200 rounded-lg
  /* Effects */
  shadow-sm hover:shadow-md
">
  Content
</div>
```

---

## 🔧 Backend Standards (Node.js/Express)

### Route Handlers

```typescript
// ✅ Good - Async handler with error handling
export const getUserById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await userService.findById(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ data: user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ❌ Bad - No error handling, no types
export const getUserById = async (req, res) => {
  const user = await db.user.findUnique({
    where: { id: req.params.userId }
  });
  res.json(user);
};
```

### Service Layer

```typescript
// ✅ Good - Separation of concerns
// userService.ts
export class UserService {
  async findById(userId: string): Promise<User | null> {
    return await db.user.findUnique({
      where: { id: userId }
    });
  }

  async create(data: CreateUserInput): Promise<User> {
    return await db.user.create({ data });
  }
}

// routes/users.ts
const userService = new UserService();

router.get('/:userId', async (req, res) => {
  const user = await userService.findById(req.params.userId);
  // Handle response
});
```

### Input Validation

```typescript
// ✅ Good - Zod validation
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  age: z.number().min(18, 'Must be 18+').optional()
});

type CreateUserInput = z.infer<typeof createUserSchema>;

export const createUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const validatedData = createUserSchema.parse(req.body);
    const user = await userService.create(validatedData);
    res.status(201).json({ data: user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
      return;
    }
    throw error;
  }
};
```

---

## 📦 File Organization

### Naming Conventions

```
// Files
userService.ts           ✅ camelCase for files
UserProfile.tsx          ✅ PascalCase for React components
user-utils.ts            ✅ kebab-case acceptable
user_utils.ts            ❌ Avoid snake_case

// Folders
src/services/            ✅ lowercase
src/components/          ✅ lowercase
src/utils/               ✅ lowercase
```

### Import Order

```typescript
// ✅ Good - Organized imports
// 1. External libraries
import { useState, useEffect } from 'react';
import { z } from 'zod';

// 2. Internal modules (absolute imports)
import { User } from '@/types';
import { userService } from '@/services/userService';
import { formatDate } from '@/utils/dateUtils';

// 3. Relative imports
import { UserCard } from './UserCard';
import styles from './UserProfile.module.css';

// ❌ Bad - Mixed imports
import { UserCard } from './UserCard';
import { useState } from 'react';
import { User } from '@/types';
```

---

## 🧪 Testing Standards

### Test File Naming

```
userService.ts           → userService.test.ts
UserProfile.tsx          → UserProfile.test.tsx
```

### Test Structure

```typescript
// ✅ Good - Descriptive test structure
describe('UserService', () => {
  describe('findById', () => {
    it('should return user when found', async () => {
      const user = await userService.findById('user_123');
      expect(user).toBeDefined();
      expect(user?.id).toBe('user_123');
    });

    it('should return null when user not found', async () => {
      const user = await userService.findById('nonexistent');
      expect(user).toBeNull();
    });
  });

  describe('create', () => {
    it('should create user with valid data', async () => {
      const userData = { name: 'Test', email: 'test@example.com' };
      const user = await userService.create(userData);

      expect(user.id).toBeDefined();
      expect(user.name).toBe('Test');
    });
  });
});
```

---

## 💬 Comments and Documentation

### When to Comment

```typescript
// ✅ Good - Complex logic explained
/**
 * Calculates credit cost using sliding window algorithm
 * to prevent burst usage and ensure fair resource allocation.
 */
function calculateDynamicCost(usage: number[], window: number): number {
  // Implementation
}

// ✅ Good - Non-obvious business rule
// Users with premium subscription get 2x credits
const creditsToAdd = baseCreditAmount * (user.isPremium ? 2 : 1);

// ❌ Bad - Obvious comment
// Set name to user name
const name = user.name;

// ❌ Bad - Commented code (delete instead)
// const oldFunction = () => {
//   // old implementation
// };
```

### JSDoc for Public APIs

```typescript
/**
 * Retrieves a user by their unique identifier.
 *
 * @param userId - The unique user identifier
 * @returns The user object if found, null otherwise
 * @throws {DatabaseError} If database connection fails
 *
 * @example
 * ```typescript
 * const user = await getUserById('user_123');
 * if (user) {
 *   console.log(user.name);
 * }
 * ```
 */
export async function getUserById(userId: string): Promise<User | null> {
  // Implementation
}
```

---

## 🚫 Common Anti-Patterns to Avoid

### 1. God Objects

```typescript
// ❌ Bad - Too many responsibilities
class UserManager {
  createUser() {}
  deleteUser() {}
  sendEmail() {}
  validatePassword() {}
  generateReport() {}
  processPayment() {}
}

// ✅ Good - Single responsibility
class UserService {
  createUser() {}
  deleteUser() {}
}

class EmailService {
  sendEmail() {}
}

class PaymentService {
  processPayment() {}
}
```

### 2. Nested Callbacks

```typescript
// ❌ Bad - Callback hell
getData((data) => {
  processData(data, (processed) => {
    saveData(processed, (result) => {
      console.log('Done');
    });
  });
});

// ✅ Good - Async/await
async function handleData() {
  const data = await getData();
  const processed = await processData(data);
  const result = await saveData(processed);
  console.log('Done');
}
```

### 3. Magic Numbers

```typescript
// ❌ Bad - Magic numbers
if (user.creditBalance < 10) {
  showLowBalanceWarning();
}

// ✅ Good - Named constants
const MIN_CREDIT_BALANCE_THRESHOLD = 10;

if (user.creditBalance < MIN_CREDIT_BALANCE_THRESHOLD) {
  showLowBalanceWarning();
}
```

---

## 🔗 Related Documents

- [Git Workflow](./GIT_WORKFLOW.md) - Branch strategy and commits
- [Documentation Standards](./DOCUMENTATION_STANDARDS.md) - How to write docs
- [Testing Guidelines](./README.md#testing-guidelines) - How to write tests
- [Contributing Guide](./README.md) - Main contribution guide

---

[← Back to Contributing Guide](./README.md) | [← Back to Documentation Home](../README.md)
