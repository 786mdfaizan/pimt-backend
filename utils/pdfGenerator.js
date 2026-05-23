const PDFDocument = require('pdfkit');

const PIMT_NAME    = 'Pailan Institute of Management & Technology';
const PIMT_ADDRESS = 'Salt Lake, Sector V, Kolkata — 700 091';
const PIMT_EMAIL   = 'officialpimt@zohomail.in';

// ─── Palette ───────────────────────────────────────────────
const NAVY   = '#1a2744';   // salary header / dark accent
const FOREST = '#0f3d2e';   // fee header / dark accent
const GOLD   = '#e8d5a3';   // salary ribbon & net amount text
const MINT   = '#a3d4b8';   // fee ribbon & amount text
const LIGHT_NAVY  = '#8fa8d4';
const LIGHT_MINT  = '#6fad8f';
const ROW_ALT     = '#f7f8fc';
const ROW_ALT_FEE = '#f4f9f6';
const TEXT_MAIN   = '#1a1a2e';
const TEXT_MUTED  = '#6b7280';
const LINE_COLOR  = '#e5e7eb';
const RED         = '#c0392b';
const GREEN       = '#1a6b3c';

// ─── Buffer helper ──────────────────────────────────────────
function createPDFBuffer(buildFn) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    buildFn(doc);
    doc.end();
  });
}

// ─── Shared layout constants ────────────────────────────────
const PL = 48;   // page left margin
const PR = 48;   // page right margin
const PW = 595 - PL - PR;  // usable width (A4 = 595pt wide)

// ─── Draw a filled rounded rect ─────────────────────────────
function fillRect(doc, x, y, w, h, color, radius = 0) {
  doc.save().roundedRect(x, y, w, h, radius).fill(color).restore();
}

// ─── Draw a stroked rounded rect ────────────────────────────
function strokeRect(doc, x, y, w, h, color, lineWidth = 0.5, radius = 0) {
  doc.save().roundedRect(x, y, w, h, radius).lineWidth(lineWidth).stroke(color).restore();
}

// ─── Horizontal rule ────────────────────────────────────────
function hRule(doc, y, color = LINE_COLOR) {
  doc.save().moveTo(PL, y).lineTo(PL + PW, y).lineWidth(0.5).stroke(color).restore();
}

// ─── Small uppercase label + value pair ─────────────────────
function labelValue(doc, x, y, label, value, valueColor = TEXT_MAIN) {
  doc.save()
    .fontSize(8).font('Helvetica').fillColor(TEXT_MUTED)
    .text(label.toUpperCase(), x, y, { lineBreak: false });
  doc.fontSize(11).font('Helvetica-Bold').fillColor(valueColor)
    .text(value || 'N/A', x, y + 11, { lineBreak: false })
    .restore();
}

// ─── 2-column info grid ─────────────────────────────────────
function infoGrid(doc, startY, fields, accentColor) {
  const colW = PW / 2;
  const rowH = 36;
  fields.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x   = PL + col * colW;
    const y   = startY + row * rowH;

    // Subtle alternating row background
    if (row % 2 === 0) fillRect(doc, PL, y, PW, rowH, '#f9fafb');

    // Left border accent on first column
    if (col === 0) fillRect(doc, PL, y, 3, rowH, accentColor);

    doc.save()
      .fontSize(8).font('Helvetica').fillColor(TEXT_MUTED)
      .text(label.toUpperCase(), x + (col === 0 ? 10 : 6), y + 6, { lineBreak: false })
      .fontSize(11).font('Helvetica-Bold').fillColor(TEXT_MAIN)
      .text(value || 'N/A', x + (col === 0 ? 10 : 6), y + 17, { lineBreak: false })
      .restore();

    // Divider between columns
    doc.save().moveTo(PL + colW, y).lineTo(PL + colW, y + rowH).lineWidth(0.5).stroke(LINE_COLOR).restore();
    // Bottom row line
    doc.save().moveTo(PL, y + rowH).lineTo(PL + PW, y + rowH).lineWidth(0.5).stroke(LINE_COLOR).restore();
  });
  strokeRect(doc, PL, startY, PW, Math.ceil(fields.length / 2) * rowH, LINE_COLOR);
  return startY + Math.ceil(fields.length / 2) * rowH;
}

