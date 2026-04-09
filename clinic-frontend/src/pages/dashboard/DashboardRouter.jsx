import { useAuth } from '../../store/AuthContext';
import DoctorDashboard       from './DoctorDashboard';
import ReceptionistDashboard from './ReceptionistDashboard';
import NurseDashboard        from './NurseDashboard';
import AdminDashboard        from './AdminDashboard';

export default function DashboardRouter() {
  const { user } = useAuth();

  switch (user?.role) {
    case 'doctor':       return <DoctorDashboard />;
    case 'receptionist': return <ReceptionistDashboard />;
    case 'nurse':        return <NurseDashboard />;
    case 'admin':        return <AdminDashboard />;
    default:             return null;
  }
}
