import { PageLayout } from '../../components/layout/PageLayout';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { BarChart2 } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <PageLayout title="Dashboard">
      <PageHeader
        title="Admin Overview"
        subtitle="Today's revenue, patient count, and alerts"
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Billed"    value="—" sub="Today" />
        <StatCard label="Collected"       value="—" sub="Today" />
        <StatCard label="Patients Today"  value="—" />
        <StatCard label="EOD Status"      value="—" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card title="Revenue — This Month">
          {/* TODO Phase 2.6 — wire up recharts bar chart */}
          <EmptyState
            icon={BarChart2}
            title="No data yet"
            description="Revenue chart will appear once invoices are recorded."
          />
        </Card>

        <Card title="Doctor Performance">
          {/* TODO Phase 2.6 — wire up GET /api/v1/reports/doctors */}
          <EmptyState
            icon={BarChart2}
            title="No data yet"
            description="Doctor stats will appear here once consultations are recorded."
          />
        </Card>
      </div>
    </PageLayout>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <Card>
      <p className="text-xs text-[var(--color-text-secondary)] mb-1">{label}</p>
      <p className="text-2xl font-bold text-[var(--color-text)]">{value}</p>
      {sub && <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{sub}</p>}
    </Card>
  );
}