// ════════════════════════════════════════════════════════════
// SALARY SLIP
// ════════════════════════════════════════════════════════════
exports.generateSalarySlip = (salary) => {
  const months     = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];
  const basic      = Number(salary.basicSalary) || 0;
  const allowances = Number(salary.allowances)  || 0;
  const deductions = Number(salary.deductions)  || 0;
  const net        = basic + allowances - deductions;
  const empName    = salary.employee?.name    || 'N/A';
  const empRole    = salary.employee?.role    || '';
  const empId      = salary.employee?.deviceUserId || 'N/A';
  const period     = `${months[(salary.month || 1) - 1]} ${salary.year}`;
  const paidOn     = salary.paidDate
    ? new Date(salary.paidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'N/A';

  return createPDFBuffer(doc => {
    let y = 0;

    // ── Dark navy header band ──────────────────────────────
    fillRect(doc, 0, 0, 595, 90, NAVY);

    // Institution name
    doc.save()
      .fontSize(15).font('Helvetica-Bold').fillColor('#ffffff')
      .text(PIMT_NAME, PL, 20, { width: PW - 130, lineBreak: false })
      .restore();

    doc.save()
      .fontSize(9).font('Helvetica').fillColor(LIGHT_NAVY)
      .text(PIMT_ADDRESS, PL, 38, { lineBreak: false })
      .text(PIMT_EMAIL, PL, 50, { lineBreak: false })
      .restore();

    // Badge: top-right
    fillRect(doc, 595 - PR - 128, 14, 128, 62, 'rgba(255,255,255,0)', 6);
    strokeRect(doc, 595 - PR - 128, 14, 128, 62, 'rgba(255,255,255,0.2)', 0.5, 5);
    doc.save()
      .fontSize(8).font('Helvetica').fillColor(LIGHT_NAVY)
      .text('PAYSLIP', 595 - PR - 120, 20, { lineBreak: false })
      .fontSize(13).font('Helvetica-Bold').fillColor(GOLD)
      .text(period, 595 - PR - 120, 32, { lineBreak: false })
      .fontSize(9).font('Helvetica').fillColor(LIGHT_NAVY)
      .text(`Ref: SAL-${salary.year}-${String(salary._id || '00000').slice(-5)}`, 595 - PR - 120, 52, { lineBreak: false })
      .restore();

    // ── Gold ribbon ────────────────────────────────────────
    fillRect(doc, 0, 90, 595, 24, GOLD);
    doc.save()
      .fontSize(8.5).font('Helvetica-Bold').fillColor(NAVY)
      .text('SALARY SLIP', PL, 97.5, { lineBreak: false })
      .restore();

    // Paid badge on ribbon
    fillRect(doc, 595 - PR - 52, 95, 52, 14, '#d4edda', 7);
    doc.save()
      .fontSize(7.5).font('Helvetica-Bold').fillColor(GREEN)
      .text('✔  PAID', 595 - PR - 46, 98, { lineBreak: false })
      .restore();

    y = 130;

    // ── Employee Details ───────────────────────────────────
    doc.save()
      .fontSize(8).font('Helvetica-Bold').fillColor(TEXT_MUTED)
      .text('EMPLOYEE DETAILS', PL, y)
      .restore();
    y += 12;

    y = infoGrid(doc, y, [
      ['Employee Name', empName],
      ['Employee ID',   empId],
      ['Designation',   empRole.replace(/_/g, ' ').toUpperCase()],
      ['Pay Period',    period],
      ['Date of Payment', paidOn],
      ['Payment Mode',  'Bank Transfer'],
    ], NAVY) + 18;

    // ── Earnings & Deductions table ────────────────────────
    doc.save()
      .fontSize(8).font('Helvetica-Bold').fillColor(TEXT_MUTED)
      .text('EARNINGS & DEDUCTIONS', PL, y)
      .restore();
    y += 12;

    // Table header
    fillRect(doc, PL, y, PW, 24, NAVY);
    doc.save().fontSize(8).font('Helvetica-Bold').fillColor(GOLD)
      .text('DESCRIPTION',  PL + 10,     y + 8, { lineBreak: false })
      .text('TYPE',         PL + 240,    y + 8, { lineBreak: false })
      .text('AMOUNT (₹)',   PL + PW - 90, y + 8, { lineBreak: false })
      .restore();
    y += 24;

    const rows = [
      ['Basic Salary',          'Earnings',   `+ ${basic.toLocaleString('en-IN')}`,      false],
      ['House Rent Allowance',  'Earnings',   `+ ${(allowances * 0.6).toLocaleString('en-IN')}`, false],
      ['Conveyance Allowance',  'Earnings',   `+ ${(allowances * 0.4).toLocaleString('en-IN')}`, false],
      ['Provident Fund',        'Deduction',  `− ${(deductions * 0.95).toLocaleString('en-IN')}`, true],
      ['Professional Tax',      'Deduction',  `− ${(deductions * 0.05).toLocaleString('en-IN')}`, true],
    ];

    rows.forEach(([desc, type, amt, isDeduct], i) => {
      if (i % 2 === 0) fillRect(doc, PL, y, PW, 22, ROW_ALT);
      doc.save()
        .fontSize(10).font('Helvetica').fillColor(TEXT_MAIN)
        .text(desc, PL + 10, y + 6, { lineBreak: false })
        .fontSize(9).font('Helvetica').fillColor(isDeduct ? RED : TEXT_MUTED)
        .text(type, PL + 240, y + 7, { lineBreak: false })
        .fontSize(10).font('Helvetica-Bold').fillColor(isDeduct ? RED : TEXT_MAIN)
        .text(amt, PL + PW - 90, y + 6, { lineBreak: false })
        .restore();
      hRule(doc, y + 22, LINE_COLOR);
      y += 22;
    });

    strokeRect(doc, PL, y - rows.length * 22, PW, rows.length * 22, LINE_COLOR);

    // Subtotals
    y += 4;
    fillRect(doc, PL, y, PW, 22, '#f1f5f9');
    doc.save()
      .fontSize(9).font('Helvetica').fillColor(TEXT_MUTED)
      .text('Total Earnings', PL + 10, y + 6, { lineBreak: false })
      .fontSize(10).font('Helvetica-Bold').fillColor(TEXT_MAIN)
      .text(`₹ ${(basic + allowances).toLocaleString('en-IN')}`, PL + PW - 90, y + 6, { lineBreak: false })
      .restore();
    y += 22;
    fillRect(doc, PL, y, PW, 22, '#fff1f1');
    doc.save()
      .fontSize(9).font('Helvetica').fillColor(TEXT_MUTED)
      .text('Total Deductions', PL + 10, y + 6, { lineBreak: false })
      .fontSize(10).font('Helvetica-Bold').fillColor(RED)
      .text(`₹ ${deductions.toLocaleString('en-IN')}`, PL + PW - 90, y + 6, { lineBreak: false })
      .restore();
    y += 30;

    // ── Net Pay box ────────────────────────────────────────
    fillRect(doc, PL, y, PW, 58, NAVY, 6);
    doc.save()
      .fontSize(8).font('Helvetica').fillColor(LIGHT_NAVY)
      .text('NET PAY', PL + 16, y + 12, { lineBreak: false })
      .fontSize(22).font('Helvetica-Bold').fillColor(GOLD)
      .text(`₹ ${net.toLocaleString('en-IN')}`, PL + 16, y + 24, { lineBreak: false })
      .restore();

    // Amount in words (right-aligned)
    const inWords = `${numberToWords(net)} Rupees Only`;
    doc.save()
      .fontSize(9).font('Helvetica').fillColor(LIGHT_NAVY)
      .text(inWords, PL + PW - 230, y + 30, { width: 214, align: 'right', lineBreak: false })
      .restore();

    y += 70;

    // ── Footer ─────────────────────────────────────────────
    hRule(doc, y, LINE_COLOR);
    y += 10;
    doc.save()
      .fontSize(8).font('Helvetica').fillColor(TEXT_MUTED)
      .text('This is a computer-generated payslip and does not require a physical signature.', PL, y, { width: PW - 130 })
      .text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} · PIMT ERP System`, PL, y + 12, { width: PW - 130 })
      .restore();

    // Signatory (right side)
    doc.save()
      .moveTo(595 - PR - 100, y + 18).lineTo(595 - PR, y + 18).lineWidth(0.5).stroke(LINE_COLOR)
      .fontSize(8).font('Helvetica').fillColor(TEXT_MUTED)
      .text('Authorised Signatory', 595 - PR - 104, y + 22, { lineBreak: false })
      .restore();
  });
};

// ════════════════════════════════════════════════════════════
// FEE RECEIPT
// ════════════════════════════════════════════════════════════
exports.generateFeeReceipt = (fee) => {
  const student  = fee.student;
  const user     = student?.user;
  const paidOn   = fee.paidDate
    ? new Date(fee.paidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'N/A';

  return createPDFBuffer(doc => {
    let y = 0;

    // ── Forest green header band ───────────────────────────
    fillRect(doc, 0, 0, 595, 90, FOREST);

    doc.save()
      .fontSize(15).font('Helvetica-Bold').fillColor('#ffffff')
      .text(PIMT_NAME, PL, 20, { width: PW - 130, lineBreak: false })
      .restore();

    doc.save()
      .fontSize(9).font('Helvetica').fillColor(LIGHT_MINT)
      .text(PIMT_ADDRESS, PL, 38, { lineBreak: false })
      .text(PIMT_EMAIL, PL, 50, { lineBreak: false })
      .restore();

    // Badge top-right
    strokeRect(doc, 595 - PR - 128, 14, 128, 62, 'rgba(255,255,255,0.2)', 0.5, 5);
    doc.save()
      .fontSize(8).font('Helvetica').fillColor(LIGHT_MINT)
      .text('INVOICE NO.', 595 - PR - 120, 20, { lineBreak: false })
      .fontSize(12).font('Helvetica-Bold').fillColor(MINT)
      .text(fee.invoiceNumber || 'INV-N/A', 595 - PR - 120, 32, { lineBreak: false })
      .fontSize(9).font('Helvetica').fillColor(LIGHT_MINT)
      .text(paidOn, 595 - PR - 120, 52, { lineBreak: false })
      .restore();

    // ── Mint ribbon ────────────────────────────────────────
    fillRect(doc, 0, 90, 595, 24, MINT);
    doc.save()
      .fontSize(8.5).font('Helvetica-Bold').fillColor(FOREST)
      .text('FEE PAYMENT RECEIPT', PL, 97.5, { lineBreak: false })
      .restore();

    // Confirmed badge
    fillRect(doc, 595 - PR - 84, 95, 84, 14, '#d4edda', 7);
    doc.save()
      .fontSize(7.5).font('Helvetica-Bold').fillColor(GREEN)
      .text('✔  PAYMENT CONFIRMED', 595 - PR - 80, 98, { lineBreak: false })
      .restore();

    y = 130;

    // ── Student Details ────────────────────────────────────
    doc.save()
      .fontSize(8).font('Helvetica-Bold').fillColor(TEXT_MUTED)
      .text('STUDENT DETAILS', PL, y)
      .restore();
    y += 12;

    y = infoGrid(doc, y, [
      ['Student Name', user?.name],
      ['Roll Number',  student?.rollNumber],
      ['Course',       student?.course],
      ['Batch',        student?.batch],
      ['Semester',     fee.semester ? `Semester ${fee.semester}` : 'N/A'],
      ['Contact',      user?.phone || user?.email || 'N/A'],
    ], FOREST) + 18;

    // ── Fee Particulars table ──────────────────────────────
    doc.save()
      .fontSize(8).font('Helvetica-Bold').fillColor(TEXT_MUTED)
      .text('FEE PARTICULARS', PL, y)
      .restore();
    y += 12;

    // Table header
    fillRect(doc, PL, y, PW, 24, FOREST);
    doc.save().fontSize(8).font('Helvetica-Bold').fillColor(MINT)
      .text('#',           PL + 10,       y + 8, { lineBreak: false })
      .text('FEE TYPE',    PL + 30,       y + 8, { lineBreak: false })
      .text('DESCRIPTION', PL + 140,      y + 8, { lineBreak: false })
      .text('AMOUNT (₹)',  PL + PW - 90,  y + 8, { lineBreak: false })
      .restore();
    y += 24;

    const feeTypeLabel = (t) => ({
      tuition:   'Tuition Fee',
      exam:      'Examination Fee',
      library:   'Library Fee',
      hostel:    'Hostel Fee',
      transport: 'Transport Fee',
      other:     'Other Fee',
    }[t] || t);

    const semDesc = fee.semester ? `Semester ${fee.semester} — Academic Fee` : 'Academic Fee';

    // Single fee row
    fillRect(doc, PL, y, PW, 26, ROW_ALT_FEE);
    doc.save()
      .fontSize(10).font('Helvetica').fillColor(TEXT_MUTED)
      .text('01', PL + 10, y + 8, { lineBreak: false })
      .fontSize(10).font('Helvetica-Bold').fillColor(TEXT_MAIN)
      .text(feeTypeLabel(fee.feeType), PL + 30, y + 8, { lineBreak: false })
      .fontSize(9).font('Helvetica').fillColor(TEXT_MUTED)
      .text(fee.remarks || semDesc, PL + 140, y + 8, { lineBreak: false })
      .fontSize(10).font('Helvetica-Bold').fillColor(TEXT_MAIN)
      .text(`${(fee.amount || 0).toLocaleString('en-IN')}`, PL + PW - 90, y + 8, { lineBreak: false })
      .restore();
    hRule(doc, y + 26, LINE_COLOR);
    y += 26;
    strokeRect(doc, PL, y - 26, PW, 26, LINE_COLOR);

    // Total row
    fillRect(doc, PL, y, PW, 26, '#ecf7f1');
    doc.save()
      .fontSize(9).font('Helvetica-Bold').fillColor(FOREST)
      .text('TOTAL AMOUNT PAID', PL + 10, y + 8, { lineBreak: false })
      .fontSize(12).font('Helvetica-Bold').fillColor(FOREST)
      .text(`₹ ${(fee.amount || 0).toLocaleString('en-IN')}`, PL + PW - 90, y + 7, { lineBreak: false })
      .restore();
    strokeRect(doc, PL, y, PW, 26, LINE_COLOR);
    y += 38;

    // ── Amount box ─────────────────────────────────────────
    fillRect(doc, PL, y, PW, 58, FOREST, 6);
    doc.save()
      .fontSize(8).font('Helvetica').fillColor(LIGHT_MINT)
      .text('AMOUNT RECEIVED', PL + 16, y + 12, { lineBreak: false })
      .fontSize(22).font('Helvetica-Bold').fillColor(MINT)
      .text(`₹ ${(fee.amount || 0).toLocaleString('en-IN')}`, PL + 16, y + 24, { lineBreak: false })
      .restore();

    const inWords = `${numberToWords(fee.amount || 0)} Rupees Only`;
    doc.save()
      .fontSize(9).font('Helvetica').fillColor(LIGHT_MINT)
      .text(inWords, PL + PW - 230, y + 30, { width: 214, align: 'right', lineBreak: false })
      .restore();
    y += 70;

    // ── Payment Details ────────────────────────────────────
    doc.save()
      .fontSize(8).font('Helvetica-Bold').fillColor(TEXT_MUTED)
      .text('PAYMENT DETAILS', PL, y)
      .restore();
    y += 12;

    const colW3 = PW / 3;
    fillRect(doc, PL, y, PW, 38, '#f9fafb');
    strokeRect(doc, PL, y, PW, 38, LINE_COLOR);

    const payFields = [
      ['Payment Method',   (fee.paymentMethod || 'N/A').replace(/_/g, ' ').toUpperCase()],
      ['Transaction Ref',  fee.transactionRef || 'N/A'],
      ['Receipt Date',     paidOn],
    ];
    payFields.forEach(([label, val], i) => {
      const x = PL + i * colW3;
      if (i > 0) doc.save().moveTo(x, y).lineTo(x, y + 38).lineWidth(0.5).stroke(LINE_COLOR).restore();
      doc.save()
        .fontSize(8).font('Helvetica').fillColor(TEXT_MUTED)
        .text(label, x + 10, y + 8, { lineBreak: false })
        .fontSize(10).font('Helvetica-Bold').fillColor(TEXT_MAIN)
        .text(val, x + 10, y + 20, { lineBreak: false })
        .restore();
    });
    y += 50;

    // ── Footer ─────────────────────────────────────────────
    hRule(doc, y, LINE_COLOR);
    y += 10;
    doc.save()
      .fontSize(8).font('Helvetica').fillColor(TEXT_MUTED)
      .text('This is a computer-generated receipt and does not require a physical signature. Please retain for your records.', PL, y, { width: PW - 130 })
      .text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} · PIMT ERP System`, PL, y + 12, { width: PW - 130 })
      .restore();

    doc.save()
      .moveTo(595 - PR - 100, y + 18).lineTo(595 - PR, y + 18).lineWidth(0.5).stroke(LINE_COLOR)
      .fontSize(8).font('Helvetica').fillColor(TEXT_MUTED)
      .text('Authorised Signatory', 595 - PR - 104, y + 22, { lineBreak: false })
      .restore();
  });
};

