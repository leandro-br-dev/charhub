---
name: charhub-react-query-patterns
description: TanStack React Query patterns for CharHub. Use when implementing data fetching, caching, or server state management with React Query.
---

# CharHub React Query Patterns

## Purpose

Define TanStack Query (React Query) patterns, conventions, and best practices for CharHub frontend data fetching and server state management.

## Query Client Setup

### QueryClient Provider

```typescript
// lib/queryClient.ts
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Time data remains fresh
      staleTime: 1000 * 60 * 5, // 5 minutes
      // Time before retrying failed query
      retryDelay: 1000,
      // Number of retries
      retries: 3,
    },
  },
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### Wrapping App

```typescript
// App.tsx
import { QueryProvider } from './lib/queryClient';

export function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <Routes>
          {/* Routes */}
        </Routes>
      </BrowserRouter>
    </QueryProvider>
  );
}
```

## useQuery for Data Fetching

### Basic Usage

```typescript
import { useQuery } from '@tanstack/react-query';

function CharacterDetail({ id }: { id: string }) {
  const {
    data: character,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['character', id],
    queryFn: () => api.characters.get(id),
  });

  if (isLoading) return <Spinner />;
  if (isError) return <ErrorMessage error={error} />;
  if (!character) return <NotFound />;

  return (
    <div>
      <h1>{character.name}</h1>
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  );
}
```

### Conditional Queries

```typescript
// ✅ GOOD - Use enabled option
function CharacterDetail({ id }: { id: string | undefined }) {
  const {
    data: character,
    isLoading,
  } = useQuery({
    queryKey: ['character', id],
    queryFn: () => api.characters.get(id!),
    enabled: !!id, // Only run if id exists
  });

  if (!id) return <div>Please select a character</div>;
  if (isLoading) return <Spinner />;

  return <div>{character.name}</div>;
}
```

### Dependent Queries

```typescript
function CharacterWithStats({ id }: { id: string }) {
  // First query
  const { data: character } = useQuery({
    queryKey: ['character', id],
    queryFn: () => api.characters.get(id),
  });

  // Second query - depends on first
  const { data: stats } = useQuery({
    queryKey: ['character-stats', character?.id],
    queryFn: () => api.characters.getStats(character!.id),
    enabled: !!character, // Only run if character exists
  });

  if (!character || !stats) return <Spinner />;

  return <div>{character.name}: {stats.points} pts</div>;
}
```

## useMutation for Data Changes

### Basic Mutation

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

function CreateCharacterForm() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateCharacterDto) =>
      api.characters.create(data),
    onSuccess: (newCharacter) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ['characters'],
      });

      // Or add to cache directly
      queryClient.setQueryData(
        ['character', newCharacter.id],
        newCharacter
      );

      // Show success message
      toast.success('Character created!');
    },
    onError: (error) => {
      toast.error('Failed to create character');
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
      <button disabled={createMutation.isPending}>
        {createMutation.isPending ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
}
```

### Optimistic Updates

```typescript
function CharacterCard({ character }: { character: Character }) {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data: UpdateCharacterDto) =>
      api.characters.update(character.id, data),
    onMutate: async (newData) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: ['character', character.id],
      });

      // Snapshot previous value
      const previousCharacter = queryClient.getQueryData([
        'character',
        character.id,
      ]);

      // Optimistically update
      queryClient.setQueryData<Character>(
        ['character', character.id],
        (old) => ({ ...old!, ...newData })
      );

      // Return context with previous value
      return { previousCharacter };
    },
    onError: (error, variables, context) => {
      // Rollback to previous value
      queryClient.setQueryData(
        ['character', character.id],
        context?.previousCharacter
      );
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({
        queryKey: ['character', character.id],
      });
    },
  });

  return (
    <div>
      <h3>{character.name}</h3>
      <button
        onClick={() => updateMutation.mutate({ name: 'New Name' })}
      >
        Update
      </button>
    </div>
  );
}
```

## Query Keys

### Structured Query Keys

```typescript
// ✅ GOOD - Hierarchical query keys
const queryKeys = {
  characters: {
    all: ['characters'] as const,
    lists: () => [...queryKeys.characters.all, 'list'] as const,
    list: (filters: string) =>
      [...queryKeys.characters.lists(), { filters }] as const,
    details: () => [...queryKeys.characters.all, 'detail'] as const,
    detail: (id: string) =>
      [...queryKeys.characters.details(), id] as const,
  },
};

// Usage
useQuery({
  queryKey: queryKeys.characters.detail(id),
  queryFn: () => api.characters.get(id),
});

// Invalidate all character queries
queryClient.invalidateQueries({
  queryKey: queryKeys.characters.all,
});
```

### Query Key Factories

```typescript
// ✅ GOOD - Factory function for keys
function characterKeys() {
  return {
    all: () => ['characters'] as const,
    lists: () => [...characterKeys().all(), 'list'] as const,
    list: (filters: CharacterFilters) =>
      [...characterKeys().lists(), filters] as const,
    details: () => [...characterKeys().all(), 'detail'] as const,
    detail: (id: string) =>
      [...characterKeys().details(), id] as const,
  };
}

// Usage
useQuery({
  queryKey: characterKeys().detail(id),
  queryFn: () => api.characters.get(id),
});
```

