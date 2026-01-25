---
name: charhub-react-component-patterns
description: React component patterns and conventions for CharHub. Use when creating React components, defining props, or structuring component files.
---

# CharHub React Component Patterns

## Purpose

Define React component structure, naming conventions, and best practices for CharHub frontend development.

## Component File Structure

```typescript
// CharacterCard.tsx
// 1. Imports
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// 2. Types
interface CharacterCardProps {
  character: Character;
  showActions?: boolean;
  onEdit?: (character: Character) => void;
  onDelete?: (id: string) => void;
}

// 3. Component
export function CharacterCard({
  character,
  showActions = true,
  onEdit,
  onDelete,
}: CharacterCardProps) {
  // Hooks
  const { t } = useTranslation();

  // Handlers
  const handleEdit = useCallback(() => {
    onEdit?.(character);
  }, [character, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete?.(character.id);
  }, [character.id, onDelete]);

  // Render
  return (
    <div className="character-card">
      {/* JSX */}
    </div>
  );
}
```

## Component Naming

### File Naming

```
✅ GOOD                          ❌ BAD
CharacterCard.tsx               characterCard.tsx
UserSettings.tsx                user-settings.tsx
UserProfile.tsx                 userprofile.tsx
CharacterList.tsx               Characterlist.tsx
```

### Component Naming

```typescript
// ✅ GOOD - PascalCase for components
export function CharacterCard() {}
export function UserSettings() {}
export function UserProfile() {}

// ❌ BAD - camelCase or other
export function characterCard() {}
export function user_settings() {}
```

## Props Definition

### Type Props

```typescript
// ✅ GOOD - Interface for props
interface CharacterCardProps {
  // Required prop
  character: Character;

  // Optional prop with default
  showActions?: boolean;

  // Enum prop
  variant: 'primary' | 'secondary' | 'danger';

  // Union type
  status: 'loading' | 'success' | 'error';

  // Complex type
  user: User | null;

  // Function props
  onEdit?: (character: Character) => void;
  onDelete?: (id: string) => void;
}

// Use with defaults via destructuring
export function CharacterCard({
  character,
  showActions = true,
  variant = 'primary',
  onEdit,
  onDelete,
}: CharacterCardProps) {
  // ...
}
```

### Props Best Practices

| Do | Don't |
|-----|--------|
| Use interfaces for props | Use inline prop types |
| Document complex props | Leave props undocumented |
| Make optional props clear with `?` | Use `\|` union for null/undefined |
| Use descriptive prop names | Use generic names (data, item) |
| Type function props | Skip function typing |

## Children Prop

### Using children

```typescript
// ✅ GOOD - children prop
interface CardProps {
  title: string;
  children: ReactNode;
}

export function Card({ title, children }: CardProps) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div className="content">{children}</div>
    </div>
  );
}

// Usage
<Card title="My Card">
  <p>Card content goes here</p>
</Card>
```

### Render Props

```typescript
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
}

export function List<T>({ items, renderItem }: ListProps<T>) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>{renderItem(item, index)}</li>
      ))}
    </ul>
  );
}

// Usage
<List
  items={characters}
  renderItem={(character, index) => (
    <span>{index}: {character.name}</span>
  )}
/>
```

## Event Handlers

### Naming Convention

```typescript
// ✅ GOOD - handle prefix for event handlers
function CharacterCard() {
  const handleClick = () => {};
  const handleSubmit = () => {};
  const handleInputChange = () => {};
  const handleDelete = (id: string) => {};

  return <button onClick={handleClick}>Click</button>;
}

// ❌ BAD - Generic names
function CharacterCard() {
  const click = () => {};
  const submit = () => {};
  const onChange = () => {};
}
```

### useCallback for Handlers

```typescript
function CharacterCard({ character, onEdit }: CharacterCardProps) {
  // ✅ GOOD - Memoize handlers passed as props
  const handleEdit = useCallback(() => {
    onEdit?.(character);
  }, [character, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete?.(character.id);
  }, [character.id, onDelete]);

  return (
    <div>
      <button onClick={handleEdit}>Edit</button>
      <button onClick={handleDelete}>Delete</button>
    </div>
  );
}
```

## Conditional Rendering

### Ternary Operator

```typescript
// ✅ GOOD - Simple conditions
{isLoading ? <Spinner /> : <DataView />}

{user ? <UserProfile user={user} /> : <LoginForm />}

{isActive && <ActiveContent />}
```

### Early Returns

