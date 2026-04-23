const items = [
  { icon: '🔒', text: 'SSL Encrypted'       },
  { icon: '☁️', text: 'Cloud Hosted'        },
  { icon: '🇱🇰', text: 'Built for Sri Lanka' },
  { icon: '⚡',  text: '99.9% Uptime'       },
  { icon: '💾', text: 'Daily Backups'       },
  { icon: '🎯', text: 'Free Onboarding'     },
];

export default function TrustBar() {
  return (
    <div className="border-y border-primary/8 bg-surface-alt py-5">
      <div className="flex items-center justify-center flex-wrap gap-4 sm:gap-6 max-w-6xl mx-auto px-4 sm:px-6">
        {items.map((item, i) => (
          <div key={item.text} className="flex items-center gap-2">
            <span className="text-lg">{item.icon}</span>
            <span className="text-xs font-medium text-ink-light">{item.text}</span>
            {i < items.length - 1 && (
              <div className="hidden sm:block w-px h-4 bg-primary/15 ml-4" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
