/**
 * pdfGenerator.js
 * Generates invoice and prescription PDFs using PDFKit.
 * Call generateInvoicePDF() or generatePrescriptionPDF() and pipe the doc to res.
 */
const PDFDocument = require('pdfkit');
const path        = require('path');
const fs          = require('fs');

// ── Colours ───────────────────────────────────────────────────────────────────
const C = {
  primary:   '#2563eb',
  text:      '#111827',
  secondary: '#6b7280',
  border:    '#e5e7eb',
  lightBg:   '#f9fafb',
  danger:    '#dc2626',
  success:   '#16a34a',
  white:     '#ffffff',
};

const PAGE_W  = 595.28;
const PAGE_H  = 841.89;
const MARGIN  = 50;
const CONTENT = PAGE_W - MARGIN * 2;

// ── Helpers ───────────────────────────────────────────────────────────────────
function hRule(doc, y, color = C.border) {
  doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).strokeColor(color).lineWidth(0.5).stroke();
  return y;
}

function currency(n) {
  return 'LKR ' + parseFloat(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Draw a filled rect (used for table header bg)
function fillRect(doc, x, y, w, h, color) {
  doc.rect(x, y, w, h).fill(color);
}

// ── INVOICE PDF ───────────────────────────────────────────────────────────────
function generateInvoicePDF(res, { invoice, items, splits, settings, tenantSchema }) {
  const doc = new PDFDocument({ margin: MARGIN, size: 'A4', bufferPages: true });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${invoice.invoice_number}.pdf"`);
  doc.pipe(res);

  let y = MARGIN;

  // ── HEADER ──────────────────────────────────────────────────────────────────
  const logoFile = settings.clinic_logo_filename;
  const logoPath = logoFile
    ? path.join('uploads', 'tenants', tenantSchema, logoFile)
    : null;
  const hasLogo  = logoPath && fs.existsSync(logoPath);

  if (hasLogo) {
    doc.image(logoPath, MARGIN, y, { height: 56, width: 56 });
  }

  const nameX = hasLogo ? MARGIN + 66 : MARGIN;
  doc.font('Helvetica-Bold').fontSize(17).fillColor(C.text)
     .text(settings.clinic_name || 'Clinic', nameX, y + (hasLogo ? 6 : 0));
  const sub = [settings.clinic_address, settings.clinic_phone, settings.clinic_email].filter(Boolean).join('  ·  ');
  doc.font('Helvetica').fontSize(8.5).fillColor(C.secondary).text(sub, nameX, y + 26);
  if (settings.receipt_header) {
    doc.font('Helvetica').fontSize(8).fillColor(C.secondary).text(settings.receipt_header, nameX, y + 40);
  }

  // "INVOICE" top-right
  doc.font('Helvetica-Bold').fontSize(26).fillColor(C.primary)
     .text('INVOICE', MARGIN, y, { width: CONTENT, align: 'right' });

  y = 118;
  hRule(doc, y);
  y += 14;

  // ── BILL TO + INVOICE META ───────────────────────────────────────────────────
  const col2X = MARGIN + CONTENT * 0.55;

  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.secondary).text('BILL TO', MARGIN, y);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.text)
     .text(`${invoice.first_name} ${invoice.last_name}`, MARGIN, y + 13);
  doc.font('Helvetica').fontSize(9).fillColor(C.secondary)
     .text(invoice.patient_code || '', MARGIN, y + 27);
  if (invoice.phone) doc.text(invoice.phone, MARGIN, y + 39);

  // right column
  const metaRows = [
    ['Invoice No.',  invoice.invoice_number],
    ['Date',         fmtDate(invoice.created_at)],
    ['Doctor',       invoice.doctor_name ? `Dr. ${invoice.doctor_name}` : '—'],
    ['Status',       invoice.payment_status?.toUpperCase() || 'UNPAID'],
  ];
  let ry = y;
  for (const [label, val] of metaRows) {
    doc.font('Helvetica').fontSize(8.5).fillColor(C.secondary).text(label, col2X, ry, { width: 80 });
    const valColor = label === 'Status'
      ? (val === 'PAID' ? C.success : val === 'PARTIAL' ? '#d97706' : C.danger)
      : C.text;
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(valColor)
       .text(val, col2X + 85, ry, { width: CONTENT - (col2X - MARGIN) - 85, align: 'right' });
    ry += 14;
  }

  y += 68;
  hRule(doc, y);
  y += 12;

  // ── LINE ITEMS TABLE ─────────────────────────────────────────────────────────
  const colW = { desc: CONTENT * 0.44, type: CONTENT * 0.14, qty: CONTENT * 0.09, unit: CONTENT * 0.16, total: CONTENT * 0.17 };
  const colX = {
    desc:  MARGIN,
    type:  MARGIN + colW.desc,
    qty:   MARGIN + colW.desc + colW.type,
    unit:  MARGIN + colW.desc + colW.type + colW.qty,
    total: MARGIN + colW.desc + colW.type + colW.qty + colW.unit,
  };
  const rowH = 18;

  // Table header
  fillRect(doc, MARGIN, y, CONTENT, rowH, C.primary);
  const headers = [
    ['Description', colX.desc,  colW.desc,  'left'],
    ['Type',        colX.type,  colW.type,  'left'],
    ['Qty',         colX.qty,   colW.qty,   'right'],
    ['Unit Price',  colX.unit,  colW.unit,  'right'],
    ['Total',       colX.total, colW.total, 'right'],
  ];
  for (const [text, x, w, align] of headers) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white)
       .text(text, x + 4, y + 5, { width: w - 8, align });
  }
  y += rowH;

  // Table rows
  let rowAlt = false;
  for (const item of items) {
    if (rowAlt) fillRect(doc, MARGIN, y, CONTENT, rowH, C.lightBg);
    doc.font('Helvetica').fontSize(8.5).fillColor(C.text)
       .text(item.description, colX.desc + 4, y + 4, { width: colW.desc - 8, ellipsis: true });
    doc.fillColor(C.secondary)
       .text(item.item_type, colX.type + 4, y + 4, { width: colW.type - 8 });
    doc.fillColor(C.text)
       .text(String(item.quantity), colX.qty + 4, y + 4, { width: colW.qty - 8, align: 'right' })
       .text(currency(item.unit_price), colX.unit + 4, y + 4, { width: colW.unit - 8, align: 'right' })
       .text(currency(item.total_price), colX.total + 4, y + 4, { width: colW.total - 8, align: 'right' });
    y += rowH;
    rowAlt = !rowAlt;
  }

  hRule(doc, y + 2);
  y += 14;

  // ── TOTALS ───────────────────────────────────────────────────────────────────
  const totX   = MARGIN + CONTENT * 0.6;
  const totW   = CONTENT * 0.4;
  const totLabelW = totW * 0.55;
  const totValW   = totW * 0.45;

  function totRow(label, val, bold = false, color = C.text) {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
       .fillColor(C.secondary).text(label, totX, y, { width: totLabelW });
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
       .fillColor(color).text(val, totX + totLabelW, y, { width: totValW, align: 'right' });
    y += 14;
  }

  totRow('Subtotal',  currency(invoice.subtotal));
  if (parseFloat(invoice.discount_amount) > 0)
    totRow('Discount', `− ${currency(invoice.discount_amount)}`, false, C.success);
  if (parseFloat(invoice.tax_amount) > 0)
    totRow(settings.tax_label || 'Tax', currency(invoice.tax_amount));

  hRule(doc, y - 2, C.border);
  y += 4;
  totRow('Total',   currency(invoice.total_amount), true);
  totRow('Paid',    currency(invoice.paid_amount),  false, C.success);
  totRow('Balance', currency(invoice.balance_due),  true,
    parseFloat(invoice.balance_due) > 0 ? C.danger : C.success);

  // ── PAYMENT HISTORY ──────────────────────────────────────────────────────────
  if (splits?.length) {
    y += 8;
    hRule(doc, y);
    y += 12;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.text).text('Payment History', MARGIN, y);
    y += 14;
    for (const s of splits) {
      doc.font('Helvetica').fontSize(8.5).fillColor(C.secondary)
         .text(s.payment_method, MARGIN, y, { width: 90 })
         .text(s.reference || '', MARGIN + 95, y, { width: 120 })
         .text(fmtDate(s.recorded_at), MARGIN + 220, y, { width: 100 });
      doc.font('Helvetica-Bold').fillColor(C.success)
         .text(currency(s.amount), MARGIN + 325, y, { width: CONTENT - 325, align: 'right' });
      y += 14;
    }
  }

  // ── FOOTER ───────────────────────────────────────────────────────────────────
  if (settings.receipt_footer) {
    y += 12;
    hRule(doc, y);
    y += 10;
    doc.font('Helvetica').fontSize(8).fillColor(C.secondary)
       .text(settings.receipt_footer, MARGIN, y, { width: CONTENT, align: 'center' });
  }

  doc.end();
}