## Infinite Queries

### Pagination

```typescript
function CharacterList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['characters', 'infinite'],
    queryFn: ({ pageParam = 0 }) =>
      api.characters.getList({ page: pageParam, limit: 20 }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore) return lastPage.page + 1;
      return undefined;
    },
  });

  return (
    <div>
      {data?.pages.map(page => (
        <div key={page.page}>
          {page.items.map(character => (
            <CharacterCard key={character.id} character={character} />
          ))}
        </div>
      ))}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

## Cache Management

### Invalidating Queries

```typescript
function CharacterActions() {
  const queryClient = useQueryClient();

  const handleCreate = async () => {
    await api.characters.create(data);

    // Invalidate specific query
    queryClient.invalidateQueries({
      queryKey: ['characters'],
    });

    // Invalidate all queries with prefix
    queryClient.invalidateQueries({
      queryKey: ['characters'],
      refetchType: 'all',
    });
  };
}
```

### Setting Cache Data

```typescript
// Set cache data directly
queryClient.setQueryData(['user', userId], newUser);

// Set cache data with updater function
queryClient.setQueryData(['characters'], (old) => [
  ...old,
  newCharacter,
]);
```

### Removing Cache Data

```typescript
// Remove specific query
queryClient.removeQueries({
  queryKey: ['character', deletedId],
});

// Clear all queries
queryClient.clear();
```

## Prefetching

### On Hover Prefetch

```typescript
function CharacterLink({ id }: { id: string }) {
  const queryClient = useQueryClient();

  const prefetchCharacter = () => {
    queryClient.prefetchQuery({
      queryKey: ['character', id],
      queryFn: () => api.characters.get(id),
    });
  };

  return (
    <Link
      to={`/characters/${id}`}
      onMouseEnter={prefetchCharacter}
    >
      {name}
    </Link>
  );
}
```

### Route-based Prefetch

```typescript
// Prefetch when user navigates to route
function App() {
  const queryClient = useQueryClient();

  return (
    <Routes>
      <Route
        path="/characters/:id"
        element={
          <CharacterDetail
            onLoad={(id) => {
              // Prefetch data when route loads
              queryClient.prefetchQuery({
                queryKey: ['character', id],
                queryFn: () => api.characters.get(id),
              });
            }}
          />
        }
      />
    </Routes>
  );
}
```

## Pagination with useQuery

### Manual Pagination

```typescript
function CharacterList() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['characters', page],
    queryFn: () => api.characters.getList({ page, limit: 20 }),
  });

  return (
    <div>
      {isLoading ? (
        <Spinner />
      ) : (
        <>
          {data?.items.map(character => (
            <CharacterCard key={character.id} character={character} />
          ))}

          <button
            onClick={() => setPage(p => p - 1)}
            disabled={page === 1}
          >
            Previous
          </button>

          <span>Page {page}</span>

          <button
            onClick={() => setPage(p => p + 1)}
            disabled={!data?.hasMore}
          >
            Next
          </button>
        </>
      )}
    </div>
  );
}
```

## Background Refetching

### Window Focus Refetch

```typescript
// Refetch when window regains focus
useQuery({
  queryKey: ['characters'],
  queryFn: fetchCharacters,
  refetchOnWindowFocus: true, // Default: true for Queries
});

// Disable window focus refetch
useQuery({
  queryKey: ['characters'],
  queryFn: fetchCharacters,
  refetchOnWindowFocus: false,
});
```

### Interval Refetch

```typescript
// Refetch every 10 seconds
useQuery({
  queryKey: ['status'],
  queryFn: fetchStatus,
  refetchInterval: 10000, // 10 seconds
});

// Refetch only when tab is active
useQuery({
  queryKey: ['status'],
  queryFn: fetchStatus,
  refetchInterval: 10000,
  refetchIntervalInBackground: false,
});
```

## Retry Behavior

### Custom Retry Logic

```typescript
useQuery({
  queryKey: ['character', id],
  queryFn: () => api.characters.get(id),
  retry: (failureCount, error) => {
    // Don't retry on 404
    if (error.status === 404) return false;
    // Retry up to 3 times
    return failureCount < 3;
  },
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});
```

## Best Practices

### DO

✅ Use structured query keys
✅ Invalidate related queries after mutations
✅ Handle loading/error states
✅ Use optimistic updates for better UX
✅ Prefetch data when possible
✅ Use enabled for conditional queries
✅ Set appropriate stale times
✅ Use React Query DevTools for debugging

### DON'T

❌ Fetch data in useEffect
❌ Skip error handling
❌ Use local state for server data
❌ Forget to invalidate after mutations
❌ Use non-serializable data in query keys
❌ Over-use optimistic updates (complex cases)
❌ Forget about retry logic

## Related Skills

- `charhub-react-patterns` - React hooks and patterns
- `charhub-api-conventions` - API endpoint patterns
- `charhub-typescript-standards` - TypeScript patterns
