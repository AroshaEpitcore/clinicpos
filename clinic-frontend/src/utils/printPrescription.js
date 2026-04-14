/**
 * Opens a new window with a formatted prescription and calls window.print().
 * @param {object} prescription  — full prescription object (from GET /prescriptions/:id)
 * @param {object} settings      — clinic_settings row from GET /api/v1/settings
 */
export function printPrescription(prescription, settings = {}) {
  const {
    rx_number, created_at, patient_name, patient_code, date_of_birth, gender, allergies,
    doctor_name, specialization, registration_no, signature_url, notes, items = [],
  } = prescription;

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Build full backend origin for serving static files (logo, signature)
  const apiBase = (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
      ? import.meta.env.VITE_API_URL
      : 'http://localhost:4000/api/v1'
  ).replace('/api/v1', '');

  const logoUrl = settings.clinic_logo_url
    ? (settings.clinic_logo_url.startsWith('http') ? settings.clinic_logo_url : apiBase + settings.clinic_logo_url)
    : null;

  const sigFullUrl = signature_url
    ? (signature_url.startsWith('http') ? signature_url : apiBase + signature_url)
    : null;

  const clinicName    = settings.clinic_name    || 'ClinicPOS';
  const clinicAddress = settings.clinic_address || '';
  const clinicPhone   = settings.clinic_phone   || '';
  const clinicEmail   = settings.clinic_email   || '';
  const rxFooter      = settings.prescription_footer || '';

  const subLines = [clinicAddress, clinicPhone ? `Tel: ${clinicPhone}` : '', clinicEmail]
    .filter(Boolean)
    .map(l => `<div class="clinic-sub">${l}</div>`)
    .join('');

  const itemRows = items.map((item, i) => `
    <tr class="${i % 2 === 1 ? 'alt' : ''}">
      <td class="num">${i + 1}</td>
      <td>
        <strong>${item.medicine_name || ''}</strong>
        ${item.generic_name ? `<br/><span class="small">${item.generic_name}</span>` : ''}
        ${item.strength ? `<span class="badge">${item.strength}${item.unit ? ' ' + item.unit : ''}</span>` : ''}
      </td>
      <td>${item.dosage || '—'}</td>
      <td>${item.frequency || '—'}</td>
      <td>${item.duration || '—'}</td>
      <td>${item.instructions || '—'}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Prescription ${rx_number}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111827; padding: 32px; background: #fff; }

    /* ── Header ── */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2.5px solid #2563eb; }
    .header-left { display: flex; align-items: flex-start; gap: 12px; }
    .logo { height: 52px; width: 52px; object-fit: contain; border-radius: 6px; }
    .clinic-name { font-size: 20px; font-weight: 700; color: #1e3a8a; }
    .clinic-sub { font-size: 11.5px; color: #6b7280; margin-top: 2px; }
    .rx-box { text-align: right; }
    .rx-label { font-size: 22px; font-weight: 800; color: #2563eb; letter-spacing: -0.5px; }
    .rx-number { font-size: 13px; font-weight: 700; color: #374151; margin-top: 2px; }
    .rx-date { font-size: 11px; color: #6b7280; }

    /* ── Info grid ── */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; }
    .info-label { font-size: 9.5px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 3px; }
    .info-value { font-size: 14px; font-weight: 700; color: #111827; }
    .info-sub { font-size: 11px; color: #6b7280; margin-top: 2px; }

    /* ── Allergy banner ── */
    .allergy { background: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; font-size: 12px; color: #dc2626; font-weight: 700; }

    /* ── Section title ── */
    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 8px; }

    /* ── Table ── */
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12.5px; }
    thead tr { background: #2563eb; color: #fff; }
    thead th { padding: 9px 10px; text-align: left; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    tbody td { padding: 9px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
    tbody tr.alt td { background: #f9fafb; }
    tbody tr:last-child td { border-bottom: none; }
    .num { color: #9ca3af; font-size: 11px; width: 24px; }
    .small { font-size: 10.5px; color: #6b7280; }
    .badge { display: inline-block; background: #eff6ff; color: #2563eb; font-size: 10px; padding: 1px 7px; border-radius: 10px; margin-left: 4px; font-weight: 600; }

    /* ── Notes ── */
    .notes-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-bottom: 20px; font-size: 12px; color: #374151; line-height: 1.5; }

    /* ── Footer ── */
    .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
    .footer-note { font-size: 10px; color: #9ca3af; max-width: 280px; line-height: 1.5; }
    .rx-footer { font-size: 10.5px; color: #6b7280; font-style: italic; max-width: 280px; line-height: 1.5; }
    .signature-block { text-align: center; }
    .signature-img { height: 56px; max-width: 160px; object-fit: contain; margin-bottom: 4px; display: block; margin-left: auto; margin-right: auto; }
    .signature-line { border-top: 1.5px solid #374151; width: 160px; margin: 0 auto 5px; }
    .signature-name { font-size: 12px; font-weight: 700; color: #111827; }
    .signature-sub { font-size: 10.5px; color: #6b7280; margin-top: 1px; }

    @media print {
      body { padding: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="header-left">
      ${logoUrl ? `<img class="logo" src="${logoUrl}" alt="Logo" />` : ''}
      <div>
        <div class="clinic-name">${clinicName}</div>
        ${subLines}
      </div>
    </div>
    <div class="rx-box">
      <div class="rx-label">PRESCRIPTION</div>
      <div class="rx-number">${rx_number}</div>
      <div class="rx-date">${formatDate(created_at)}</div>
    </div>
  </div>

  <!-- Patient & Doctor info -->
  <div class="info-grid">
    <div>
      <div class="info-label">Patient</div>
      <div class="info-value">${patient_name || '—'}</div>
      <div class="info-sub">
        ${patient_code || ''}
        ${date_of_birth ? ` &middot; DOB: ${formatDate(date_of_birth)}` : ''}
        ${gender ? ` &middot; ${gender}` : ''}
      </div>
    </div>
    <div>
      <div class="info-label">Prescribing Doctor</div>
      <div class="info-value">Dr. ${doctor_name || '—'}</div>
      <div class="info-sub">
        ${specialization || ''}
        ${registration_no ? `${specialization ? ' &middot; ' : ''}Reg: ${registration_no}` : ''}
      </div>
    </div>
  </div>

  ${allergies ? `<div class="allergy">⚠&nbsp; Allergies: ${allergies}</div>` : ''}

  <!-- Medicines -->
  <div class="section-title">Prescribed Medicines</div>
  <table>
    <thead>
      <tr>
        <th style="width:24px">#</th>
        <th>Medicine</th>
        <th>Dosage</th>
        <th>Frequency</th>
        <th>Duration</th>
        <th>Instructions</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows || '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:16px">No medicines recorded</td></tr>'}
    </tbody>
  </table>

  ${notes ? `<div class="section-title">Notes</div><div class="notes-box">${notes}</div>` : ''}

  <!-- Footer: disclaimer left, signature right -->
  <div class="footer">
    <div>
      ${rxFooter ? `<div class="rx-footer">${rxFooter}</div>` : '<div class="footer-note">This prescription is valid for 30 days from the date of issue.<br/>For any queries, contact the clinic.</div>'}
    </div>
    <div class="signature-block">
      ${sigFullUrl ? `<img class="signature-img" src="${sigFullUrl}" alt="Signature" />` : '<div style="height:56px"></div>'}
      <div class="signature-line"></div>
      <div class="signature-name">Dr. ${doctor_name || ''}</div>
      ${specialization ? `<div class="signature-sub">${specialization}</div>` : ''}
      ${registration_no ? `<div class="signature-sub">Reg No. ${registration_no}</div>` : ''}
    </div>
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=860,height=950');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
