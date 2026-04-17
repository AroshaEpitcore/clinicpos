/**
 * Opens a thermal-printer-friendly window and prints a patient token slip.
 * Designed for 80mm thermal receipt printers.
 *
 * @param {object} slip
 * @param {string} slip.clinicName
 * @param {string} slip.patientName
 * @param {string} slip.patientCode
 * @param {string} slip.doctorName
 * @param {number|null} slip.tokenNumber   — walk-in token
 * @param {string|null} slip.bookingRef    — BK-XXXXXX for booked/online
 * @param {string} slip.date               — YYYY-MM-DD
 * @param {string|null} slip.time          — HH:MM or null
 * @param {string} slip.type               — walkin | booked | emergency
 */
export function printTokenSlip(slip) {
  const {
    clinicName   = 'ClinicPOS',
    patientName  = '—',
    patientCode  = '',
    doctorName   = '—',
    tokenNumber  = null,
    bookingRef   = null,
    date         = '',
    time         = null,
    type         = 'walkin',
  } = slip;

  const formatDate = (d) => {
    if (!d) return '';
    const clean = String(d).slice(0, 10); // handles both 'YYYY-MM-DD' and full ISO strings
    return new Date(clean + 'T00:00:00').toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  const typeLabel = type === 'emergency' ? '⚡ EMERGENCY' : type === 'booked' ? 'BOOKED' : 'WALK-IN';
  const typeColor = type === 'emergency' ? '#dc2626' : type === 'booked' ? '#2563eb' : '#059669';

  const tokenBlock = tokenNumber
    ? `<div class="token-box">
         <div class="token-label">TOKEN</div>
         <div class="token-number">${String(tokenNumber).padStart(2, '0')}</div>
       </div>`
    : bookingRef
      ? `<div class="token-box">
           <div class="token-label">BOOKING REF</div>
           <div class="token-ref">${bookingRef}</div>
         </div>`
      : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Token Slip</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      color: #000;
      background: #fff;
      width: 80mm;
      padding: 4mm 4mm 8mm 4mm;
    }

    .center   { text-align: center; }
    .divider  { border-top: 1px dashed #000; margin: 6px 0; }
    .divider2 { border-top: 2px solid #000; margin: 6px 0; }

    /* Clinic name */
    .clinic-name {
      font-size: 15px;
      font-weight: 900;
      text-align: center;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .slip-title {
      text-align: center;
      font-size: 10px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #444;
      margin-bottom: 4px;
    }

    /* Type badge */
    .type-badge {
      text-align: center;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 1.5px;
      padding: 3px 0;
      color: ${typeColor};
    }

    /* Big token */
    .token-box {
      text-align: center;
      padding: 8px 0 6px;
    }
    .token-label {
      font-size: 9px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #555;
      margin-bottom: 4px;
    }
    .token-number {
      font-size: 72px;
      font-weight: 900;
      line-height: 1;
      letter-spacing: -3px;
    }
    .token-ref {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 2px;
    }

    /* Info rows */
    .row {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
      font-size: 11px;
    }
    .row .label { color: #555; white-space: nowrap; margin-right: 6px; }
    .row .value { font-weight: 700; text-align: right; word-break: break-word; }

    /* Footer */
    .footer {
      text-align: center;
      font-size: 9px;
      color: #888;
      margin-top: 6px;
    }

    @media print {
      @page {
        size: 80mm auto;
        margin: 0;
      }
      body {
        width: 80mm;
        padding: 4mm 4mm 8mm 4mm;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>

  <div class="clinic-name">${clinicName}</div>
  <div class="slip-title">Appointment Token</div>

  <div class="divider2"></div>

  <div class="type-badge">${typeLabel}</div>

  ${tokenBlock}

  <div class="divider"></div>

  <div class="row">
    <span class="label">Patient</span>
    <span class="value">${patientName}${patientCode ? ' (' + patientCode + ')' : ''}</span>
  </div>
  <div class="row">
    <span class="label">Doctor</span>
    <span class="value">${doctorName}</span>
  </div>
  <div class="row">
    <span class="label">Date</span>
    <span class="value">${formatDate(date)}</span>
  </div>
  ${time ? `<div class="row">
    <span class="label">Time</span>
    <span class="value">${time}</span>
  </div>` : ''}

  <div class="divider2"></div>

  <div class="footer">Please keep this slip · ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=320,height=500');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
