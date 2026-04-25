import { useState, useEffect, useCallback } from 'react';
import {
  Activity, Database, Cpu, MemoryStick, Server, Users,
  AlertTriangle, CheckCircle, XCircle, RefreshCw, Clock,
} from 'lucide-react';
import { adminSystemApi } from '../api/admin';

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function ProgressBar({ percent, color = 'primary' }) {
  const colors = {
    primary: 'var(--color-primary)',
    success: '#10b981',
    warning: '#f59e0b',
    danger:  '#ef4444',
  };
  const shade = percent >= 90 ? 'danger' : percent >= 70 ? 'warning' : color;
  return (
    <div className="w-full h-2 rounded-full bg-[var(--color-bg)] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, percent)}%`, backgroundColor: colors[shade] }}
      />
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, badge, badgeOk }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--radius)] flex items-center justify-center bg-[var(--color-primary-light)]">
            <Icon className="w-4 h-4 text-[var(--color-primary)]" />
          </div>
          <span className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</span>
        </div>
        {badge !== undefined && (
          badgeOk
            ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle className="w-3.5 h-3.5" /> {badge}</span>
            : <span className="flex items-center gap-1 text-xs font-semibold text-red-500"><XCircle className="w-3.5 h-3.5" /> {badge}</span>
        )}
      </div>
      <div className="text-xl font-black text-[var(--color-text)]">{value}</div>
      {sub && <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">{sub}</div>}
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-widest mb-3">{title}</h3>
  );
}

export default function SystemHealthPage() {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [countdown,   setCountdown]   = useState(30);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await adminSystemApi.health();
      setData(res.data.data);
      setLastUpdated(new Date());
      setCountdown(30);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { load(true); return 30; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading system health…</span>
        </div>
      </div>
    );
  }

  const { server, memory, cpu, database, application } = data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">System Health</h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            Live server metrics — auto-refreshes every 30s
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--color-text-secondary)]">
            Next refresh in {countdown}s
          </span>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius)] text-xs font-medium
              border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]
              hover:bg-[var(--color-bg)] disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {lastUpdated && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
          <Clock className="w-3.5 h-3.5" />
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}

      {/* DB + overall status row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          icon={Database}
          label="Database"
          value={database?.connected ? 'Connected' : 'Disconnected'}
          sub={database?.response_ms != null ? `${database.response_ms}ms response` : undefined}
          badge={database?.connected ? 'OK' : 'Error'}
          badgeOk={database?.connected}
        />
        <MetricCard icon={Users}          label="Active Tenants"    value={application?.active_tenants ?? '—'}   sub={`${application?.total_tenants ?? 0} total`} />
        <MetricCard icon={AlertTriangle}  label="Errors (1h)"       value={application?.errors_last_hour ?? '—'} sub="4xx / 5xx responses" />
        <MetricCard icon={Activity}       label="Log Entries (24h)" value={application?.logs_last_24h    ?? '—'} sub="mutations + errors" />
      </div>

      {/* Memory */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5">
        <SectionHeader title="Memory" />
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-[var(--color-text)]">Server RAM</span>
              <span className="text-[var(--color-text-secondary)] font-mono">
                {memory?.used_mb} MB / {memory?.total_mb} MB ({memory?.used_percent}%)
              </span>
            </div>
            <ProgressBar percent={memory?.used_percent ?? 0} />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-[var(--color-text)]">Node Heap</span>
              <span className="text-[var(--color-text-secondary)] font-mono">
                {memory?.node_heap_used_mb} MB / {memory?.node_heap_total_mb} MB
              </span>
            </div>
            <ProgressBar
              percent={memory ? Math.round((memory.node_heap_used_mb / memory.node_heap_total_mb) * 100) : 0}
              color="success"
            />
          </div>
          <div className="text-xs text-[var(--color-text-secondary)]">
            RSS (total Node process): {memory?.node_rss_mb} MB
          </div>
        </div>
      </div>

      {/* CPU + Server */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5">
          <SectionHeader title="CPU" />
          <div className="space-y-3">
            <div className="text-xs text-[var(--color-text)] truncate">{cpu?.model}</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: '1m avg',  val: cpu?.load_avg_1m  },
                { label: '5m avg',  val: cpu?.load_avg_5m  },
                { label: '15m avg', val: cpu?.load_avg_15m },
              ].map(({ label, val }) => (
                <div key={label} className="bg-[var(--color-bg)] rounded-[var(--radius)] p-2.5">
                  <div className="text-base font-black text-[var(--color-primary)]">{val}</div>
                  <div className="text-[0.68rem] text-[var(--color-text-secondary)] mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">{cpu?.cores} CPU cores</div>
          </div>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5">
          <SectionHeader title="Server" />
          <div className="space-y-2.5">
            {[
              { label: 'Hostname',        val: server?.hostname },
              { label: 'Platform',        val: server?.platform },
              { label: 'Node.js',         val: server?.node_version },
              { label: 'System uptime',   val: formatUptime(server?.uptime_seconds || 0) },
              { label: 'Process uptime',  val: formatUptime(server?.process_uptime_seconds || 0) },
            ].map(({ label, val }) => (
              <div key={label} className="flex justify-between items-center text-xs">
                <span className="text-[var(--color-text-secondary)]">{label}</span>
                <span className="font-mono text-[var(--color-text)]">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
