import { PageLayout } from '../../components/layout/PageLayout';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Calendar } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';

export default function DoctorDashboard() {
  const { user } = useAuth();

  return (
    <PageLayout title="Dashboard">
      <PageHeader
        title={`Good morning, Dr. ${user?.name}`}
        subtitle="Here is your queue for today"
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Today's Patients" value="—" />
        <StatCard label="Completed"         value="—" />
        <StatCard label="Pending"           value="—" />
      </div>

      <Card title="Today's Queue">
        {/* TODO Phase 2.0 — wire up GET /api/v1/dashboard/doctor */}
        <EmptyState
          icon={Calendar}
          title="No appointments yet"
          description="Your patient queue will appear here once appointments are booked."
        />
      </Card>
    </PageLayout>
  );
}

function StatCard({ label, value }) {
  return (
    <Card>
      <p className="text-xs text-[var(--color-text-secondary)] mb-1">{label}</p>
      <p className="text-2xl font-bold text-[var(--color-text)]">{value}</p>
    </Card>
  );
}
