import { useMemo } from 'react';
import { useAuth } from './useAuth';

/**
 * Hook to check if current user is an ADMIN
 * @returns Object with isAdmin boolean
 */
export function useAdmin() {
  const { user } = useAuth();

  const isAdmin = useMemo(() => {
    return user?.role === 'ADMIN';
  }, [user?.role]);

  return { isAdmin };
}
