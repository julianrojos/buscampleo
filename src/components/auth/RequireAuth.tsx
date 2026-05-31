import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import LoadingState from '@/components/shared/LoadingState';
import { useSession } from '@/lib/auth/session';
import { shouldRequireAuth } from '@/lib/runtime';

export default function RequireAuth({ children }: PropsWithChildren) {
  const location = useLocation();
  const { data: session, isLoading } = useSession();

  if (!shouldRequireAuth()) {
    return children;
  }

  if (isLoading) {
    return <LoadingState label="Verificando sesión" />;
  }

  if (!session?.user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