```typescript
function CharacterDetail({ id }: { id: string }) {
  const { data: character, isLoading, error } = useCharacterDetail(id);

  // ✅ GOOD - Early returns for clarity
  if (isLoading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  if (!character) {
    return <NotFound />;
  }

  return <CharacterProfile character={character} />;
}
```

## Lists and Keys

### Mapping with Keys

```typescript
// ✅ GOOD - Always use keys with unique IDs
function CharacterList({ characters }: { characters: Character[] }) {
  return (
    <ul>
      {characters.map(character => (
        <CharacterCard
          key={character.id}  // Use unique ID
          character={character}
        />
      ))}
    </ul>
  );
}

// ❌ BAD - Using index as key (if list can change)
{items.map((item, index) => (
  <li key={index}>{item.name}</li>
))}
```

### Key Best Practices

| Use | Don't Use |
|-----|-----------|
| Unique IDs from data | Random indexes |
| Stable identifiers | Array indexes (if list changes) |
| Composite keys for duplicates | Random values |

## Component Composition

### Component Building Blocks

```typescript
// Small, focused components
export function Avatar({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} className="avatar" />;
}

export function Badge({ count }: { count: number }) {
  return <span className="badge">{count}</span>;
}

// Compose into larger component
export function CharacterCard({ character }: { character: Character }) {
  return (
    <div className="character-card">
      <Avatar src={character.avatarUrl} alt={character.name} />
      <h3>{character.name}</h3>
      <Badge count={character.stats?.level || 0} />
    </div>
  );
}
```

## Fragment Pattern

```typescript
// ✅ GOOD - Use Fragment for multiple elements
function CharacterCard() {
  return (
    <>
      <h3>Name</h3>
      <p>Description</p>
    </>
  );
}

// ✅ GOOD - Shorthand Fragment
function CharacterCard() {
  return (
    <>
      <h3>Name</h3>
      <p>Description</p>
    </>
  );
}
```

## Portals

```typescript
import { createPortal } from 'react-dom';

export function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
}
```

## Error Boundaries

```typescript
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorMessage />;
    }

    return this.props.children;
  }
}

// Usage
<ErrorBoundary fallback={<ErrorFallback />}>
  <CharacterCard character={character} />
</ErrorBoundary>
```

## Styling Patterns

### CSS Classes

```typescript
// ✅ GOOD - Use className prop
export function CharacterCard({ variant = 'primary' }: Props) {
  return (
    <div className={`character-card character-card--${variant}`}>
      {/* Content */}
    </div>
  );
}

// ✅ GOOD - Conditional classes with clsx or classnames
import clsx from 'clsx';

export function CharacterCard({ isActive }: Props) {
  return (
    <div className={clsx(
      'character-card',
      isActive && 'character-card--active'
    )}>
      {/* Content */}
    </div>
  );
}
```

### Tailwind CSS

```typescript
// ✅ GOOD - Tailwind utility classes
export function Button({ variant = 'primary' }: Props) {
  return (
    <button className={`
      px-4 py-2 rounded font-medium
      ${variant === 'primary' ? 'bg-blue-500 text-white' : 'bg-gray-200'}
    `}>
      {children}
    </button>
  );
}
```

## Component Size Guidelines

| Component Type | Suggested Size | When to Split |
|----------------|----------------|---------------|
| Atomic/small | < 150 lines | Single responsibility |
| Medium | 150-300 lines | 2-3 related features |
| Large | 300-500 lines | Consider splitting |
| Too large | > 500 lines | Split into smaller components |

## Best Practices

### DO

✅ Use functional components
✅ Type all props with interfaces
✅ Use PascalCase for components
✅ Use `handle` prefix for event handlers
✅ Use unique keys with lists
✅ Keep components focused
✅ Use i18n for user-facing text
✅ Handle loading/error states
✅ Use React.memo appropriately

### DON'T

❌ Use class components (unless needed)
❌ Skip prop typing
❌ Use camelCase for components
❌ Use generic event handler names
❌ Forget keys with lists
❌ Create overly complex components
❌ Hardcode user-facing strings
❌ Mix multiple responsibilities

## Documentation

Every component should have a corresponding `.docs.md` file. See `charhub-documentation-patterns` for template.

## Related Skills

- `charhub-react-patterns` - React hooks and patterns
- `charhub-i18n-system` - i18n with react-i18next
- `charhub-typescript-standards` - TypeScript patterns
- `charhub-documentation-patterns` - Component documentation
