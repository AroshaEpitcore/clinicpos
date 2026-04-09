import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { PageLayout }   from '../../components/layout/PageLayout';
import { PageHeader }   from '../../components/ui/PageHeader';
import { Button }       from '../../components/ui/Button';
import { Card }         from '../../components/ui/Card';
import { Table }        from '../../components/ui/Table';
import { Badge }        from '../../components/ui/Badge';
import { EmptyState }   from '../../components/ui/EmptyState';
import { Spinner }      from '../../components/ui/Spinner';
import { RegisterPatientModal } from './components/RegisterPatientModal';
import { patientsApi }  from '../../api/patients';
import { formatDate, formatAge } from '../../utils/format';
import { useAuth }      from '../../store/AuthContext';

export default function PatientList() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const canRegister = ['receptionist', 'admin'].includes(user?.role);

  // ── Patient list state ────────────────────────────────────────────────────
  const [patients,    setPatients]    = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [search,      setSearch]      = useState('');
  const [loading,     setLoading]     = useState(true);

  // ── Returning patient search ──────────────────────────────────────────────
  const [phoneQuery,      setPhoneQuery]      = useState('');
  const [phoneResults,    setPhoneResults]    = useState([]);
  const [phoneSearching,  setPhoneSearching]  = useState(false);
  const [phoneSearched,   setPhoneSearched]   = useState(false);

  // ── Modal ─────────────────────────────────────────────────────────────────
  const [showRegister, setShowRegister] = useState(false);

  // ── Load patients ─────────────────────────────────────────────────────────
  const loadPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await patientsApi.list({ search, page, limit: 20 });
      const { patients: rows, total: t, totalPages: tp } = res.data.data;
      setPatients(rows);
      setTotal(t);
      setTotalPages(tp);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  // Reset to page 1 when search changes
  useEffect(() => { setPage(1); }, [search]);

  // ── Phone search ──────────────────────────────────────────────────────────
  async function handlePhoneSearch(e) {
    e.preventDefault();
    if (!phoneQuery.trim()) return;
    setPhoneSearching(true);
    setPhoneSearched(false);
    try {
      const res = await patientsApi.searchReturning(phoneQuery.trim());
      setPhoneResults(res.data.data);
      setPhoneSearched(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setPhoneSearching(false);
    }
  }

  function handleRegistered(patient) {
    loadPatients();
    navigate(`/patients/${patient.id}`);
  }

  // ── Table columns ─────────────────────────────────────────────────────────
  const columns = [
    { key: 'patient_code', header: 'Patient ID' },
    {
      key: 'name', header: 'Name',
      render: row => (
        <div>
          <p className="font-medium text-[var(--color-text)]">
            {row.first_name} {row.last_name}
          </p>
          {row.allergies && (
            <p className="text-xs text-[var(--color-danger)] mt-0.5">⚠ {row.allergies}</p>
          )}
        </div>
      ),
    },
    { key: 'phone', header: 'Phone' },
    {
      key: 'dob', header: 'Age / DOB',
      render: row => (
        <span className="text-sm">
          {formatAge(row.date_of_birth)} &nbsp;·&nbsp; {formatDate(row.date_of_birth)}
        </span>
      ),
    },
    {
      key: 'gender', header: 'Gender',
      render: row => <span className="capitalize text-sm">{row.gender}</span>,
    },
    {
      key: 'actions', header: '',
      render: row => (
        <Button variant="ghost" size="sm" onClick={() => navigate(`/patients/${row.id}`)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <PageLayout title="Patients">

      {/* ── Returning Patient Quick Search ─────────────────────────────────── */}
      <Card className="mb-6">
        <p className="text-sm font-semibold text-[var(--color-text)] mb-3">
          Returning Patient? Search by phone
        </p>
        <form onSubmit={handlePhoneSearch} className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
            <input
              type="tel"
              placeholder="Enter phone number..."
              value={phoneQuery}
              onChange={e => { setPhoneQuery(e.target.value); setPhoneSearched(false); setPhoneResults([]); }}
              className="w-full pl-9 pr-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <Button type="submit" loading={phoneSearching}>Search</Button>
        </form>

        {/* Phone search results */}
        {phoneSearching && (
          <div className="flex items-center gap-2 mt-3 text-sm text-[var(--color-text-secondary)]">
            <Spinner size="sm" /> Searching...
          </div>
        )}
        {phoneSearched && phoneResults.length === 0 && (
          <div className="mt-3 flex items-center justify-between p-3 rounded-[var(--radius)] bg-[var(--color-bg)] border border-[var(--color-border)]">
            <p className="text-sm text-[var(--color-text-secondary)]">No patient found with that phone number.</p>
            {canRegister && (
              <Button size="sm" onClick={() => setShowRegister(true)}>Register as New</Button>
            )}
          </div>
        )}
        {phoneResults.length > 0 && (
          <div className="flex flex-col gap-2 mt-3">
            {phoneResults.map(p => (
              <div
                key={p.id}
                onClick={() => navigate(`/patients/${p.id}`)}
                className="flex items-center justify-between p-3 rounded-[var(--radius)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] cursor-pointer transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    {p.first_name} {p.last_name}
                    <span className="ml-2 text-xs font-normal text-[var(--color-text-secondary)]">{p.patient_code}</span>
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {p.phone} &nbsp;·&nbsp; {formatAge(p.date_of_birth)} &nbsp;·&nbsp; {p.gender}
                    {p.allergies && <span className="text-[var(--color-danger)] ml-2">⚠ {p.allergies}</span>}
                  </p>
                </div>
                <span className="text-xs text-[var(--color-primary)] font-medium shrink-0 ml-4">View Profile →</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Patient List ───────────────────────────────────────────────────── */}
      <PageHeader
        title="All Patients"
        subtitle={total > 0 ? `${total} patients registered` : undefined}
        actions={
          canRegister && (
            <Button onClick={() => setShowRegister(true)}>+ Register Patient</Button>
          )
        }
      />

      {/* Search bar */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
        <input
          type="text"
          placeholder="Search by name, phone, or patient ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
      </div>

      <Table
        columns={columns}
        data={patients}
        loading={loading}
        emptyMessage="No patients registered yet."
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Empty state when no patients at all */}
      {!loading && patients.length === 0 && !search && (
        <EmptyState
          icon={Users}
          title="No patients registered yet"
          description="Register your first patient to get started."
          action={canRegister && <Button onClick={() => setShowRegister(true)}>Register First Patient</Button>}
        />
      )}

      <RegisterPatientModal
        open={showRegister}
        onClose={() => setShowRegister(false)}
        onSuccess={handleRegistered}
      />
    </PageLayout>
  );
}
