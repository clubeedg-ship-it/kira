import { type ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [singleTenant, setSingleTenant] = useState<boolean | null>(null);
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    fetch('/api/v1/config')
      .then(r => r.json())
      .then(data => setSingleTenant(data.singleTenant === true))
      .catch(() => setSingleTenant(false));
  }, []);

  // Still loading config
  if (singleTenant === null) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg-base px-6 text-text-secondary">
        <p className="text-sm">Loading...</p>
      </div>
    );
  }

  // Single-tenant: skip auth entirely
  if (singleTenant) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg-base px-6 text-text-secondary">
        <p className="text-sm">Checking session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
