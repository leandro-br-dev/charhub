---
name: charhub-react-patterns
description: React patterns and conventions for CharHub frontend. Use when implementing React components, hooks, or using React with TypeScript.
---

# CharHub React Patterns

## Purpose

Define React coding patterns, hooks usage, and conventions for CharHub frontend development with React 19 and TypeScript.

## Component Structure

### Functional Component Pattern

```typescript
// ✅ GOOD - Functional component with TypeScript
interface CharacterCardProps {
  character: Character;
  showActions?: boolean;
  onEdit?: (character: Character) => void;
  onDelete?: (id: string) => void;
}

export function CharacterCard({
  character,
  showActions = true,
  onEdit,
  onDelete,
}: CharacterCardProps) {
  // Component logic here
  return (
    <div className="character-card">
      {/* JSX */}
    </div>
  );
}
```

## Hooks Patterns

### useState with TypeScript

```typescript
// ✅ GOOD - Typed useState
const [count, setCount] = useState<number>(0);
const [user, setUser] = useState<User | null>(null);
const [items, setItems] = useState<string[]>([]);

// ✅ GOOD - useState with lazy initialization
const [state, setState] = useState(() => computeExpensiveValue());
```

### useEffect Patterns

```typescript
// ✅ GOOD - useEffect with dependencies
useEffect(() => {
  // Fetch data on mount
  fetchCharacter(characterId);
}, [characterId]); // Dependency array

// ✅ GOOD - Cleanup function
useEffect(() => {
  const subscription = subscribeToUpdates();
  return () => {
    subscription.unsubscribe();
  };
}, []);

// ✅ GOOD - Conditional effects
useEffect(() => {
  if (isActive) {
    startPolling();
  } else {
    stopPolling();
  }
}, [isActive]);
```

### Custom Hooks

```typescript
// hooks/useCharacterDetail.ts
export function useCharacterDetail(characterId: string) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchCharacter(characterId)
      .then(setCharacter)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [characterId]);

  return { character, loading, error };
}

// Usage in component
function CharacterDetail({ id }: { id: string }) {
  const { character, loading, error } = useCharacterDetail(id);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!character) return <NotFound />;

  return <CharacterProfile character={character} />;
}
```

### useContext Pattern

```typescript
// contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (credentials: Credentials) => {
    const user = await api.login(credentials);
    setUser(user);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for consuming context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### useReducer for Complex State

```typescript
type State = {
  loading: boolean;
  data: Character | null;
  error: string | null;
};

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Character }
  | { type: 'FETCH_ERROR'; payload: string };

function characterReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { loading: true, data: null, error: null };
    case 'FETCH_SUCCESS':
      return { loading: false, data: action.payload, error: null };
    case 'FETCH_ERROR':
      return { loading: false, data: null, error: action.payload };
    default:
      return state;
  }
}

// Usage
const [state, dispatch] = useReducer(characterReducer, {
  loading: false,
  data: null,
  error: null,
});
```

## React Query (TanStack Query) Patterns

### useQuery for Data Fetching

```typescript
import { useQuery } from '@tanstack/react-query';

function CharacterDetail({ id }: { id: string }) {
  const {
    data: character,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['character', id],
    queryFn: () => api.characters.get(id),
    enabled: !!id, // Only run if id exists
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!character) return <NotFound />;

  return <CharacterProfile character={character} />;
}
```

### useMutation for Data Changes

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

function CreateCharacterForm() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateCharacterDto) =>
      api.characters.create(data),
    onSuccess: (newCharacter) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ['characters'],
      });

      // Or add to cache directly
      queryClient.setQueryData(
        ['character', newCharacter.id],
        newCharacter
      );
    },
  });

  const handleSubmit = (data: CreateCharacterDto) => {
    createMutation.mutate(data);
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmit(formData);
    }}>
      {/* Form fields */}
      <button disabled={createMutation.isPending}>
        {createMutation.isPending ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
}
```

## Component Patterns

### Container/Presenter Pattern

