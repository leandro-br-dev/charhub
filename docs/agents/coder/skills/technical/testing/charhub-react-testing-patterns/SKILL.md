---
name: charhub-react-testing-patterns
description: React Testing Library patterns for CharHub. Use when writing Vitest tests for React components, hooks, or frontend utilities.
---

# CharHub React Testing Patterns

## Purpose

Define React Testing Library patterns, component testing strategies, and conventions for CharHub frontend testing with Vitest.

## Test File Setup

### Basic Setup

```typescript
// CharacterCard.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { CharacterCard } from './CharacterCard';

describe('CharacterCard', () => {
  // QueryClient wrapper for React Query
  const createQueryClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={createQueryClient()}>
      {children}
    </QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });
});
```

## Component Testing

### Render with Testing Library

```typescript
import { render, screen } from '@testing-library/react';

describe('CharacterCard', () => {
  it('displays character name', () => {
    const mockCharacter = {
      id: '1',
      firstName: 'John',
      lastName: 'Doe',
    };

    render(<CharacterCard character={mockCharacter} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('displays character with role', () => {
    const mockCharacter = {
      id: '1',
      name: 'John',
      role: 'ADMIN',
    };

    render(<CharacterCard character={mockCharacter} />);

    expect(screen.getByRole('heading', { name: 'John' })).toBeInTheDocument();
  });
});
```

### Testing Props

```typescript
it('uses default value for optional prop', () => {
  render(
    <CharacterCard
      character={mockCharacter}
      // showActions not provided
    />
  );

  expect(screen.getByTestId('actions')).toBeInTheDocument();
});

it('does not show actions when showActions is false', () => {
  render(
    <CharacterCard
      character={mockCharacter}
      showActions={false}
    />
  );

  expect(screen.queryByTestId('actions')).not.toBeInTheDocument();
});
```

### Testing Events

```typescript
import userEvent from '@testing-library/user-event';

describe('CharacterCard', () => {
  it('emits edit event when edit button clicked', async () => {
    const handleEdit = vi.fn();

    render(
      <CharacterCard
        character={mockCharacter}
        onEdit={handleEdit}
      />
    );

    const editButton = screen.getByRole('button', { name: /edit/i });
    await userEvent.click(editButton);

    expect(handleEdit).toHaveBeenCalledWith(mockCharacter);
  });

  it('calls onDelete when delete button clicked', async () => {
    const handleDelete = vi.fn();

    render(
      <CharacterCard
        character={mockCharacter}
        onDelete={handleDelete}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await userEvent.click(deleteButton);

    expect(handleDelete).toHaveBeenCalledWith(mockCharacter.id);
  });
});
```

### Testing Async Components

```typescript
import { waitFor, waitForElementToBeRemoved } from '@testing-library/react';

describe('CharacterDetail', () => {
  it('displays loading state initially', () => {
    render(<CharacterDetail id="1" />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays character after loading', async () => {
    render(<CharacterDetail id="1" />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  it('removes loading spinner when data loads', async () => {
    render(<CharacterDetail id="1" />);

    await waitForElementToBeRemoved(() =>
      screen.queryByRole('progressbar')
    );

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
```

## Testing Hooks

### Testing Custom Hooks

```typescript
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useCharacterDetail } from './useCharacterDetail';

describe('useCharacterDetail', () => {
  const wrapper = ({ children }: { children: ReactNode }) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  it('should fetch character on mount', async () => {
    const mockCharacter = { id: '1', name: 'John' };
    vi.mocked(api).getCharacter.mockResolvedValue(mockCharacter);

    const { result } = renderHook(() => useCharacterDetail('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.character).toEqual(mockCharacter);
    });
  });

  it('should have loading state initially', () => {
    const { result } = renderHook(() => useCharacterDetail('1'), { wrapper });

    expect(result.current.loading).toBe(true);
  });

  it('should set error state on failure', async () => {
    const mockError = new Error('Not found');
    vi.mocked(api).getCharacter.mockRejectedValue(mockError);

    const { result } = renderHook(() => useCharacterDetail('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toEqual(mockError);
    });
  });
});
```

## Mocking API Calls

### Mocking with Vitest

```typescript
// Setup mocks in test file
import { vi } from 'vitest';
import * as api from '@/api/character';

vi.mock('@/api/character', () => ({
  getCharacter: vi.fn(),
  createCharacter: vi.fn(),
}));

describe('CharacterDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and displays character', async () => {
    const mockCharacter = { id: '1', name: 'John' };
    vi.mocked(api).getCharacter.mockResolvedValue(mockCharacter);

    render(<CharacterDetail id="1" />);

    await waitFor(() => {
      expect(api.getCharacter).toHaveBeenCalledWith('1');
      expect(screen.getByText('John')).toBeInTheDocument();
    });
  });
});
```

