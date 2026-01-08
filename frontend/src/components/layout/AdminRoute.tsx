import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface AdminRouteProps {
  children: ReactElement;
}

/**
 * Protected route component that requires authentication AND admin role.
 * Redirects to signup if not authenticated, or to dashboard if authenticated but not admin.
 */
export function AdminRoute({ children }: AdminRouteProps): ReactElement {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    // Save the original URL for redirect after login
    return <Navigate to="/signup" state={{ from: location.pathname + location.search + location.hash }} replace />;
  }

  if (user.role !== 'ADMIN') {
    // Authenticated but not admin - redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
