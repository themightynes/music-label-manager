import React, { ComponentType, useEffect } from 'react';
import { useIsAdmin } from '@/auth/useCurrentUser';
import { useLocation } from 'wouter';

export function withAdmin<P extends Record<string, any>>(Wrapped: ComponentType<P>) {
  const AdminOnly: React.FC<P> = (props: P) => {
    const { isAdmin, loading } = useIsAdmin();
    const [, setLocation] = useLocation();

    useEffect(() => {
      if (!loading && !isAdmin) {
        setLocation('/');
      }
    }, [loading, isAdmin, setLocation]);

    if (loading) return <div className="p-4 text-white">Checking access…</div>;
    if (!isAdmin) return null;
    return React.createElement(Wrapped, props as P);
  };

  AdminOnly.displayName = `withAdmin(${Wrapped.displayName || Wrapped.name || 'Component'})`;
  return AdminOnly;
}
