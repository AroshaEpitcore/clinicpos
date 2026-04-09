import { PageLayout } from '../../components/layout/PageLayout';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ClipboardList } from 'lucide-react';

export default function NurseDashboard() {
  return (
    <PageLayout title="Dashboard">
      <PageHeader
        title="Nurse Station"
        subtitle="Patients pending vitals today"
      />

      <Card title="Pending Vitals">
        {/* TODO Phase 2.3 — wire up GET /api/v1/dashboard/nurse */}
        <EmptyState
          icon={ClipboardList}
          title="No pending vitals"
          description="Patients who need vitals recorded will appear here."
        />
      </Card>
    </PageLayout>
  );
}
