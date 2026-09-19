import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { getMe } from '../../api/auth';
import type { UserRole } from '../../types/auth';
import { tokenStorage } from '../../utils/tokenStorage';

function AdminRoute() {
  const accessToken = tokenStorage.getAccessToken();

  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let cancelled = false;

    const loadUser = async () => {
      try {
        const user = await getMe();

        if (!cancelled) {
          setRole(user.role);
        }
      } catch {
        if (!cancelled) {
          setIsError(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return <main className="admin-route-loading">관리자 권한을 확인하고 있습니다.</main>;
  }

  if (isError) {
    return <Navigate to="/login" replace />;
  }

  if (role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default AdminRoute;
