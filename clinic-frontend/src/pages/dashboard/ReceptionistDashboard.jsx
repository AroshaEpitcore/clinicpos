import { PageLayout } from '../../components/layout/PageLayout';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Users } from 'lucide-react';

export default function ReceptionistDashboard() {
  return (
    <PageLayout title="Dashboard">
      <PageHeader
        title="Reception Desk"
        subtitle="Live queue and today's summary"
        actions={
          <>
            {/* TODO Phase 2.1 — wire up patient search / register */}
            <Button variant="secondary" disabled>Search Patient</Button>
            <Button disabled>+ Register Patient</Button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Appointments" value="—" />
        <StatCard label="Waiting"            value="—" />
        <StatCard label="Collected Today"    value="—" />
        <StatCard label="Pending Payments"   value="—" />
      </div>

      <Card title="Live Queue — All Doctors">
        {/* TODO Phase 2.0 — wire up GET /api/v1/dashboard/receptionist */}
        <EmptyState
          icon={Users}
          title="Queue is empty"
          description="Patients added to the queue will appear here in real time."
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
