import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/test-utils';
import { ProtectedRoute } from '../ProtectedRoute';
import { Route, Routes, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

// Mock useAuth hook
const mockUseAuth = vi.fn();
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Component to capture location state
function LocationCapture({ onCapture }: { onCapture: (location: any) => void }) {
  const location = useLocation();
  useEffect(() => {
    onCapture(location);
  }, [location, onCapture]);
  return <div>Signup Page</div>;
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });

    render(
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>,
      { initialEntries: ['/'] }
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to /signup when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });

    render(
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/signup" element={<div>Signup Page</div>} />
      </Routes>,
      { initialEntries: ['/protected'] }
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Signup Page')).toBeInTheDocument();
  });

  it('should save full URL (pathname + search + hash) in state when redirecting', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });

    let capturedLocation: any = null;

    render(
      <Routes>
        <Route
          path="/protected/page"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/signup"
          element={<LocationCapture onCapture={(loc) => (capturedLocation = loc)} />}
        />
      </Routes>,
      { initialEntries: ['/protected/page?param=value#section'] }
    );

    await waitFor(() => {
      expect(capturedLocation).toBeTruthy();
    });

    expect(capturedLocation.state?.from).toBe('/protected/page?param=value#section');
  });

  it('should redirect with pathname only when no search or hash', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });

    let capturedLocation: any = null;

    render(
      <Routes>
        <Route
          path="/protected/page"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/signup"
          element={<LocationCapture onCapture={(loc) => (capturedLocation = loc)} />}
        />
      </Routes>,
      { initialEntries: ['/protected/page'] }
    );

    await waitFor(() => {
      expect(capturedLocation).toBeTruthy();
    });

    expect(capturedLocation.state?.from).toBe('/protected/page');
  });

  it('should redirect to /signup with pathname and search params', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });

    let capturedLocation: any = null;

    render(
      <Routes>
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/signup"
          element={<LocationCapture onCapture={(loc) => (capturedLocation = loc)} />}
        />
      </Routes>,
      { initialEntries: ['/chat?characterId=123'] }
    );

    await waitFor(() => {
      expect(capturedLocation).toBeTruthy();
    });

    expect(capturedLocation.state?.from).toBe('/chat?characterId=123');
  });
});
