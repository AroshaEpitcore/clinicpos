import { useState, useEffect } from 'react';
import { Megaphone, Plus, Trash2, Send, Archive, Pencil, X, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { adminAnnouncementsApi } from '../api/admin';

const PRIORITY_META = {
  urgent: { label: 'Urgent', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  normal: { label: 'Normal', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  info:   { label: 'Info',   cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
};

const STATUS_META = {
  draft:     { label: 'Draft',     cls: 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)]' },
  published: { label: 'Published', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  archived:  { label: 'Archived',  cls: 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]' },
};

function Badge({ meta }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

function AnnouncementModal({ item, onClose, onSaved }) {
  const isEdit = !!item?.id;
  const [form, setForm] = useState({
    title:      item?.title      || '',
    message:    item?.message    || '',
    priority:   item?.priority   || 'normal',
    expires_at: item?.expires_at ? item.expires_at.slice(0, 16) : '',
  });
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setSaving(true);
    try {
      const body = {
        title:      form.title.trim(),
        message:    form.message.trim(),
        priority:   form.priority,
        expires_at: form.expires_at || null,
      };
      if (isEdit) {
        await adminAnnouncementsApi.update(item.id, body);
        toast.success('Announcement updated');
      } else {
        await adminAnnouncementsApi.create(body);
        toast.success('Announcement created as draft');
      }
      onSaved();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h3 className="font-semibold text-[var(--color-text)]">
            {isEdit ? 'Edit Announcement' : 'New Announcement'}
          </h3>
          <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Title *</label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Scheduled maintenance on Friday"
              className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Message *</label>
            <textarea
              value={form.message}
              onChange={e => set('message', e.target.value)}
              rows={4}
              placeholder="Write your announcement message..."
              className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Priority</label>
              <div className="relative">
                <select
                  value={form.priority}
                  onChange={e => set('priority', e.target.value)}
                  className="w-full appearance-none px-3 py-2 pr-8 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="info">Info</option>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)] pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Expires at (optional)</label>
              <input
                type="datetime-local"
                value={form.expires_at}
                onChange={e => set('expires_at', e.target.value)}
                className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--color-border)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-[var(--radius)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm rounded-[var(--radius)] bg-[var(--color-primary)] text-white font-medium hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Draft'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AnnouncementsPage() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');
  const [modal,   setModal]   = useState(null); // null | 'create' | announcement object (edit)
  const [deleting, setDeleting] = useState(null);

  async function load() {
    try {
      const res = await adminAnnouncementsApi.list();
      setItems(res.data.data || []);
    } catch {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handlePublish(id) {
    try {
      await adminAnnouncementsApi.publish(id);
      toast.success('Published — all clinics will see this');
      load();
    } catch {
      toast.error('Failed to publish');
    }
  }

  async function handleArchive(id) {
    try {
      await adminAnnouncementsApi.archive(id);
      toast.success('Archived');
      load();
    } catch {
      toast.error('Failed to archive');
    }
  }

  async function handleDelete(id) {
    try {
      await adminAnnouncementsApi.delete(id);
      toast.success('Deleted');
      setDeleting(null);
      load();
    } catch {
      toast.error('Failed to delete');
    }
  }

  const filtered = items.filter(i => filter === 'all' || i.status === filter);
  const counts   = {
    all:       items.length,
    draft:     items.filter(i => i.status === 'draft').length,
    published: items.filter(i => i.status === 'published').length,
    archived:  items.filter(i => i.status === 'archived').length,
  };

  const FILTERS = [
    { key: 'all',       label: 'All' },
    { key: 'draft',     label: 'Draft' },
    { key: 'published', label: 'Published' },
    { key: 'archived',  label: 'Archived' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">Announcements</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Broadcast messages to all clinic dashboards
          </p>
        </div>
        <button
          onClick={() => setModal('create')}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-medium rounded-[var(--radius)] hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          New Announcement
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-4">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-xs opacity-70">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
        {loading ? (
          <div className="py-20 text-center text-sm text-[var(--color-text-secondary)]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Megaphone className="w-10 h-10 text-[var(--color-text-secondary)] mx-auto mb-3 opacity-40" />
            <p className="text-sm text-[var(--color-text-secondary)]">No announcements yet</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {filtered.map(item => (
              <div key={item.id} className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-sm text-[var(--color-text)]">{item.title}</span>
                      <Badge meta={STATUS_META[item.status] || STATUS_META.draft} />
                      <Badge meta={PRIORITY_META[item.priority] || PRIORITY_META.normal} />
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-2">{item.message}</p>
                    <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
                      <span>Created {new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      {item.published_at && (
                        <span>Published {new Date(item.published_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      )}
                      {item.expires_at && (
                        <span>Expires {new Date(item.expires_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      )}
                      {item.read_count > 0 && (
                        <span>{item.read_count} clinic{item.read_count !== 1 ? 's' : ''} dismissed</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {item.status === 'draft' && (
                      <>
                        <button
                          onClick={() => setModal(item)}
                          title="Edit"
                          className="p-2 rounded-[var(--radius)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePublish(item.id)}
                          title="Publish"
                          className="p-2 rounded-[var(--radius)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-emerald-600"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {item.status === 'published' && (
                      <button
                        onClick={() => handleArchive(item.id)}
                        title="Archive"
                        className="p-2 rounded-[var(--radius)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleting(item.id)}
                      title="Delete"
                      className="p-2 rounded-[var(--radius)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {modal && (
        <AnnouncementModal
          item={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}

      {/* Delete confirm */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-[var(--color-text)] mb-2">Delete announcement?</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-5">
              This cannot be undone. Clinics will no longer see this message.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleting(null)}
                className="px-4 py-2 text-sm rounded-[var(--radius)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleting)}
                className="px-4 py-2 text-sm rounded-[var(--radius)] bg-red-500 text-white font-medium hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
