import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, DollarSign, AlertCircle, AlertTriangle } from 'lucide-react';
import { PageLayout }       from '../../components/layout/PageLayout';
import { PageHeader }       from '../../components/ui/PageHeader';
import { Button }           from '../../components/ui/Button';
import { Card }             from '../../components/ui/Card';
import { LoadingState }     from '../../components/ui/Spinner';
import { appointmentsApi }  from '../../api/appointments';
import { endOfDayApi }      from '../../api/invoices';
import { medicinesApi }     from '../../api/medicines';
import { formatCurrency, toInputDate } from '../../utils/format';

const STATUS_STYLES = {
  pending:   'bg-amber-50 text-amber-700',
  confirmed: 'bg-blue-50 text-blue-700',
  arrived:   'bg-purple-50 text-purple-700',
  completed: 'bg-green-50 text-green-700',
};

export default function ReceptionistDashboard() {
  const navigate = useNavigate();
  const today    = toInputDate(new Date());

  const [appointments,  setAppointments]  = useState([]);
  const [summary,       setSummary]       = useState(null);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading,       setLoading]       = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [apptRes, sumRes, lsRes] = await Promise.all([
        appointmentsApi.list({ date: today }),
        endOfDayApi.getSummary(today).catch(() => ({ data: null })),
        medicinesApi.lowStock().catch(() => ({ data: { data: [] } })),
      ]);
      setAppointments(apptRes.data.data || []);
      setSummary(sumRes.data?.data || null);
      setLowStockCount((lsRes.data.data || []).length);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => { load(); }, [load]);

  const total     = appointments.length;
  const waiting   = appointments.filter(a => ['pending','confirmed'].includes(a.status)).length;
  const arrived   = appointments.filter(a => a.status === 'arrived').length;
  const collected   = summary ? parseFloat(summary.total_collected    || 0) : 0;
  const outstanding = summary ? parseFloat(summary.outstanding_balance || 0) : 0;

  return (
    <PageLayout title="Dashboard">
      <PageHeader
        title="Reception Desk"
        subtitle={`Today — ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/patients')}>Search Patient</Button>
            <Button onClick={() => navigate('/appointments')}>Manage Queue →</Button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <StatCard icon={Users}       iconColor="text-blue-600"   iconBg="bg-blue-50"   label="Total Appointments" value={total} sub={`${arrived} arrived`} />
        <StatCard icon={Clock}       iconColor="text-amber-600"  iconBg="bg-amber-50"  label="Waiting"           value={waiting} />
        <StatCard icon={DollarSign}  iconColor="text-green-600"  iconBg="bg-green-50"  label="Collected Today"   value={formatCurrency(collected)} />
        <StatCard icon={AlertCircle} iconColor="text-red-500"    iconBg="bg-red-50"    label="Outstanding"       value={formatCurrency(outstanding)} />
        <StatCard
          icon={AlertTriangle}
          iconColor={lowStockCount > 0 ? 'text-red-600' : 'text-gray-400'}
          iconBg={lowStockCount > 0 ? 'bg-red-50' : 'bg-gray-50'}
          label="Low Stock"
          value={lowStockCount}
          sub={lowStockCount > 0 ? 'medicines need reorder' : 'stock levels OK'}
          onClick={() => navigate('/medicines')}
          alert={lowStockCount > 0}
        />
      </div>

      <Card title="Live Queue — All Doctors">
        {loading ? (
          <LoadingState message="Loading queue..." />
        ) : appointments.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)] py-8 text-center">Queue is empty today.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">#</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Patient</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Doctor</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Time</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map(appt => (
                  <tr
                    key={appt.id}
                    className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)] cursor-pointer transition-colors"
                    onClick={() => navigate('/appointments')}
                  >
                    <td className="py-2.5 px-3">
                      <span className="w-7 h-7 inline-flex items-center justify-center rounded-full bg-[var(--color-primary-light)] text-xs font-bold text-[var(--color-primary)]">
                        {appt.token_number}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-[var(--color-text)]">{appt.first_name} {appt.last_name}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{appt.patient_code}</p>
                    </td>
                    <td className="py-2.5 px-3 text-[var(--color-text-secondary)]">{appt.doctor_name}</td>
                    <td className="py-2.5 px-3 text-[var(--color-text-secondary)]">
                      {appt.appointment_time ? appt.appointment_time.slice(0, 5) : 'Walk-in'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[appt.status] || 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]'}`}>
                        {appt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageLayout>
  );
}

function StatCard({ icon: Icon, iconColor, iconBg, label, value, sub, onClick, alert }) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`bg-[var(--color-surface)] rounded-[var(--radius-lg)] border p-4 text-left w-full transition-colors ${
        alert ? 'border-red-300' : 'border-[var(--color-border)]'
      } ${onClick ? 'hover:bg-[var(--color-bg)] cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-[var(--color-text-secondary)] font-medium">{label}</p>
        <div className={`w-8 h-8 rounded-[var(--radius)] ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      <p className="text-xl font-bold text-[var(--color-text)]">{value}</p>
      {sub && <p className={`text-xs mt-1 ${alert ? 'text-red-500 font-medium' : 'text-[var(--color-text-secondary)]'}`}>{sub}</p>}
    </Wrapper>
  );
}
