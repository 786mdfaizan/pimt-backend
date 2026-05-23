const QRCode = require('qrcode');

/**
 * Generates a UPI payment QR code as a data URL.
 * @param {Object} param0 - { amount, name, reference }
 * @returns {Promise<string>} - Data URL (base64 PNG)
 */
exports.generateUPIQR = async ({ amount, name, reference }) => {
  const upiId = process.env.UPI_ID;
  const payeeName = encodeURIComponent(process.env.UPI_NAME || 'PIMT');

  // UPI Deep Link format
  const upiUrl = `upi://pay?pa=${upiId}&pn=${payeeName}&am=${amount}&cu=INR&tn=${encodeURIComponent(reference || name)}`;

  const qrDataUrl = await QRCode.toDataURL(upiUrl, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: 300,
    margin: 2,
    color: { dark: '#1a237e', light: '#ffffff' },
  });

  return qrDataUrl;
};