const nodemailer = require('nodemailer');

const sendEmail = async options => {
  // Validate required environment variables
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_PORT ||
    !process.env.EMAIL_USERNAME || !process.env.EMAIL_PASSWORD) {
    throw new Error('Missing email configuration in environment variables');
  }

  // Validate email options
  if (!options || !options.email || !options.subject || (!options.message && !options.html)) {
    throw new Error('Invalid email options: recipient, subject, and content required');
  }

  // Create transporter with secure configuration
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    },
    // Only disable TLS verification in development
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false
    },
    // Connection pool configuration
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    logger: true,
    debug: true
  });

  // Verify connection configuration
  try {
    await transporter.verify();
    console.log(`[${new Date().toISOString()}] SMTP connection verified`);
  } catch (verifyError) {
    console.error('SMTP connection verification failed:', verifyError);
    throw new Error('SMTP connection failed: ' + verifyError.message);
  }

  // Prepare email options
  const mailOptions = {
    from: process.env.EMAIL_FROM || `"Winnies Bakery" <${process.env.EMAIL_USERNAME}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
    // Important for email deliverability
    headers: {
      'X-Priority': '1',
      'X-Mailer': 'Winnies Bakery Server'
    }
  };

  // Send email with comprehensive error handling
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[${new Date().toISOString()}] Email sent to ${options.email}: ${info.messageId}`);
    return info;
  } catch (error) {
    // Detailed error logging
    let errorDetails = `Failed to send email to ${options.email}`;

    if (error.responseCode) {
      errorDetails += ` | SMTP Error ${error.responseCode}: ${error.response}`;
    }

    if (error.command) {
      errorDetails += ` | Command: ${error.command}`;
    }

    console.error(`[${new Date().toISOString()}] Email send error:`, {
      message: error.message,
      stack: error.stack,
      details: errorDetails,
      recipient: options.email,
      subject: options.subject
    });

    throw new Error(`Email could not be sent: ${error.message}`);
  }
};

module.exports = sendEmail;