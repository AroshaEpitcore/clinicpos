import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Mail, Phone, MapPin, CreditCard, Settings, Save, Globe, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminPlatformApi } from '../api/admin';
import { Button } from '../components/ui/Button';
import { Input }  from '../components/ui/Input';

const TABS = [
  { id: 'company',  label: 'Company Info',    icon: Building2  },
  { id: 'contact',  label: 'Contact Details', icon: Phone      },
  { id: 'payment',  label: 'Payment Details', icon: CreditCard },
  { id: 'system',   label: 'System',          icon: Settings   },
];

function Section({ title, subtitle, children }) {
  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm">
      <div className="px-6 py-5 border-b border-[var(--color-border)]">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
        {subtitle && <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

function Row({ children }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function TextareaField({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-[var(--color-text)]">{label}</label>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 rounded-[var(--radius)] border text-sm resize-none
          bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]
          focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent
          border-[var(--color-border)]"
      />
    </div>
  );
}

function Toggle({ label, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div>
        <p className="text-sm font-medium text-[var(--color-text)]">{label}</p>
        {description && <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
          transition-colors duration-200 focus:outline-none disabled:opacity-50
          ${checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow
          transition duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );
}

export default function PlatformSettingsPage() {
  const [activeTab, setActiveTab] = useState('company');
  const [settings,  setSettings]  = useState({});
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await adminPlatformApi.get();
      setSettings(res.data.data ?? {});
    } catch {
      toast.error('Failed to load platform settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function field(key) {
    return {
      value:    settings[key] ?? '',
      onChange: e => setSettings(s => ({ ...s, [key]: e.target.value })),
    };
  }

  async function save(keys) {
    setSaving(true);
    try {
      const subset = {};
      keys.forEach(k => {
        const v = settings[k] ?? '';
        if (v !== '') subset[k] = v;
      });
      if (Object.keys(subset).length === 0) {
        toast.info('No values to save — fill in at least one field.');
        setSaving(false);
        return;
      }
      await adminPlatformApi.setBatch(subset);
      toast.success('Settings saved.');
    } catch {
      toast.error('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  const tabContent = {
    company: {
      keys: ['company_name', 'company_tagline', 'company_reg_no'],
      render: () => (
        <Section
          title="Company Information"
          subtitle="Displayed on the landing page, invoices, and platform-wide."
        >
          <Input label="Company Name" placeholder="HealthCenter.lk" {...field('company_name')} />
          <Input label="Tagline" placeholder="Modern Clinic Management Software" {...field('company_tagline')} />
          <Input label="Registration / Business Number" placeholder="PV 12345678" {...field('company_reg_no')} />
        </Section>
      ),
    },

    contact: {
      keys: ['support_email', 'sales_email', 'phone_primary', 'phone_whatsapp', 'address_line1', 'address_line2', 'city', 'country'],
      render: () => (
        <div className="space-y-4">
          <Section title="Email Addresses" subtitle="Used for support contact and displayed on the website.">
            <Row>
              <Input label="Support Email" placeholder="support@healthcenter.lk" {...field('support_email')} />
              <Input label="Sales / General Email" placeholder="sales@healthcenter.lk" {...field('sales_email')} />
            </Row>
          </Section>
          <Section title="Phone Numbers" subtitle="Displayed on the website and subscription page.">
            <Row>
              <Input label="Primary Phone" placeholder="+94 11 XXX XXXX" {...field('phone_primary')} />
              <Input label="WhatsApp Number" placeholder="+94 7X XXX XXXX" {...field('phone_whatsapp')} />
            </Row>
          </Section>
          <Section title="Address" subtitle="Business address shown on website and invoices.">
            <Input label="Address Line 1" placeholder="123 Main Street" {...field('address_line1')} />
            <Input label="Address Line 2" placeholder="Colombo 03" {...field('address_line2')} />
            <Row>
              <Input label="City" placeholder="Colombo" {...field('city')} />
              <Input label="Country" placeholder="Sri Lanka" {...field('country')} />
            </Row>
          </Section>
        </div>
      ),
    },

    payment: {
      keys: ['bank_name', 'bank_account_name', 'bank_account_number', 'bank_branch', 'bank_swift_code', 'payment_instructions'],
      render: () => (
        <div className="space-y-4">
          <Section title="Bank Account Details" subtitle="Shown to clinic admins on their Subscription page for making payments.">
            <Row>
              <Input label="Bank Name" placeholder="Bank of Ceylon" {...field('bank_name')} />
              <Input label="Account Holder Name" placeholder="HealthCenter.lk (Pvt) Ltd" {...field('bank_account_name')} />
            </Row>
            <Row>
              <Input label="Account Number" placeholder="1234567890" {...field('bank_account_number')} />
              <Input label="Branch" placeholder="Colombo Main" {...field('bank_branch')} />
            </Row>
            <Input label="Swift / Branch Code (optional)" placeholder="BCEYLKLX" {...field('bank_swift_code')} />
          </Section>
          <Section title="Payment Instructions" subtitle="Instructions shown to clinic admins alongside the bank details.">
            <TextareaField
              label="Instructions"
              placeholder="Please transfer the subscription fee to the account above and send the payment receipt to support@healthcenter.lk with your clinic name as reference."
              rows={4}
              {...field('payment_instructions')}
            />
          </Section>
        </div>
      ),
    },

    system: {
      keys: ['landing_page_enabled'],
      render: () => (
        <Section title="Platform Controls" subtitle="Global switches that affect the public website.">
          <Toggle
            label="Landing Page"
            description="Show the public marketing page at healthcenter.lk"
            checked={settings.landing_page_enabled !== 'false'}
            onChange={v => setSettings(s => ({ ...s, landing_page_enabled: String(v) }))}
            disabled={saving}
          />
          <div className="pt-1 border-t border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-secondary)]">
              When disabled, healthcenter.lk shows a "Coming Soon" message instead of the marketing page.
            </p>
          </div>
        </Section>
      ),
    },
  };

  const active = tabContent[activeTab];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">Platform Settings</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Company info, contact details, payment and system configuration
          </p>
        </div>
        <Button
          onClick={() => save(active.keys)}
          loading={saving}
          disabled={loading}
        >
          {saving ? <Loader2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          Save Changes
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--color-border)] overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px
              ${activeTab === id
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-[var(--color-text-secondary)]">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading settings…
        </div>
      ) : (
        <div>{active.render()}</div>
      )}

      {/* Preview card — shown on contact + payment tabs */}
      {!loading && (activeTab === 'contact' || activeTab === 'payment') && (
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-[var(--color-primary)]" />
            <span className="text-sm font-semibold text-[var(--color-text)]">Live Preview</span>
            <span className="text-xs text-[var(--color-text-secondary)] ml-1">— as shown on the website and clinic subscription pages</span>
          </div>
          <div className="bg-[var(--color-bg)] rounded-[var(--radius)] p-4 text-sm space-y-2">
            {settings.company_name && (
              <p className="font-bold text-[var(--color-text)]">{settings.company_name}</p>
            )}
            {(settings.address_line1 || settings.address_line2) && (
              <p className="text-[var(--color-text-secondary)] flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{[settings.address_line1, settings.address_line2, settings.city, settings.country].filter(Boolean).join(', ')}</span>
              </p>
            )}
            {settings.phone_primary && (
              <p className="text-[var(--color-text-secondary)] flex items-center gap-2">
                <Phone className="w-4 h-4 shrink-0" /> {settings.phone_primary}
                {settings.phone_whatsapp && settings.phone_whatsapp !== settings.phone_primary && ` · WhatsApp: ${settings.phone_whatsapp}`}
              </p>
            )}
            {settings.support_email && (
              <p className="text-[var(--color-text-secondary)] flex items-center gap-2">
                <Mail className="w-4 h-4 shrink-0" /> {settings.support_email}
              </p>
            )}
            {activeTab === 'payment' && settings.bank_name && (
              <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                <p className="text-xs font-semibold text-[var(--color-text)] mb-1">Bank Transfer Details</p>
                <p className="text-[var(--color-text-secondary)]">{settings.bank_name} · {settings.bank_branch}</p>
                <p className="text-[var(--color-text-secondary)]">Account: {settings.bank_account_name} · {settings.bank_account_number}</p>
                {settings.bank_swift_code && <p className="text-[var(--color-text-secondary)]">SWIFT/Code: {settings.bank_swift_code}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
