import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../../hooks/useAuth';

export function useAuthRedirect(): void {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      // Support both string and object formats for backward compatibility
      const state = location.state as { from?: string | { pathname: string } };
      let from = '/dashboard';

      if (state?.from) {
        if (typeof state.from === 'string') {
          from = state.from;
        } else if (state.from.pathname) {
          from = state.from.pathname;
        }
      }

      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);
}
