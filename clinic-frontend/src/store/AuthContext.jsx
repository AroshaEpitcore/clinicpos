import { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../api/index';

const AuthContext = createContext(null);

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [tenantFlags, setTenantFlags] = useState({});
  const [clinic, setClinic]           = useState(null);
  const [loading, setLoading]         = useState(true);

  const lastActiveRef = useRef(Date.now());
  const intervalRef   = useRef(null);
  const handlerRef    = useRef(null);

  function stopIdleWatcher() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (handlerRef.current) {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, handlerRef.current));
      handlerRef.current = null;
    }
  }

  function startIdleWatcher(timeoutMinutes) {
    stopIdleWatcher();
    lastActiveRef.current = Date.now();

    handlerRef.current = () => { lastActiveRef.current = Date.now(); };
    ACTIVITY_EVENTS.forEach(e =>
      window.addEventListener(e, handlerRef.current, { passive: true })
    );

    const timeoutMs = timeoutMinutes * 60 * 1000;
    intervalRef.current = setInterval(() => {
      if (Date.now() - lastActiveRef.current >= timeoutMs) {
        stopIdleWatcher();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('flags');
        localStorage.removeItem('clinic');
        window.location.href = '/login?reason=timeout';
      }
    }, 30_000);
  }

  // Restore session from localStorage on mount
  useEffect(() => {
    const token       = localStorage.getItem('token');
    const savedUser   = localStorage.getItem('user');
    const savedFlags  = localStorage.getItem('flags');
    const savedClinic = localStorage.getItem('clinic');

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      setTenantFlags(savedFlags  ? JSON.parse(savedFlags)  : {});
      setClinic(savedClinic ? JSON.parse(savedClinic) : null);
    }
    setLoading(false);

    return () => stopIdleWatcher();
  }, []);

  // Fetch latest settings + start idle watcher whenever user session becomes active
  useEffect(() => {
    if (!user) return;

    api.get('/settings')
      .then(res => {
        const s = res.data?.data;
        if (!s) return;
        const fresh = {
          name:               s.clinic_name        || null,
          logo_url:           s.clinic_logo_url    || null,
          currency:           s.currency           || 'LKR',
          dual_queue_enabled: s.dual_queue_enabled === true,
        };
        localStorage.setItem('clinic', JSON.stringify(fresh));
        setClinic(fresh);

        const minutes = parseInt(s.session_timeout_minutes, 10) || 480;
        startIdleWatcher(minutes);
      })
      .catch(() => {});
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function login(token, userData, flags, clinicData) {
    localStorage.setItem('token',  token);
    localStorage.setItem('user',   JSON.stringify(userData));
    localStorage.setItem('flags',  JSON.stringify(flags || {}));
    localStorage.setItem('clinic', JSON.stringify(clinicData || {}));

    setUser(userData);
    setTenantFlags(flags   || {});
    setClinic(clinicData   || null);
  }

  function updateClinic(partial) {
    const updated = { ...(clinic || {}), ...partial };
    localStorage.setItem('clinic', JSON.stringify(updated));
    setClinic(updated);
  }

  function logout() {
    stopIdleWatcher();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('flags');
    localStorage.removeItem('clinic');

    setUser(null);
    setTenantFlags({});
    setClinic(null);
  }

  return (
    <AuthContext.Provider value={{ user, tenantFlags, clinic, loading, login, logout, updateClinic }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