### Mocking React Query

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('CharacterDetail with React Query', () => {
  it('displays character data', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    // Set cache data directly
    queryClient.setQueryData(['character', '1'], {
      id: '1',
      name: 'John',
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    render(<CharacterDetail id="1" />, { wrapper });

    expect(screen.getByText('John')).toBeInTheDocument();
  });
});
```

## Mocking React Router

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';

// Mock navigate function
const mockedNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...actual,
  useNavigate: () => mockedNavigate,
}));

describe('Navigation', () => {
  it('navigates to detail page on click', async () => {
    render(
      <BrowserRouter>
        <CharacterList characters={characters} />
      </BrowserRouter>
    );

    const detailLink = screen.getByText(/John/);
    await userEvent.click(detailLink);

    expect(mockedNavigate).toHaveBeenCalledWith('/characters/1');
  });
});
```

## Test Selectors

### Priority of Selectors

1. **User-facing text** (most important)
2. **Label text** (form labels, aria-labels)
3. **Role** (button, heading, link)
4. **data-testid** (last resort)

### Using Queries

```typescript
// ✅ GOOD - By text
screen.getByText('Submit')
screen.getByText(/hello world/i)

// ✅ GOOD - By role
screen.getByRole('button', { name: 'Submit' })
screen.getByRole('heading', { level: 2 })

// ✅ GOOD - By label
screen.getByLabelText('Email')

// ⚠️ USE SPARINGLY - By test id
screen.getByTestId('submit-button')

// ❌ BAD - By class (brittle)
screen.querySelector('.btn.btn-primary')
```

### data-test Attributes

```typescript
// In component
<button data-testid="submit-button">Submit</button>

// In test
screen.getByTestId('submit-button')
```

## User Interactions

### User Event vs Fire Event

```typescript
// ✅ GOOD - Use userEvent (simulates real user)
import userEvent from '@testing-library/user-event';

await userEvent.click(button);
await userEvent.type(input, 'text');
await userEvent.selectOptions(select, ['value1']);

// ❌ BAD - Use fireEvent (doesn't simulate real user)
fireEvent.click(button);
fireEvent.change(input, { target: { value: 'text' } });
```

### Common Interactions

```typescript
// Typing in input
await userEvent.type(screen.getByRole('textbox'), 'Hello');

// Clearing input
await userEvent.clear(screen.getByRole('textbox'));

// Selecting from dropdown
await userEvent.selectOptions(
  screen.getByRole('combobox'),
  'Option 1'
);

// Checking checkbox
await userEvent.click(screen.getByRole('checkbox'));

// Submitting form
await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
```

## Form Testing

### Testing Form Submission

```typescript
describe('CharacterForm', () => {
  it('submits form with valid data', async () => {
    const handleSubmit = vi.fn();

    render(<CharacterForm onSubmit={handleSubmit} />);

    // Fill form
    await userEvent.type(
      screen.getByLabelText('First Name'),
      'John'
    );
    await userEvent.type(
      screen.getByLabelText('Last Name'),
      'Doe'
    );

    // Submit
    await userEvent.click(
      screen.getByRole('button', { name: 'Submit' })
    );

    expect(handleSubmit).toHaveBeenCalledWith({
      firstName: 'John',
      lastName: 'Doe',
    });
  });

  it('shows validation errors for invalid data', async () => {
    render(<CharacterForm />);

    // Submit without filling required fields
    await userEvent.click(
      screen.getByRole('button', { name: 'Submit' })
    );

    expect(screen.getByText('First name is required')).toBeInTheDocument();
    expect(screen.getByText('Last name is required')).toBeInTheDocument();
  });
});
```

## Async Testing

### waitFor

```typescript
it('updates after async operation', async () => {
  render(<CharacterDetail id="1" />);

  // Wait for async update
  await waitFor(() => {
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

### waitForElementToBeRemoved

```typescript
it('removes spinner after loading', async () => {
  render(<CharacterDetail id="1" />);

  await waitForElementToBeRemoved(() =>
    screen.queryByRole('progressbar')
  );

  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
});
```

## Integration Testing

### Testing with Providers

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    logger: {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe('CharacterDetail Integration', () => {
  it('renders character detail page', async () => {
    const wrapper = createWrapper();

    render(<CharacterDetail id="1" />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Character Details')).toBeInTheDocument();
    });
  });
});
```

## Snapshot Testing

### Component Snapshots

```typescript
it('matches snapshot', () => {
  const { container } = render(<CharacterCard character={mockCharacter} />);
  expect(container).toMatchSnapshot();
});
```

### Inline Snapshots

```typescript
it('matches inline snapshot', () => {
  const { container } = render(<CharacterCard character={mockCharacter} />);
  expect(container).toMatchInlineSnapshot(`
    <div>
      <div class="character-card">
        <h3>John Doe</h3>
      </div>
    </div>
  `);
});
```

## Best Practices

### DO

✅ Test behavior, not implementation
✅ Use userEvent for interactions
✅ Query by user-visible text
✅ Wait for async updates with waitFor
✅ Clean up mocks in afterEach
✅ Use descriptive test names
✅ Test error cases
✅ Use data-testid as last resort

### DON'T

❌ Test CSS/styling
❌ Test internal component state
❌ Use fireEvent (use userEvent)
❌ Test by class names
❌ Skip cleanup
❌ Only test happy path
❌ Test implementation details

## Test Environment

### Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

### Setup File

```typescript
// test/setup.ts
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Polyfills
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
```

## Running Tests

```bash
# All tests
npm test

# Watch mode
npm test -- --watch

# UI mode
npm run test:ui

# Coverage
npm run test:run -- --coverage

# Specific file
npm test -- CharacterCard
```

## Related Skills

- `charhub-testing-standards` - General testing standards
- `charhub-react-patterns` - React patterns
- `charhub-react-component-patterns` - Component patterns
- `charhub-jest-dom-patterns` - Jest matchers
