import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuthRedirect } from '../useAuthRedirect';
import { MemoryRouter } from 'react-router-dom';
import { ReactNode } from 'react';

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('../../../../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('useAuthRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not redirect when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter>{children}</MemoryRouter>
    );

    renderHook(() => useAuthRedirect(), { wrapper });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should redirect to /dashboard by default when authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter>{children}</MemoryRouter>
    );

    renderHook(() => useAuthRedirect(), { wrapper });

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('should redirect to string "from" location when authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/login',
            state: { from: '/protected/page' },
          },
        ]}
      >
        {children}
      </MemoryRouter>
    );

    renderHook(() => useAuthRedirect(), { wrapper });

    expect(mockNavigate).toHaveBeenCalledWith('/protected/page', { replace: true });
  });

  it('should redirect to object "from.pathname" location when authenticated (backward compatibility)', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/login',
            state: { from: { pathname: '/old/format' } },
          },
        ]}
      >
        {children}
      </MemoryRouter>
    );

    renderHook(() => useAuthRedirect(), { wrapper });

    expect(mockNavigate).toHaveBeenCalledWith('/old/format', { replace: true });
  });

  it('should redirect to full URL with search params when authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/login',
            state: { from: '/chat?characterId=123' },
          },
        ]}
      >
        {children}
      </MemoryRouter>
    );

    renderHook(() => useAuthRedirect(), { wrapper });

    expect(mockNavigate).toHaveBeenCalledWith('/chat?characterId=123', { replace: true });
  });

  it('should redirect to full URL with hash when authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/signup',
            state: { from: '/chat#conversation-123' },
          },
        ]}
      >
        {children}
      </MemoryRouter>
    );

    renderHook(() => useAuthRedirect(), { wrapper });

    expect(mockNavigate).toHaveBeenCalledWith('/chat#conversation-123', { replace: true });
  });

  it('should use replace: true to avoid back button issues', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/login',
            state: { from: '/protected' },
          },
        ]}
      >
        {children}
      </MemoryRouter>
    );

    renderHook(() => useAuthRedirect(), { wrapper });

    expect(mockNavigate).toHaveBeenCalledWith(expect.any(String), { replace: true });
  });

  it('should handle missing "from" state gracefully', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/login',
            state: {}, // No "from" key
          },
        ]}
      >
        {children}
      </MemoryRouter>
    );

    renderHook(() => useAuthRedirect(), { wrapper });

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('should handle null state gracefully', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter>{children}</MemoryRouter>
    );

    renderHook(() => useAuthRedirect(), { wrapper });

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });
});
