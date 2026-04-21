/**
 * DisplayPage — Public waiting-room TV display.
 * Accessible at /display (no login required).
 * Shows each active doctor's current patient and queue.
 * Auto-refreshes every 30 seconds.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Maximize2, Minimize2, RefreshCw, Zap, Clock, Wifi, WifiOff } from 'lucide-react';
import { portalApi } from '../../api/portal';
import { mediaUrl } from '../../utils/mediaUrl';

const REFRESH_INTERVAL = 10; // seconds

// ── Grid column count based on doctor count ──────────────────────────────────
function gridCols(n) {
  if (n === 1) return 'grid-cols-1';
  if (n === 2) return 'grid-cols-2';
  if (n === 3) return 'grid-cols-3';
  if (n === 4) return 'grid-cols-2';   // 2×2
  return 'grid-cols-3';               // 5+ → 3-col wrap
}

// ── Token display — large number with colour ─────────────────────────────────
function TokenBadge({ token, type, size = 'lg' }) {
  const isEmergency = type === 'emergency';
  const num  = token != null ? String(token).padStart(2, '0') : '—';
  const base = size === 'lg'
    ? 'text-7xl font-black leading-none tabular-nums'
    : 'text-3xl font-bold tabular-nums';
  const color = isEmergency
    ? 'text-red-400'
    : 'text-blue-300';

  return (
    <span className={`${base} ${color} block`}>{num}</span>
  );
}

// ── Single doctor column ──────────────────────────────────────────────────────
function DoctorCard({ doctor, singleDoc }) {
  const hasPatient = !!doctor.now_seeing;

  return (
    <div className={`flex flex-col rounded-2xl overflow-hidden border ${
      hasPatient
        ? 'border-blue-500/40 bg-blue-950/30'
        : 'border-white/10 bg-white/5'
    }`}>
      {/* Doctor header */}
      <div className={`px-6 py-4 border-b ${
        hasPatient ? 'border-blue-500/30 bg-blue-900/40' : 'border-white/10 bg-white/5'
      }`}>
        <p className="text-xs font-bold uppercase tracking-widest text-blue-300 mb-1">
          {doctor.specialization || 'Doctor'}
        </p>
        <p className={`font-bold text-white ${singleDoc ? 'text-2xl' : 'text-xl'}`}>
          {doctor.name}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            hasPatient
              ? 'bg-green-500/20 text-green-300'
              : doctor.waiting_count > 0
                ? 'bg-yellow-500/20 text-yellow-300'
                : 'bg-white/10 text-white/40'
          }`}>
            {hasPatient ? 'In Consultation' : doctor.waiting_count > 0 ? 'Available' : 'No Patients'}
          </span>
          <span className="text-xs text-white/40">
            {doctor.completed_today} done · {doctor.waiting_count} waiting
          </span>
        </div>
      </div>

      {/* Now Seeing */}
      <div className="px-6 py-5 flex-1">
        <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">
          Now Seeing
        </p>
        {hasPatient ? (
          <div className="flex items-end gap-4">
            <div>
              <p className="text-xs text-white/40 mb-1">Token</p>
              <TokenBadge token={doctor.now_seeing.token} type={doctor.now_seeing.type} size="lg" />
              {doctor.now_seeing.type === 'emergency' && (
                <span className="flex items-center gap-1 text-xs text-red-400 font-bold mt-1">
                  <Zap className="w-3 h-3" /> Emergency
                </span>
              )}
            </div>
            <div className="pb-1">
              <p className="text-2xl font-semibold text-white">{doctor.now_seeing.first_name}</p>
              {doctor.now_seeing.time && (
                <p className="text-sm text-white/50 mt-0.5">{doctor.now_seeing.time.slice(0, 5)}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="py-4">
            <p className="text-4xl font-bold text-white/20">—</p>
            <p className="text-sm text-white/30 mt-1">No patient currently</p>
          </div>
        )}
      </div>

      {/* Next Up */}
      {doctor.next_up.length > 0 && (
        <div className="px-6 pb-5">
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">
            Next Up
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            {doctor.next_up.map((appt, i) => (
              <div key={i} className={`flex flex-col items-center px-3 py-2 rounded-xl ${
                i === 0 ? 'bg-white/10' : 'bg-white/5'
              }`}>
                <TokenBadge token={appt.token} type={appt.type} size="sm" />
                {appt.type === 'emergency' && <Zap className="w-3 h-3 text-red-400 mt-0.5" />}
              </div>
            ))}
            {doctor.waiting_count > doctor.next_up.length && (
              <span className="text-sm text-white/30 ml-1">
                +{doctor.waiting_count - doctor.next_up.length} more
              </span>
            )}
          </div>
        </div>
      )}

      {doctor.next_up.length === 0 && doctor.waiting_count === 0 && (
        <div className="px-6 pb-5">
          <p className="text-sm text-white/20 italic">Queue is empty</p>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DisplayPage() {
  const [data,        setData]        = useState(null);
  const [error,       setError]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [countdown,   setCountdown]   = useState(REFRESH_INTERVAL);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isFullscreen,setIsFullscreen]= useState(false);
  const [online,      setOnline]      = useState(navigator.onLine);
  const [now,         setNow]         = useState(new Date());

  const countdownRef = useRef(null);

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Online/offline detection
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await portalApi.getQueueDisplay();
      setData(res.data.data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Queue display is not enabled for this clinic.');
      } else {
        setError('Could not load queue data. Retrying...');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + interval refresh
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
      setCountdown(REFRESH_INTERVAL);
    }, REFRESH_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Countdown tick
  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown(c => c <= 1 ? REFRESH_INTERVAL : c - 1);
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, []);

  // Fullscreen toggle
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // ── Error / disabled state ────────────────────────────────────────────────
  if (!loading && error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-center px-6">
        <div>
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <WifiOff className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-white text-xl font-semibold mb-2">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="mt-4 px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-white/40 animate-spin mx-auto mb-3" />
          <p className="text-white/40 text-sm">Loading queue display...</p>
        </div>
      </div>
    );
  }

  const { clinic, doctors } = data;
  const activeDoctors = doctors.filter(d =>
    d.now_seeing || d.waiting_count > 0 || d.completed_today > 0
  );
  const displayDoctors = activeDoctors.length > 0 ? activeDoctors : doctors;
  const cols = gridCols(displayDoctors.length);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col select-none overflow-hidden">

      {/* ── Header ── */}
      <header className="shrink-0 flex items-center justify-between px-8 py-4 border-b border-white/10 bg-gray-900/80 backdrop-blur">
        {/* Clinic branding */}
        <div className="flex items-center gap-4">
          {clinic.logo_url && (
            <img
              src={mediaUrl(clinic.logo_url)}
              alt="logo"
              className="h-10 w-auto object-contain rounded"
            />
          )}
          <div>
            <p className="text-xl font-bold text-white">{clinic.name}</p>
            {clinic.phone && (
              <p className="text-xs text-white/40">{clinic.phone}</p>
            )}
          </div>
        </div>

        {/* Clock */}
        <div className="text-right">
          <p className="text-3xl font-bold tabular-nums text-white">{timeStr}</p>
          <p className="text-xs text-white/40 mt-0.5">{dateStr}</p>
        </div>
      </header>

      {/* ── Doctor grid ── */}
      <main className="flex-1 overflow-auto p-6">
        {displayDoctors.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <Clock className="w-16 h-16 text-white/10 mb-4" />
            <p className="text-2xl font-bold text-white/20">No appointments today</p>
            <p className="text-white/10 mt-2 text-sm">Queue will update automatically</p>
          </div>
        ) : (
          <div className={`grid ${cols} gap-5 h-full`}>
            {displayDoctors.map(doc => (
              <DoctorCard
                key={doc.id}
                doctor={doc}
                singleDoc={displayDoctors.length === 1}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Footer status bar ── */}
      <footer className="shrink-0 flex items-center justify-between px-8 py-2 border-t border-white/10 bg-gray-900/80 text-xs text-white/30">
        <div className="flex items-center gap-2">
          {online
            ? <Wifi className="w-3.5 h-3.5 text-green-400" />
            : <WifiOff className="w-3.5 h-3.5 text-red-400" />
          }
          <span>{online ? 'Live' : 'Offline'}</span>
          {lastUpdated && (
            <span className="ml-2">
              Updated {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Countdown ring */}
          <div className="flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3" />
            <span>Refreshing in {countdown}s</span>
          </div>

          {/* Manual refresh */}
          <button
            onClick={() => { fetchData(); setCountdown(REFRESH_INTERVAL); }}
            className="hover:text-white/60 transition-colors"
            title="Refresh now"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="hover:text-white/60 transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen
              ? <Minimize2 className="w-3.5 h-3.5" />
              : <Maximize2 className="w-3.5 h-3.5" />
            }
          </button>
        </div>
      </footer>
    </div>
  );
}
