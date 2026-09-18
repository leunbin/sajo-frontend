import { Navigate, Outlet } from 'react-router-dom';
import { tokenStorage } from '../../utils/tokenStorage';

function ProtectedRoute() {
  const accessToken = tokenStorage.getAccessToken();

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