```typescript
// CharacterDetailContainer.tsx - Handles logic
export function CharacterDetailContainer({ id }: { id: string }) {
  const {
    data: character,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['character', id],
    queryFn: () => api.characters.get(id),
  });

  if (isLoading) return <CharacterDetailLoading />;
  if (error) return <CharacterDetailError error={error} />;
  if (!character) return <CharacterDetailNotFound />;

  return (
    <CharacterDetailDisplay
      character={character}
      onRefresh={refetch}
    />
  );
}

// CharacterDetailDisplay.tsx - Displays data
export function CharacterDetailDisplay({
  character,
  onRefresh,
}: {
  character: Character;
  onRefresh: () => void;
}) {
  return (
    <div>
      <h1>{character.firstName} {character.lastName}</h1>
      <button onClick={onRefresh}>Refresh</button>
    </div>
  );
}
```

### Render Props

```typescript
interface DataFetcherProps<T> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  children: (data: T) => ReactNode;
}

export function DataFetcher<T>({
  queryKey,
  queryFn,
  children,
}: DataFetcherProps<T>) {
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn,
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return null;

  return <>{children(data)}</>;
}

// Usage
<DataFetcher
  queryKey={['character', id]}
  queryFn={() => api.characters.get(id)}
>
  {(character) => <CharacterProfile character={character} />}
</DataFetcher>
```

## Performance Patterns

### React.memo for Component Optimization

```typescript
// ✅ GOOD - Memoize expensive component
export const ExpensiveList = React.memo(function ExpensiveList({
  items,
}: {
  items: Item[];
}) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  });
});

// ✅ GOOD - Memoize with comparison function
export const CharacterCard = React.memo(
  function CharacterCard({ character }: { character: Character }) {
    return <div>{character.name}</div>;
  },
  (prevProps, nextProps) => {
    // Custom comparison
    return prevProps.character.id === nextProps.character.id &&
           prevProps.character.updatedAt === nextProps.character.updatedAt;
  }
);
```

### useMemo for Expensive Computations

```typescript
function CharacterStats({ characters }: { characters: Character[] }) {
  // ✅ GOOD - Memoize expensive computation
  const stats = useMemo(() => {
    return {
      total: characters.length,
      active: characters.filter(c => c.isActive).length,
      averageLevel: characters.reduce((sum, c) => sum + c.level, 0) / characters.length,
    };
  }, [characters]);

  return <StatsDisplay stats={stats} />;
}
```

### useCallback for Function Stability

```typescript
function CharacterCard({ character }: { character: Character }) {
  const dispatch = useAppDispatch();

  // ✅ GOOD - Memoize callback to prevent re-renders
  const handleEdit = useCallback(() => {
    dispatch(editCharacter(character.id));
  }, [dispatch, character.id]);

  const handleDelete = useCallback(() => {
    dispatch(deleteCharacter(character.id));
  }, [dispatch, character.id]);

  return (
    <div>
      <button onClick={handleEdit}>Edit</button>
      <button onClick={handleDelete}>Delete</button>
    </div>
  );
}
```

## Form Patterns

### Controlled Components

```typescript
function CharacterForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    description: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="firstName"
        value={formData.firstName}
        onChange={handleChange}
      />
      <input
        name="lastName"
        value={formData.lastName}
        onChange={handleChange}
      />
      <textarea
        name="description"
        value={formData.description}
        onChange={handleChange}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```

## Best Practices

### DO

✅ Use functional components
✅ Use TypeScript for all components
✅ Use React Query for server state
✅ Use custom hooks for reusable logic
✅ Memoize expensive computations
✅ Use React.memo appropriately
✅ Handle loading/error states
✅ Use i18n for user-facing text

### DON'T

❌ Use class components (legacy)
❌ Skip prop typing
❌ Use `any` type
❌ Over-memoize everything
❌ Forget dependency arrays
❌ Skip error handling
❌ Hardcode user-facing strings
❌ Use useEffect without dependencies

## Related Skills

- `charhub-react-component-patterns` - Component-specific patterns
- `charhub-i18n-system` - i18n with react-i18next
- `charhub-typescript-standards` - TypeScript patterns
- `charhub-react-query-patterns` - TanStack Query patterns
