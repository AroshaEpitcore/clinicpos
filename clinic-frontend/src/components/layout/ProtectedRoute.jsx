import { Navigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { LoadingState } from '../ui/Spinner';

export function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingState message="Restoring session..." />;

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
