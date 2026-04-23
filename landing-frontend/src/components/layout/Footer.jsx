import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Footer() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    fetch('/api/v1/public/platform-info')
      .then(r => r.json())
      .then(j => setInfo(j.data || null))
      .catch(() => {});
  }, []);

  const companyName  = info?.company_name  || 'HealthCenter.lk';
  const supportEmail = info?.support_email || info?.sales_email || null;

  const [first, ...rest] = companyName.split('.');
  const brandHtml = rest.length
    ? <>{first}<em style={{ fontStyle: 'normal', color: '#a5b4fc' }}>.{rest.join('.')}</em></>
    : companyName;

  return (
    <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '36px 0' }}>
      <div className="flex items-center justify-between flex-wrap gap-4 max-w-[1140px] mx-auto px-6">
        <div className="flex items-center gap-2.5">
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg,#6366f1,#06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 20 20" fill="none" width={16} height={16}>
              <path d="M10 2v16M2 10h16" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{brandHtml}</span>
        </div>

        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} {companyName} · All rights reserved
        </span>

        <div className="flex items-center gap-5">
          {supportEmail && (
            <a href={`mailto:${supportEmail}`} style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>
              {supportEmail}
            </a>
          )}
          <a href="/#features" style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>Features</a>
          <a href="/#pricing"  style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>Pricing</a>
          <Link to="/guide"    style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>User Guide</Link>
        </div>
      </div>
    </footer>
  );
}
