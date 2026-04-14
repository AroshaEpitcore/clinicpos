import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

/**
 * Landing page for super admin impersonation.
 * URL: /impersonate?token=xxx&subdomain=yyy&clinic_name=zzz&flags={}
 *
 * Reads the token from query params, stores it in AuthContext (localStorage),
 * then redirects to the dashboard.
 */
export default function ImpersonatePage() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const { login }  = useAuth();

  useEffect(() => {
    const token       = params.get('token');
    const clinicName  = params.get('clinic_name') || 'Clinic';
    const currency    = params.get('currency')    || 'LKR';

    let flagsObj = {};
    try { flagsObj = JSON.parse(params.get('flags') || '{}'); } catch {}

    let userObj = {};
    try { userObj = JSON.parse(params.get('user') || '{}'); } catch {}

    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    login(
      token,
      { ...userObj, impersonated: true, impersonatedBy: 'superadmin' },
      flagsObj,
      { name: clinicName, logo_url: null, currency }
    );
    navigate('/dashboard', { replace: true });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-500">Setting up session...</p>
    </div>
  );
}