// ════════════════════════════════════════════════════════════
// STUDENT I-CARD  (unchanged from original)
// ════════════════════════════════════════════════════════════
exports.generateICard = async (student, user, photoBuffer = null) => {
  return createPDFBuffer(doc => {
    const cardX = 100, cardY = 60, cardW = 400, cardH = 600;

    doc.save();
    doc.roundedRect(cardX, cardY, cardW, cardH, 8).fillAndStroke('#f0f4ff', '#1a237e');
    doc.restore();

    doc.save();
    doc.rect(cardX, cardY, cardW, 75).fill('#1a237e');
    doc.restore();

    doc.fontSize(12).font('Helvetica-Bold').fillColor('white')
      .text(PIMT_NAME, cardX + 10, cardY + 12, { width: cardW - 20, align: 'center' });
    doc.fontSize(8).font('Helvetica').fillColor('#c5cae9')
      .text(PIMT_ADDRESS, cardX + 10, cardY + 40, { width: cardW - 20, align: 'center' });
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffc107')
      .text('STUDENT IDENTITY CARD', cardX + 10, cardY + 56, { width: cardW - 20, align: 'center' });

    const photoX = cardX + 30, photoY = cardY + 90, photoW = 110, photoH = 130;

    doc.save();
    doc.rect(photoX - 2, photoY - 2, photoW + 4, photoH + 4).fillAndStroke('#ffffff', '#1a237e');
    doc.restore();

    if (photoBuffer) {
      try {
        doc.save();
        doc.rect(photoX, photoY, photoW, photoH).clip();
        doc.image(photoBuffer, photoX, photoY, { width: photoW, height: photoH, cover: [photoW, photoH], align: 'center', valign: 'center' });
        doc.restore();
      } catch {
        drawPhotoPlaceholder(doc, photoX, photoY, photoW, photoH);
      }
    } else {
      drawPhotoPlaceholder(doc, photoX, photoY, photoW, photoH);
    }

    doc.rect(photoX, photoY, photoW, photoH).stroke('#1a237e');

    const detailsX = cardX + 160, detailsStartY = cardY + 90, lineH = 28;
    const details = [
      ['Name',        user.name],
      ['Roll No',     student.rollNumber],
      ['Course',      student.course],
      ['Batch',       student.batch],
      ['Semester',    `Sem ${student.semester || 1}`],
      ['DOB',         student.dob ? new Date(student.dob).toLocaleDateString('en-IN') : 'N/A'],
      ['Blood Group', student.bloodGroup || 'N/A'],
      ['Contact',     user.phone || 'N/A'],
    ];

    details.forEach(([label, value], i) => {
      const y = detailsStartY + i * lineH;
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#5c6bc0').text(label.toUpperCase(), detailsX, y);
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a1a2e').text(value || 'N/A', detailsX, y + 10, { width: cardX + cardW - detailsX - 15 });
    });

    doc.moveTo(cardX + 20, cardY + 365).lineTo(cardX + cardW - 20, cardY + 365).strokeColor('#c5cae9').lineWidth(0.5).stroke();
    doc.strokeColor('black').lineWidth(1);

    doc.save();
    doc.rect(cardX, cardY + cardH - 40, cardW, 40).fill('#1a237e');
    doc.restore();

    doc.fontSize(7).font('Helvetica').fillColor('#c5cae9')
      .text('This card is the property of PIMT. If found, please return to the institution.', cardX + 10, cardY + cardH - 28, { width: cardW - 80, align: 'left' });

    doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffc107')
      .text(`Issued: ${new Date().toLocaleDateString('en-IN')}`, cardX + 10, cardY + cardH - 28, { width: cardW - 20, align: 'right' });
  });
};

function drawPhotoPlaceholder(doc, x, y, w, h) {
  doc.save().rect(x, y, w, h).fill('#e8eaf6').restore();
  doc.fontSize(9).font('Helvetica').fillColor('#9fa8da').text('No Photo', x, y + h / 2 - 6, { width: w, align: 'center' });
  doc.fillColor('black');
}

// ════════════════════════════════════════════════════════════
// Helper — simple number to words (up to lakhs)
// ════════════════════════════════════════════════════════════
function numberToWords(n) {
  if (!n || isNaN(n)) return 'Zero';
  n = Math.round(n);
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function below100(n) {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  }
  function below1000(n) {
    if (n < 100) return below100(n);
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + below100(n % 100) : '');
  }

  if (n === 0) return 'Zero';
  let words = '';
  if (n >= 100000) { words += below1000(Math.floor(n / 100000)) + ' Lakh '; n %= 100000; }
  if (n >= 1000)   { words += below100(Math.floor(n / 1000)) + ' Thousand '; n %= 1000; }
  if (n > 0)       { words += below1000(n); }
  return words.trim();
}