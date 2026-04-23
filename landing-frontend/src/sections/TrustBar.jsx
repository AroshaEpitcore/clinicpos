const items = [
  { icon: '🔒', text: 'SSL Encrypted' },
  { icon: '☁️', text: 'Cloud Hosted' },
  { icon: '🇱🇰', text: 'Built for Sri Lanka' },
  { icon: '⚡', text: '99.9% Uptime' },
  { icon: '💾', text: 'Daily Backups' },
  { icon: '🎯', text: 'Free Onboarding' },
];

export default function TrustBar() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      borderTop: '1px solid rgba(255,255,255,0.05)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      padding: '20px 0',
    }}>
      <div className="flex items-center justify-center flex-wrap gap-5 max-w-[1140px] mx-auto px-6">
        {items.map((item, i) => (
          <>
            <div key={item.text} className="flex items-center gap-2.5">
              <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-sub)', fontWeight: 500 }}>{item.text}</span>
            </div>
            {i < items.length - 1 && (
              <div key={`div-${i}`} className="hidden sm:block" style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)' }} />
            )}
          </>
        ))}
      </div>
    </div>
  );
}