// ── PRESCRIPTION PDF ──────────────────────────────────────────────────────────
function generatePrescriptionPDF(res, { prescription, items, settings, tenantSchema }) {
  const doc = new PDFDocument({ margin: MARGIN, size: 'A4', bufferPages: true });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${prescription.rx_number}.pdf"`);
  doc.pipe(res);

  let y = MARGIN;

  // ── HEADER ──────────────────────────────────────────────────────────────────
  const logoFile = settings.clinic_logo_filename;
  const logoPath = logoFile
    ? path.join('uploads', 'tenants', tenantSchema, logoFile)
    : null;
  const hasLogo  = logoPath && fs.existsSync(logoPath);

  if (hasLogo) {
    doc.image(logoPath, MARGIN, y, { height: 56, width: 56 });
  }
  const nameX = hasLogo ? MARGIN + 66 : MARGIN;
  doc.font('Helvetica-Bold').fontSize(17).fillColor(C.text)
     .text(settings.clinic_name || 'Clinic', nameX, y + (hasLogo ? 6 : 0));
  const sub = [settings.clinic_address, settings.clinic_phone, settings.clinic_email].filter(Boolean).join('  ·  ');
  doc.font('Helvetica').fontSize(8.5).fillColor(C.secondary).text(sub, nameX, y + 26);

  // "PRESCRIPTION" top-right
  doc.font('Helvetica-Bold').fontSize(20).fillColor(C.primary)
     .text('PRESCRIPTION', MARGIN, y, { width: CONTENT, align: 'right' });

  y = 118;
  hRule(doc, y);
  y += 14;

  // ── PATIENT + RX META ────────────────────────────────────────────────────────
  const col2X = MARGIN + CONTENT * 0.55;

  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.secondary).text('PATIENT', MARGIN, y);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.text)
     .text(`${prescription.first_name} ${prescription.last_name}`, MARGIN, y + 13);
  doc.font('Helvetica').fontSize(9).fillColor(C.secondary)
     .text(prescription.patient_code || '', MARGIN, y + 27);
  if (prescription.date_of_birth)
    doc.text(`DOB: ${fmtDate(prescription.date_of_birth)}`, MARGIN, y + 39);

  // Allergies warning
  if (prescription.allergies) {
    y += 55;
    fillRect(doc, MARGIN, y, CONTENT, 18, '#fef2f2');
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.danger)
       .text(`⚠  ALLERGIES: ${prescription.allergies}`, MARGIN + 6, y + 4, { width: CONTENT - 12 });
    y += 22;
  } else {
    y += 55;
  }

  // right column
  const metaRx = [
    ['Rx Number',  prescription.rx_number],
    ['Date',       fmtDate(prescription.created_at)],
    ['Doctor',     prescription.doctor_name ? `Dr. ${prescription.doctor_name}` : '—'],
    ['Reg No.',    prescription.registration_no || '—'],
  ];
  let ry = 118 + 14;
  for (const [label, val] of metaRx) {
    doc.font('Helvetica').fontSize(8.5).fillColor(C.secondary).text(label, col2X, ry, { width: 80 });
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.text)
       .text(val, col2X + 85, ry, { width: CONTENT - (col2X - MARGIN) - 85, align: 'right' });
    ry += 14;
  }

  hRule(doc, y);
  y += 12;

  // ── MEDICINES TABLE ──────────────────────────────────────────────────────────
  const mColW = {
    name:  CONTENT * 0.26,
    str:   CONTENT * 0.10,
    dos:   CONTENT * 0.14,
    freq:  CONTENT * 0.18,
    dur:   CONTENT * 0.14,
    inst:  CONTENT * 0.18,
  };
  const mColX = {
    name: MARGIN,
    str:  MARGIN + mColW.name,
    dos:  MARGIN + mColW.name + mColW.str,
    freq: MARGIN + mColW.name + mColW.str + mColW.dos,
    dur:  MARGIN + mColW.name + mColW.str + mColW.dos + mColW.freq,
    inst: MARGIN + mColW.name + mColW.str + mColW.dos + mColW.freq + mColW.dur,
  };
  const rowH = 20;

  // Header
  fillRect(doc, MARGIN, y, CONTENT, rowH, C.primary);
  const mHeaders = [
    ['Medicine',     mColX.name, mColW.name],
    ['Strength',     mColX.str,  mColW.str],
    ['Dosage',       mColX.dos,  mColW.dos],
    ['Frequency',    mColX.freq, mColW.freq],
    ['Duration',     mColX.dur,  mColW.dur],
    ['Instructions', mColX.inst, mColW.inst],
  ];
  for (const [text, x, w] of mHeaders) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white)
       .text(text, x + 4, y + 6, { width: w - 8 });
  }
  y += rowH;

  let alt = false;
  for (const item of items) {
    // Estimate row height (instructions can wrap)
    const instLines = Math.ceil((item.instructions?.length || 0) / 20);
    const rh = Math.max(rowH, 14 + instLines * 11);

    if (alt) fillRect(doc, MARGIN, y, CONTENT, rh, C.lightBg);

    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.text)
       .text(item.medicine_name || item.name || '', mColX.name + 4, y + 5, { width: mColW.name - 8, ellipsis: true });
    doc.font('Helvetica').fontSize(8.5).fillColor(C.secondary)
       .text(item.strength || '—',      mColX.str  + 4, y + 5, { width: mColW.str  - 8 })
       .text(item.dosage   || '—',      mColX.dos  + 4, y + 5, { width: mColW.dos  - 8 })
       .text(item.frequency || '—',     mColX.freq + 4, y + 5, { width: mColW.freq - 8 })
       .text(item.duration  || '—',     mColX.dur  + 4, y + 5, { width: mColW.dur  - 8 })
       .text(item.instructions || '',   mColX.inst + 4, y + 5, { width: mColW.inst - 8 });
    y += rh;
    alt = !alt;
  }

  hRule(doc, y + 4);
  y += 16;

  // ── NOTES + FOOTER ───────────────────────────────────────────────────────────
  if (prescription.notes) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.text).text('Notes:', MARGIN, y);
    doc.font('Helvetica').fontSize(9).fillColor(C.secondary)
       .text(prescription.notes, MARGIN, y + 13, { width: CONTENT });
    y += 30;
  }

  if (settings.prescription_footer) {
    doc.font('Helvetica').fontSize(8).fillColor(C.secondary)
       .text(settings.prescription_footer, MARGIN, y, { width: CONTENT });
    y += 24;
  }

  // ── DOCTOR SIGNATURE ─────────────────────────────────────────────────────────
  y = Math.max(y + 20, PAGE_H - 140);

  const sigPath = prescription.signature_url
    ? path.join(prescription.signature_url.replace(/^\//, ''))
    : null;

  const sigX = PAGE_W - MARGIN - 160;

  if (sigPath && fs.existsSync(sigPath)) {
    doc.image(sigPath, sigX, y, { height: 50, width: 150 });
    y += 54;
  } else {
    y += 30;
  }

  doc.moveTo(sigX, y).lineTo(sigX + 160, y).strokeColor(C.border).lineWidth(0.5).stroke();
  y += 6;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.text)
     .text(prescription.doctor_name ? `Dr. ${prescription.doctor_name}` : '', sigX, y, { width: 160, align: 'center' });
  if (prescription.registration_no) {
    doc.font('Helvetica').fontSize(8).fillColor(C.secondary)
       .text(`Reg No. ${prescription.registration_no}`, sigX, y + 13, { width: 160, align: 'center' });
  }

  doc.end();
}

module.exports = { generateInvoicePDF, generatePrescriptionPDF };
