import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Package, AlertTriangle, Clock, Search, Edit2, Trash2, X } from 'lucide-react';
import { PageLayout }   from '../../components/layout/PageLayout';
import { PageHeader }   from '../../components/ui/PageHeader';
import { Button }       from '../../components/ui/Button';
import { Input }        from '../../components/ui/Input';
import { DatePicker }   from '../../components/ui/DatePicker';
import { Select }       from '../../components/ui/Select';
import { Modal }        from '../../components/ui/Modal';
import { Badge }        from '../../components/ui/Badge';
import { EmptyState }   from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/Spinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { medicinesApi } from '../../api/medicines';
import { formatDate }   from '../../utils/format';

const UNIT_OPTIONS = [
  { value: 'Tablet',    label: 'Tablet' },
  { value: 'Capsule',   label: 'Capsule' },
  { value: 'Syrup',     label: 'Syrup (ml)' },
  { value: 'Injection', label: 'Injection' },
  { value: 'Cream',     label: 'Cream (g)' },
  { value: 'Drops',     label: 'Drops' },
  { value: 'Inhaler',   label: 'Inhaler' },
  { value: 'Patch',     label: 'Patch' },
  { value: 'Sachet',    label: 'Sachet' },
  { value: 'Other',     label: 'Other' },
];

const CATEGORY_OPTIONS = [
  { value: 'Antibiotic',    label: 'Antibiotic' },
  { value: 'Painkiller',    label: 'Painkiller / Analgesic' },
  { value: 'Antifungal',    label: 'Antifungal' },
  { value: 'Antiviral',     label: 'Antiviral' },
  { value: 'Vitamin',       label: 'Vitamin / Supplement' },
  { value: 'Antacid',       label: 'Antacid' },
  { value: 'Antihistamine', label: 'Antihistamine' },
  { value: 'Cardiovascular',label: 'Cardiovascular' },
  { value: 'Diabetes',      label: 'Diabetes' },
  { value: 'Respiratory',   label: 'Respiratory' },
  { value: 'Dermatology',   label: 'Dermatology' },
  { value: 'Other',         label: 'Other' },
];

const FILTER_TABS = [
  { key: 'all',        label: 'All Medicines' },
  { key: 'low_stock',  label: 'Low Stock' },
  { key: 'expiring',   label: 'Near Expiry' },
];

