import React, { ComponentType, useEffect, useState } from 'react';
import { useIsAdmin } from '@/auth/useCurrentUser';
import { useLocation } from 'wouter';

export function withAdmin<P extends Record<string, any>>(Wrapped: ComponentType<P>) {
  const AdminOnly: React.FC<P> = (props: P) => {
    const { isAdmin, loading } = useIsAdmin();
    const [, setLocation] = useLocation();
    const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

    useEffect(() => {
      if (loading) {
        return;
      }

      if (isAdmin) {
        setRedirectCountdown(null);
        return;
      }

      setRedirectCountdown((current) => (current === null ? 3 : current));
    }, [loading, isAdmin]);

    useEffect(() => {
      if (redirectCountdown === null) {
        return;
      }

      if (redirectCountdown === 0) {
        setLocation('/');
        return;
      }

      const timer = setTimeout(() => {
        setRedirectCountdown((current) => (current ? current - 1 : 0));
      }, 1000);

      return () => clearTimeout(timer);
    }, [redirectCountdown, setLocation]);

    if (loading) {
      return <div className="p-4 text-white">Checking access...</div>;
    }

    if (!isAdmin) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="p-8 text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Unauthorized Access</h1>
            <p className="text-muted-foreground mb-2">
              You do not have permission to access this admin page.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to home page{redirectCountdown !== null ? ` in ${redirectCountdown}s` : '...'}
            </p>
          </div>
        </div>
      );
    }

    return React.createElement(Wrapped, props as P);
  };

  AdminOnly.displayName = `withAdmin(${Wrapped.displayName || Wrapped.name || 'Component'})`;
  return AdminOnly;
}
