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
  const brand = rest.length
    ? <>{first}<em className="not-italic text-primary">.{rest.join('.')}</em></>
    : companyName;

  return (
    <footer className="border-t border-primary/10 py-9 bg-surface">
      <div className="flex items-center justify-between flex-wrap gap-4 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <img src="/logosmall.png" alt="HealthCenter.lk" className="w-[30px] h-[30px] object-contain shrink-0" />
          <span className="text-sm font-bold text-ink">{brand}</span>
        </div>

        <span className="text-xs text-ink-faint">
          © {new Date().getFullYear()} {companyName} · All rights reserved
        </span>

        <div className="flex items-center gap-5">
          {supportEmail && (
            <a href={`mailto:${supportEmail}`} className="text-xs text-ink-light hover:text-primary transition-colors">{supportEmail}</a>
          )}
          <a href="/#features" className="text-xs text-ink-light hover:text-primary transition-colors">Features</a>
          <a href="/#pricing"  className="text-xs text-ink-light hover:text-primary transition-colors">Pricing</a>
          <Link to="/guide"    className="text-xs text-ink-light hover:text-primary transition-colors">User Guide</Link>
        </div>
      </div>
    </footer>
  );
}
