import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/index';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);   // { id, name, email, role }
  const [tenantFlags, setTenantFlags] = useState({});     // { pharmacy: bool, lab: bool, ... }
  const [clinic, setClinic]           = useState(null);   // { name, logo_url, currency }
  const [loading, setLoading]         = useState(true);   // restoring session from localStorage

  // Restore session from localStorage on first load, then refresh clinic info from API
  // so all browsers immediately see the latest logo/name without clearing cache.
  useEffect(() => {
    const token       = localStorage.getItem('token');
    const savedUser   = localStorage.getItem('user');
    const savedFlags  = localStorage.getItem('flags');
    const savedClinic = localStorage.getItem('clinic');

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      setTenantFlags(savedFlags  ? JSON.parse(savedFlags)  : {});
      setClinic(savedClinic ? JSON.parse(savedClinic) : null);

      // Background refresh — keeps logo/name in sync across all browsers
      api.get('/settings')
        .then(res => {
          const s = res.data?.data;
          if (!s) return;
          const fresh = {
            name:     s.clinic_name     || null,
            logo_url: s.clinic_logo_url || null,
            currency: s.currency        || 'LKR',
          };
          localStorage.setItem('clinic', JSON.stringify(fresh));
          setClinic(fresh);
        })
        .catch(() => {});
    }
    setLoading(false);
  }, []);

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
