/**
 * Opens a new window with a formatted prescription and calls window.print().
 * @param {object} prescription  — full prescription object (from GET /prescriptions/:id)
 * @param {object} clinic        — clinic object from AuthContext { name, address, phone }
 */
export function printPrescription(prescription, clinic) {
  const {
    rx_number, created_at, patient_name, patient_code, date_of_birth, gender, allergies,
    doctor_name, specialization, registration_no, signature_url, notes, items = [],
  } = prescription;

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const itemRows = items.map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>
        <strong>${item.medicine_name}</strong>
        ${item.generic_name ? `<br/><span class="small">${item.generic_name}</span>` : ''}
        ${item.strength ? `<span class="badge">${item.strength}</span>` : ''}
        ${item.unit ? `<span class="unit">${item.unit}</span>` : ''}
      </td>
      <td>${item.dosage}</td>
      <td>${item.frequency}</td>
      <td>${item.duration}</td>
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
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #2563eb; }
    .clinic-name { font-size: 20px; font-weight: 700; color: #2563eb; }
    .clinic-sub { font-size: 12px; color: #555; margin-top: 2px; }
    .rx-box { text-align: right; }
    .rx-number { font-size: 16px; font-weight: 700; color: #2563eb; }
    .rx-date { font-size: 12px; color: #555; }
    .patient-doctor { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; }
    .info-label { font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .info-value { font-size: 13px; font-weight: 600; margin-top: 2px; }
    .info-sub { font-size: 11px; color: #555; }
    .allergy-alert { background: #fffbeb; border: 1px solid #d97706; border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; font-size: 12px; color: #92400e; font-weight: 600; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f3f4f6; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 8px 10px; text-align: left; color: #374151; border-bottom: 1px solid #d1d5db; }
    td { padding: 9px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: top; font-size: 13px; }
    tr:last-child td { border-bottom: none; }
    .small { font-size: 11px; color: #6b7280; }
    .badge { display: inline-block; background: #eff6ff; color: #2563eb; font-size: 10px; padding: 1px 6px; border-radius: 10px; margin-left: 4px; }
    .unit { font-size: 11px; color: #6b7280; margin-left: 4px; }
    .notes-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-bottom: 20px; font-size: 12px; color: #374151; }
    .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
    .signature-block { text-align: center; }
    .signature-img { height: 60px; max-width: 180px; object-fit: contain; margin-bottom: 4px; }
    .signature-line { border-top: 1px solid #374151; width: 160px; margin: 0 auto 4px; }
    .signature-name { font-size: 12px; font-weight: 600; }
    .signature-sub { font-size: 11px; color: #6b7280; }
    .disclaimer { font-size: 10px; color: #9ca3af; max-width: 300px; }
    @media print {
      body { padding: 16px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div>
      <div class="clinic-name">${clinic?.name || 'ClinicPOS'}</div>
      <div class="clinic-sub">${clinic?.address || ''}</div>
      ${clinic?.phone ? `<div class="clinic-sub">Tel: ${clinic.phone}</div>` : ''}
    </div>
    <div class="rx-box">
      <div class="rx-number">${rx_number}</div>
      <div class="rx-date">${formatDate(created_at)}</div>
    </div>
  </div>

  <!-- Patient & Doctor -->
  <div class="patient-doctor">
    <div>
      <div class="info-label">Patient</div>
      <div class="info-value">${patient_name}</div>
      <div class="info-sub">${patient_code}${date_of_birth ? ` · ${formatDate(date_of_birth)}` : ''}${gender ? ` · ${gender}` : ''}</div>
    </div>
    <div>
      <div class="info-label">Prescribing Doctor</div>
      <div class="info-value">Dr. ${doctor_name}</div>
      <div class="info-sub">${specialization || ''}${registration_no ? ` · Reg: ${registration_no}` : ''}</div>
    </div>
  </div>

  ${allergies ? `<div class="allergy-alert">⚠ Allergies: ${allergies}</div>` : ''}

  <!-- Medicines Table -->
  <div class="section-title">Prescribed Medicines</div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Medicine</th>
        <th>Dosage</th>
        <th>Frequency</th>
        <th>Duration</th>
        <th>Instructions</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  ${notes ? `<div class="section-title">Notes</div><div class="notes-box">${notes}</div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <div class="disclaimer">
      This prescription is valid for 30 days from the date of issue.<br/>
      For any queries, contact the clinic.
    </div>
    <div class="signature-block">
      ${signature_url ? `<img class="signature-img" src="${signature_url}" alt="Signature" />` : '<div style="height:60px;"></div>'}
      <div class="signature-line"></div>
      <div class="signature-name">Dr. ${doctor_name}</div>
      <div class="signature-sub">${specialization || 'Physician'}</div>
    </div>
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=800,height=900');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
