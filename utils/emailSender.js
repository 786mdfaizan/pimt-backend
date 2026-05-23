const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

exports.sendEmail = async ({ to, subject, html, attachments = [] }) => {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
    attachments,
  });
};

exports.sendFeeReceiptEmail = async (studentEmail, studentName, invoiceNumber, receiptUrl) => {
  await exports.sendEmail({
    to: studentEmail,
    subject: `Fee Receipt - ${invoiceNumber} | PIMT`,
    html: `
      <h2>Fee Payment Confirmation</h2>
      <p>Dear ${studentName},</p>
      <p>Your fee payment has been confirmed. Invoice: <strong>${invoiceNumber}</strong></p>
      <p><a href="${receiptUrl}">Download Receipt</a></p>
      <br/>
      <p>Regards,<br/>Pailan Institute of Management & Technology</p>
    `,
  });
};

exports.sendWelcomeEmail = async (email, name) => {
  await exports.sendEmail({
    to: email,
    subject: 'Welcome to PIMT ERP Portal',
    html: `
      <h2>Welcome to PIMT!</h2>
      <p>Dear ${name},</p>
      <p>Your account has been created on the PIMT Student Portal.</p>
      <p>You can login at: <a href="${process.env.FRONTEND_URL}/login">${process.env.FRONTEND_URL}/login</a></p>
      <br/>
      <p>Regards,<br/>Pailan Institute of Management & Technology</p>
    `,
  });
};