export default function MedicineStorePage() {
  const [medicines,    setMedicines]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [filterTab,    setFilterTab]    = useState('all');
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editTarget,   setEditTarget]   = useState(null); // medicine obj or null for add
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      if (filterTab === 'low_stock') {
        res = await medicinesApi.lowStock();
      } else if (filterTab === 'expiring') {
        res = await medicinesApi.nearExpiry();
      } else {
        res = await medicinesApi.list({ search: search || undefined });
      }
      setMedicines(res.data.data);
    } catch {
      toast.error('Could not load medicines.');
    } finally {
      setLoading(false);
    }
  }, [filterTab, search]);

  useEffect(() => {
    const t = setTimeout(() => load(), search ? 400 : 0);
    return () => clearTimeout(t);
  }, [load, search, filterTab]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await medicinesApi.remove(deleteTarget.id);
      toast.success(`${deleteTarget.name} removed`);
      setDeleteTarget(null);
      load();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  function openAdd()  { setEditTarget(null);  setModalOpen(true); }
  function openEdit(m) { setEditTarget(m);     setModalOpen(true); }

  const today = new Date().toISOString().split('T')[0];
  const in60  = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];

  return (
    <PageLayout title="Medicine Store">
      <PageHeader
        title="Medicine Store"
        subtitle="Manage clinic medicines, stock, and pricing"
        actions={<Button onClick={openAdd}>+ Add Medicine</Button>}
      />

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-[var(--color-border)] mb-4">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              filterTab === tab.key
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + count */}
      <div className="flex items-center gap-3 mb-4">
        {filterTab === 'all' && (
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
            <input
              type="text"
              placeholder="Search by name, generic name, brand, category…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
        {!loading && (
          <span className="text-sm text-[var(--color-text-secondary)] shrink-0">
            {medicines.length} medicine{medicines.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <LoadingState message="Loading medicines..." />
      ) : medicines.length === 0 ? (
        <EmptyState
          icon={Package}
          title={filterTab === 'low_stock' ? 'No low stock medicines' : filterTab === 'expiring' ? 'No medicines expiring soon' : 'No medicines found'}
          description={filterTab === 'all' ? 'Add medicines to the store to get started.' : undefined}
          action={filterTab === 'all' ? <Button size="sm" onClick={openAdd}>+ Add Medicine</Button> : undefined}
        />
      ) : (
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Medicine</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Category</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Stock</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Price</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Expiry</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {medicines.map(med => {
                const isLow    = med.stock_quantity <= med.reorder_level;
                const isExpiring = med.expiry_date && med.expiry_date <= in60;
                const isExpired  = med.expiry_date && med.expiry_date < today;

                return (
                  <tr key={med.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {(isLow || isExpired || isExpiring) && (
                          <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${isExpired ? 'text-[var(--color-danger)]' : 'text-[var(--color-warning)]'}`} />
                        )}
                        <div>
                          <p className="text-sm font-medium text-[var(--color-text)]">
                            {med.name}
                            {med.strength && <span className="ml-1 text-xs text-[var(--color-text-secondary)]">{med.strength}</span>}
                          </p>
                          {med.generic_name && <p className="text-xs text-[var(--color-text-secondary)]">{med.generic_name}</p>}
                          <p className="text-xs text-[var(--color-text-secondary)]">{med.unit}{med.brand ? ` · ${med.brand}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--color-text-secondary)]">{med.category || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-semibold ${isLow ? 'text-[var(--color-danger)]' : 'text-[var(--color-text)]'}`}>
                        {med.stock_quantity}
                      </span>
                      {isLow && <span className="ml-1 text-xs text-[var(--color-danger)]">(low)</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-[var(--color-text)]">
                        {med.selling_price ? `LKR ${parseFloat(med.selling_price).toFixed(2)}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {med.expiry_date ? (
                        <span className={`text-sm ${isExpired ? 'text-[var(--color-danger)] font-medium' : isExpiring ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-secondary)]'}`}>
                          {formatDate(med.expiry_date)}
                          {isExpired && ' (expired)'}
                          {!isExpired && isExpiring && ` (${med.days_until_expiry ?? ''}d)`}
                        </span>
                      ) : <span className="text-xs text-[var(--color-text-secondary)]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {!med.is_active ? (
                        <Badge variant="neutral" label="Inactive" />
                      ) : isExpired ? (
                        <Badge variant="danger" label="Expired" />
                      ) : isExpiring ? (
                        <Badge variant="warning" label="Expiring" />
                      ) : isLow ? (
                        <Badge variant="warning" label="Low Stock" />
                      ) : (
                        <Badge variant="success" label="In Stock" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(med)}
                          className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {med.is_active && (
                          <button onClick={() => setDeleteTarget(med)}
                            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      <MedicineModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => { setModalOpen(false); load(); }}
        medicine={editTarget}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Remove Medicine"
        message={`Remove "${deleteTarget?.name}" from the store? It won't appear in future prescriptions.`}
        confirmLabel="Remove"
        confirmVariant="danger"
      />
    </PageLayout>
  );
}

// ── Add / Edit Medicine Modal ─────────────────────────────────────────────────
function MedicineModal({ open, onClose, onSuccess, medicine }) {
  const isEdit = !!medicine;

  const {
    register, handleSubmit, setValue, watch, reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: medicine ? {
      name:           medicine.name,
      generic_name:   medicine.generic_name  || '',
      brand:          medicine.brand         || '',
      category:       medicine.category      || '',
      unit:           medicine.unit,
      strength:       medicine.strength      || '',
      stock_quantity: medicine.stock_quantity ?? 0,
      reorder_level:  medicine.reorder_level  ?? 10,
      selling_price:  medicine.selling_price  || '',
      expiry_date:    medicine.expiry_date?.split('T')[0] || '',
    } : {
      stock_quantity: 0,
      reorder_level:  10,
    },
  });

  useEffect(() => {
    if (open) {
      reset(medicine ? {
        name:           medicine.name,
        generic_name:   medicine.generic_name  || '',
        brand:          medicine.brand         || '',
        category:       medicine.category      || '',
        unit:           medicine.unit,
        strength:       medicine.strength      || '',
        stock_quantity: medicine.stock_quantity ?? 0,
        reorder_level:  medicine.reorder_level  ?? 10,
        selling_price:  medicine.selling_price  || '',
        expiry_date:    medicine.expiry_date?.split('T')[0] || '',
      } : { stock_quantity: 0, reorder_level: 10 });
    }
  }, [open, medicine, reset]);

  async function onSubmit(data) {
    try {
      if (isEdit) {
        await medicinesApi.update(medicine.id, data);
        toast.success('Medicine updated');
      } else {
        await medicinesApi.create(data);
        toast.success(`${data.name} added to store`);
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Medicine' : 'Add Medicine'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="medicine-form" loading={isSubmitting}>
            {isEdit ? 'Save Changes' : 'Add Medicine'}
          </Button>
        </>
      }
    >
      <form id="medicine-form" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Medicine Name" required
              placeholder="e.g. Paracetamol"
              error={errors.name?.message}
              {...register('name', { required: 'Name is required' })}
            />
          </div>
          <Input label="Generic Name" placeholder="e.g. Acetaminophen" {...register('generic_name')} />
          <Input label="Brand" placeholder="e.g. Panadol" {...register('brand')} />
          <Select
            label="Unit" required
            options={UNIT_OPTIONS}
            value={watch('unit')}
            onValueChange={v => setValue('unit', v)}
            error={errors.unit?.message}
          />
          <Input label="Strength" placeholder="e.g. 500mg, 10ml" {...register('strength')} />
          <Select
            label="Category"
            options={CATEGORY_OPTIONS}
            value={watch('category')}
            onValueChange={v => setValue('category', v)}
          />
          <Input label="Selling Price (LKR)" type="number" step="0.01" placeholder="0.00"
            {...register('selling_price')} />
          <Input label="Stock Quantity" type="number" required
            error={errors.stock_quantity?.message}
            {...register('stock_quantity', { required: 'Required', min: { value: 0, message: 'Cannot be negative' } })}
          />
          <Input label="Reorder Level" type="number"
            {...register('reorder_level', { min: { value: 0, message: 'Cannot be negative' } })}
          />
          <div className="col-span-2">
            <DatePicker label="Expiry Date"
              value={watch('expiry_date') || ''}
              onChange={v => setValue('expiry_date', v)}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
