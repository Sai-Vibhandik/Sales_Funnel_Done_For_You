const nodemailer = require('nodemailer');

/**
 * Role-based email mapping (OPTIONAL - for team inboxes)
 */
const ROLE_EMAILS = {
  performance_marketer: "perf@yourcompany.com",
  designer: "design@yourcompany.com",
  seo: "seo@yourcompany.com"
};

/**
 * Create reusable transporter
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    family: 4, // Force IPv4 to avoid IPv6 connectivity issues on cloud platforms
    requireTLS: true, // Required for Gmail SMTP on port 587
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false
    },
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
};

/**
 * Normalize emails (handle string or array + remove duplicates)
 */
const normalizeEmails = (emails) => {
  if (!emails) return [];

  if (typeof emails === 'string') {
    return [emails];
  }

  if (Array.isArray(emails)) {
    return [...new Set(emails)]; // remove duplicates
  }

  return [];
};

/**
 * Send email using nodemailer
 */
const sendEmail = async (options) => {
  console.log('\n📧 === sendEmail START ===');

  // 🔥 Resolve emails (direct OR role-based)
  let recipients = [];

  // Case 1: Direct email(s)
  if (options.email) {
    recipients = normalizeEmails(options.email);
  }

  // Case 2: Role-based email(s)
  if (options.role) {
    const roleEmail = ROLE_EMAILS[options.role];
    if (roleEmail) {
      recipients.push(roleEmail);
    }
  }

  // Remove duplicates again
  recipients = [...new Set(recipients)];

  console.log('Recipients:', recipients);
  console.log('Subject:', options.subject);

  if (!recipients.length || !options.subject) {
    throw new Error('Recipients and subject are required');
  }

  const smtpConfigured =
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD;

  console.log('SMTP Configured:', !!smtpConfigured);

  // =========================
  // ✅ SMTP FLOW
  // =========================
  if (smtpConfigured) {
    try {
      const transporter = createTransporter();

      if (process.env.NODE_ENV !== 'production') {
        await transporter.verify();
        console.log('✅ SMTP connection verified');
      }

      const mailOptions = {
        from: process.env.FROM_EMAIL || process.env.SMTP_USER,
        to: recipients.join(','), // ✅ multiple emails supported
        subject: options.subject,
        text: options.message || '',
        html: options.html || options.message || '',
        cc: options.cc,
        bcc: options.bcc
      };

      const info = await transporter.sendMail(mailOptions);

      console.log('✅ Email sent successfully');
      console.log('Message ID:', info.messageId);
      console.log('============================\n');

      return info;
    } catch (error) {
      console.error('❌ Email sending failed:', error.message);

      console.log('\n========== EMAIL FALLBACK ==========');
      console.log('To:', recipients);
      console.log('Subject:', options.subject);
      console.log('Error:', error.message);
      console.log('====================================\n');

      throw error;
    }
  }

  // =========================
  // ⚠️ NO SMTP
  // =========================
  console.log('\n⚠️ SMTP NOT CONFIGURED - Logging email instead');
  console.log('========== EMAIL LOG ==========');
  console.log('To:', recipients);
  console.log('Subject:', options.subject);
  console.log('Message:', options.message || options.html);
  console.log('================================\n');

  return {
    success: true,
    messageId: 'console-log-' + Date.now(),
    message: 'Email logged to console (no SMTP configured)'
  };
};

module.exports = sendEmail;