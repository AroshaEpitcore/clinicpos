import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

/**
 * Landing page for super admin impersonation.
 * URL: /impersonate?token=xxx&clinic_name=zzz&logo_url=...&flags={}
 *
 * Calls login() to store session, then waits for user state to be committed
 * before navigating to /dashboard (avoids ProtectedRoute race condition).
 */
export default function ImpersonatePage() {
  const [params]          = useSearchParams();
  const navigate          = useNavigate();
  const { login, user }   = useAuth();
  const [ready, setReady] = useState(false);

  // Step 1 — parse params and call login() on mount
  useEffect(() => {
    const token      = params.get('token');
    const clinicName = params.get('clinic_name') || 'Clinic';
    const logoUrl    = params.get('logo_url')    || null;
    const currency   = params.get('currency')    || 'LKR';

    let flagsObj = {};
    try { flagsObj = JSON.parse(params.get('flags') || '{}'); } catch {}

    let userObj = {};
    try { userObj  = JSON.parse(params.get('user')  || '{}'); } catch {}

    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    login(
      token,
      { ...userObj, impersonated: true, impersonatedBy: 'superadmin' },
      flagsObj,
      { name: clinicName, logo_url: logoUrl || null, currency },
    );
    setReady(true);
  }, []);

  // Step 2 — navigate only after user state is committed in AuthContext
  useEffect(() => {
    if (ready && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [ready, user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-500">Setting up session…</p>
    </div>
  );
}
