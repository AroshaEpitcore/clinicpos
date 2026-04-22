import { useState, useEffect } from 'react';
import {
  CreditCard, Calendar, CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw,
  Phone, Mail, MapPin, Building2,
} from 'lucide-react';
import { PageLayout }   from '../../components/layout/PageLayout';
import { PageHeader }   from '../../components/ui/PageHeader';
import { LoadingState } from '../../components/ui/Spinner';
import { settingsApi }  from '../../api/settings';
import axios            from 'axios';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatPrice(v) {
  if (v == null) return '—';
  return `LKR ${parseFloat(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function DaysWidget({ days }) {
  if (days == null) return null;
  const n = parseInt(days, 10);

  if (n < 0) {
    return (
      <div className="flex items-start gap-3 px-4 py-3 rounded-[var(--radius)] bg-[var(--color-danger-light,#fef2f2)] border border-[var(--color-danger)]">
        <XCircle className="w-5 h-5 text-[var(--color-danger)] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-[var(--color-danger)]">Subscription Expired</p>
          <p className="text-xs text-[var(--color-danger)] opacity-80 mt-0.5">
            Expired {Math.abs(n)} day{Math.abs(n) !== 1 ? 's' : ''} ago. Contact your administrator to renew.
          </p>
        </div>
      </div>
    );
  }

  if (n === 0) {
    return (
      <div className="flex items-start gap-3 px-4 py-3 rounded-[var(--radius)] bg-[#fffbeb] border border-[var(--color-warning,#f59e0b)]">
        <AlertTriangle className="w-5 h-5 text-[var(--color-warning,#d97706)] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-[var(--color-warning,#d97706)]">Expires Today</p>
          <p className="text-xs text-[var(--color-warning,#d97706)] opacity-80 mt-0.5">
            Your subscription expires today. Contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  if (n <= 7) {
    return (
      <div className="flex items-start gap-3 px-4 py-3 rounded-[var(--radius)] bg-[#fffbeb] border border-[var(--color-warning,#f59e0b)]">
        <AlertTriangle className="w-5 h-5 text-[var(--color-warning,#d97706)] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-[var(--color-warning,#d97706)]">Expiring Soon</p>
          <p className="text-xs text-[var(--color-warning,#d97706)] opacity-80 mt-0.5">
            {n} day{n !== 1 ? 's' : ''} remaining. Contact your administrator to renew.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-[var(--radius)] bg-[var(--color-success-light,#f0fdf4)] border border-[var(--color-success)]">
      <CheckCircle className="w-5 h-5 text-[var(--color-success)] shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-[var(--color-success)]">Active Subscription</p>
        <p className="text-xs text-[var(--color-success)] opacity-80 mt-0.5">
          {n} day{n !== 1 ? 's' : ''} remaining until renewal.
        </p>
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [platform, setPlatform] = useState(null);

  useEffect(() => {
    settingsApi.getSubscription()
      .then(res => setData(res.data.data))
      .catch(() => setError('Could not load subscription data.'))
      .finally(() => setLoading(false));

    const base = `${window.location.protocol}//${window.location.host}`;
    axios.get(`${base}/api/v1/public/platform-info`)
      .then(res => setPlatform(res.data.data ?? null))
      .catch(() => {});
  }, []);

  const billingCycle = data?.plan_billing_cycle || data?.plan_type;
  const price = data
    ? (billingCycle === 'monthly' ? data.monthly_price : data.yearly_price)
    : null;

  return (
    <PageLayout title="Subscription">
      <PageHeader
        title="Subscription"
        subtitle="Your current plan and billing details"
      />

      {loading ? (
        <LoadingState message="Loading subscription…" />
      ) : error ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-[var(--radius)] bg-[var(--color-danger-light)] border border-[var(--color-danger)] text-[var(--color-danger)] text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      ) : (
        <div className="space-y-5 max-w-2xl">
          {/* Days status banner */}
          <DaysWidget days={data.days_remaining} />

          {/* Plan card */}
          <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-[var(--color-border)]">
              <div className="w-10 h-10 rounded-[var(--radius)] bg-[var(--color-primary-light)] flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-base font-bold text-[var(--color-text)]">
                  {data.plan_name || 'No Plan Assigned'}
                </p>
                {data.plan_description && (
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{data.plan_description}</p>
                )}
              </div>
              {data.plan_id && (
                <div className="ml-auto text-right">
                  <p className="text-xl font-bold text-[var(--color-text)]">{formatPrice(price)}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    per {billingCycle === 'monthly' ? 'month' : 'year'}
                  </p>
                </div>
              )}
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 divide-x divide-[var(--color-border)]">
              {[
                { icon: RefreshCw,  label: 'Billing Cycle', value: billingCycle === 'monthly' ? 'Per Month' : billingCycle === 'yearly' ? 'Per Year' : '—' },
                { icon: Clock,      label: 'Account Status', value: data.status ? (data.status.charAt(0).toUpperCase() + data.status.slice(1)) : '—' },
                { icon: Calendar,   label: 'Start Date',    value: formatDate(data.subscription_start) },
                { icon: Calendar,   label: 'Renewal Date',  value: formatDate(data.subscription_end) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="px-6 py-4 flex items-center gap-3">
                  <Icon className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
                  <div>
                    <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
                    <p className="text-sm font-semibold text-[var(--color-text)] mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Billing summary */}
            {data.plan_id && (
              <div className="border-t border-[var(--color-border)] px-6 py-4">
                <div className="rounded-[var(--radius)] border border-[var(--color-primary)] bg-[var(--color-primary-light)] px-4 py-3 text-center">
                  <p className="text-xs text-[var(--color-primary)] font-medium uppercase tracking-wide mb-1">
                    {billingCycle === 'monthly' ? 'Monthly Billing' : 'Annual Billing'}
                  </p>
                  <p className="text-2xl font-bold text-[var(--color-text)]">{formatPrice(price)}</p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    per {billingCycle === 'monthly' ? 'month' : 'year'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* No plan message */}
          {!data.plan_id && (
            <p className="text-sm text-[var(--color-text-secondary)]">
              No subscription plan has been assigned to your clinic yet. Please contact ClinicPOS support.
            </p>
          )}

          {/* Contact & Payment info */}
          {platform && (platform.phone_primary || platform.support_email || platform.address_line1) && (
            <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border)]">
                <div className="w-8 h-8 rounded-[var(--radius)] bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-[var(--color-primary)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">Contact &amp; Support</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">Reach us to renew or upgrade your plan</p>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {platform.phone_primary && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
                    <div>
                      <p className="text-xs text-[var(--color-text-secondary)]">Phone</p>
                      <a href={`tel:${platform.phone_primary}`} className="font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]">
                        {platform.phone_primary}
                      </a>
                      {platform.phone_whatsapp && platform.phone_whatsapp !== platform.phone_primary && (
                        <span className="ml-2 text-xs text-[var(--color-text-secondary)]">
                          · WhatsApp: <a href={`https://wa.me/${platform.phone_whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="hover:text-[var(--color-primary)]">{platform.phone_whatsapp}</a>
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {platform.support_email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
                    <div>
                      <p className="text-xs text-[var(--color-text-secondary)]">Email</p>
                      <a href={`mailto:${platform.support_email}`} className="font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]">
                        {platform.support_email}
                      </a>
                    </div>
                  </div>
                )}
                {platform.address_line1 && (
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-[var(--color-text-secondary)]">Address</p>
                      <p className="font-medium text-[var(--color-text)]">
                        {[platform.address_line1, platform.address_line2, platform.city, platform.country].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment details */}
          {platform && platform.bank_name && (
            <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border)]">
                <div className="w-8 h-8 rounded-[var(--radius)] bg-[var(--color-success-light,#f0fdf4)] flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4 text-[var(--color-success)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">Payment Details</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">Bank transfer details for subscription payments</p>
                </div>
              </div>
              <div className="p-5 space-y-2">
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {[
                    { label: 'Bank',           value: platform.bank_name },
                    { label: 'Account Name',   value: platform.bank_account_name },
                    { label: 'Account Number', value: platform.bank_account_number },
                    { label: 'Branch',         value: platform.bank_branch },
                    platform.bank_swift_code ? { label: 'SWIFT / Code', value: platform.bank_swift_code } : null,
                  ].filter(Boolean).map(({ label, value }) => value ? (
                    <div key={label}>
                      <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
                      <p className="font-semibold text-[var(--color-text)]">{value}</p>
                    </div>
                  ) : null)}
                </div>
                {platform.payment_instructions && (
                  <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      {platform.payment_instructions}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="text-xs text-[var(--color-text-secondary)]">
            To change your plan or renew your subscription, contact the platform administrator.
          </p>
        </div>
      )}
    </PageLayout>
  );
}
