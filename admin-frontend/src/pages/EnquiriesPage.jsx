import { useState, useEffect, useMemo } from 'react';
import { MessageSquare, Search, X, Trash2, Mail, Phone, Building2, Clock, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
import { adminEnquiriesApi } from '../api/admin';
import { Button }      from '../components/ui/Button';
import { Badge }       from '../components/ui/Badge';
import { Modal }       from '../components/ui/Modal';
import { EmptyState }  from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/Spinner';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function EnquiriesPage() {
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState('all');
  const [search,      setSearch]      = useState('');
  const [selected,    setSelected]    = useState(null);
  const [confirmId,   setConfirmId]   = useState(null);
  const [deleting,    setDeleting]    = useState(false);

  async function load() {
    try {
      const r = await adminEnquiriesApi.list();
      setItems(r.data.data || []);
    } catch {
      toast.error('Failed to load enquiries.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function openEnquiry(item) {
    setSelected(item);
    if (!item.is_read) {
      try {
        await adminEnquiriesApi.markRead(item.id);
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_read: true } : i));
        if (selected?.id === item.id) setSelected(s => ({ ...s, is_read: true }));
      } catch {}
    }
  }

  async function handleDelete() {
    if (!confirmId) return;
    setDeleting(true);
    try {
      await adminEnquiriesApi.delete(confirmId);
      setItems(prev => prev.filter(i => i.id !== confirmId));
      if (selected?.id === confirmId) setSelected(null);
      setConfirmId(null);
      toast.success('Deleted successfully');
    } catch {
      toast.error('Failed to delete enquiry.');
    } finally {
      setDeleting(false);
    }
  }

  const unreadCount = items.filter(i => !i.is_read).length;

  const FILTERS = [
    { key: 'all',    label: `All (${items.length})` },
    { key: 'unread', label: `Unread (${unreadCount})` },
    { key: 'read',   label: 'Read' },
  ];

  const filtered = useMemo(() => {
    let list = items;
    if (filter === 'unread') list = list.filter(i => !i.is_read);
    if (filter === 'read')   list = list.filter(i => i.is_read);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.email.toLowerCase().includes(q) ||
        (i.clinic_name || '').toLowerCase().includes(q) ||
        i.message.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, filter, search]);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[var(--color-text)]">Enquiries</h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-danger-light)] text-[var(--color-danger)]">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Contact form submissions from healthcenter.lk
          </p>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={clsx(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              filter === f.key
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-[var(--color-text)]'
            )}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
          <input
            type="text"
            placeholder="Search name, email, clinic..."
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
        {!loading && (
          <span className="text-sm text-[var(--color-text-secondary)] shrink-0">
            {filtered.length} {filtered.length === 1 ? 'enquiry' : 'enquiries'}
          </span>
        )}
      </div>

      {/* List */}
      {loading ? (
        <LoadingState message="Loading enquiries..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={search || filter !== 'all' ? 'No results found' : 'No enquiries yet'}
          description={
            search ? `Nothing matched "${search}".`
            : filter === 'unread' ? 'All enquiries have been read.'
            : 'Contact form submissions will appear here.'
          }
          action={
            (search || filter !== 'all')
              ? <Button size="sm" variant="secondary" onClick={() => { setSearch(''); setFilter('all'); }}>Clear filters</Button>
              : null
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <div
              key={item.id}
              onClick={() => openEnquiry(item)}
              className={clsx(
                'flex items-start gap-4 p-4 rounded-[var(--radius-lg)] border cursor-pointer transition-all hover:shadow-sm group',
                item.is_read
                  ? 'bg-[var(--color-surface)] border-[var(--color-border)]'
                  : 'bg-[var(--color-primary-light)] border-[var(--color-primary)] border-opacity-40'
              )}
            >
              {/* Avatar */}
              <div className={clsx(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors',
                item.is_read
                  ? 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]'
                  : 'bg-[var(--color-primary)] text-white'
              )}>
                {item.name.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className={clsx(
                    'text-sm font-semibold',
                    !item.is_read ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'
                  )}>
                    {item.name}
                  </span>
                  {!item.is_read && <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] shrink-0" />}
                  {item.clinic_name && (
                    <span className="text-xs text-[var(--color-text-secondary)] truncate">— {item.clinic_name}</span>
                  )}
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] mb-1">{item.email}</p>
                <p className="text-sm text-[var(--color-text)] line-clamp-1">{item.message}</p>
              </div>

              <div className="text-right shrink-0 space-y-1">
                <p className="text-xs text-[var(--color-text-secondary)]">{formatDate(item.created_at)}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">{formatTime(item.created_at)}</p>
                <button
                  onClick={e => { e.stopPropagation(); setConfirmId(item.id); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] p-1"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <Modal
          open={!!selected}
          onClose={() => setSelected(null)}
          title="Enquiry Details"
          footer={
            <>
              <Button variant="danger" size="sm" onClick={() => { setConfirmId(selected.id); setSelected(null); }}>
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
              <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
              {selected.email && (
                <a href={`mailto:${selected.email}`}>
                  <Button>
                    <Mail className="w-4 h-4" /> Reply
                  </Button>
                </a>
              )}
            </>
          }
        >
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center text-lg font-bold text-[var(--color-primary)] shrink-0">
                {selected.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--color-text)] truncate">{selected.name}</p>
                <p className="text-sm text-[var(--color-text-secondary)] truncate">{selected.email}</p>
              </div>
              <Badge
                label={selected.is_read ? 'Read' : 'New'}
                variant={selected.is_read ? 'neutral' : 'primary'}
              />
            </div>

            {/* Meta */}
            {(selected.phone || selected.clinic_name) && (
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--color-border)]">
                {selected.phone && (
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> Phone
                    </p>
                    <a href={`tel:${selected.phone}`} className="text-sm text-[var(--color-primary)]">{selected.phone}</a>
                  </div>
                )}
                {selected.clinic_name && (
                  <div>
                    <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" /> Clinic / Practice
                    </p>
                    <p className="text-sm text-[var(--color-text)]">{selected.clinic_name}</p>
                  </div>
                )}
              </div>
            )}

            {/* Message */}
            <div className="pt-3 border-t border-[var(--color-border)]">
              <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Message</p>
              <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap leading-relaxed bg-[var(--color-bg)] rounded-[var(--radius)] p-3">
                {selected.message}
              </p>
            </div>

            {/* Timestamp */}
            <div className="pt-2 border-t border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Received {formatDate(selected.created_at)} at {formatTime(selected.created_at)}
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Enquiry"
        message="Are you sure you want to delete this enquiry? This cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  );
}
