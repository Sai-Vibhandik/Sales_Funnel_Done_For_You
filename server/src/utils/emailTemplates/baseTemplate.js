/**
 * Base Email Template
 * Classic professional email layout for Growth Valley
 */

const baseTemplate = (content, options = {}) => {
  const {
    title = 'Growth Valley',
    previewText = '',
    showFooter = true
  } = options;

  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f5f5f5;
      -webkit-font-smoothing: antialiased;
    }

    /* Preheader */
    .preheader {
      display: none !important;
      max-height: 0;
      overflow: hidden;
      font-size: 1px;
      line-height: 1px;
      color: #f5f5f5;
    }

    /* Email Container */
    .email-wrapper {
      width: 100%;
      background-color: #f5f5f5;
      padding: 40px 20px;
    }

    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e0e0e0;
    }

    /* Header */
    .email-header {
      background-color: #ffffff;
      border-bottom: 3px solid #1a1a1a;
      padding: 30px 40px;
      text-align: center;
    }

    .brand-name {
      color: #1a1a1a;
      font-size: 24px;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .email-title {
      color: #666666;
      font-size: 14px;
      font-weight: 400;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* Content */
    .email-content {
      padding: 40px;
    }

    .email-content h2 {
      color: #1a1a1a;
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid #e0e0e0;
    }

    .email-content p {
      color: #333333;
      font-size: 15px;
      margin-bottom: 16px;
      line-height: 1.7;
    }

    .greeting {
      color: #1a1a1a;
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 20px !important;
    }

    /* Info Table */
    .info-table {
      width: 100%;
      margin: 24px 0;
      border: 1px solid #e0e0e0;
      background-color: #fafafa;
    }

    .info-table-header {
      background-color: #1a1a1a;
      color: #ffffff;
      padding: 12px 16px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-row {
      display: flex;
      border-bottom: 1px solid #e0e0e0;
    }

    .info-row:last-child {
      border-bottom: none;
    }

    .info-label {
      width: 130px;
      flex-shrink: 0;
      padding: 12px 16px;
      color: #666666;
      font-size: 13px;
      font-weight: 500;
      background-color: #f5f5f5;
      border-right: 1px solid #e0e0e0;
    }

    .info-value {
      flex: 1;
      padding: 12px 16px;
      color: #1a1a1a;
      font-size: 14px;
    }

    .info-value-highlight {
      font-weight: 600;
    }

    /* Alert Boxes */
    .alert {
      padding: 16px 20px;
      margin: 24px 0;
      border-left: 4px solid #666666;
      background-color: #f9f9f9;
      font-size: 14px;
      line-height: 1.6;
    }

    .alert-warning {
      border-left-color: #d97706;
      background-color: #fffbeb;
    }

    .alert-error {
      border-left-color: #dc2626;
      background-color: #fef2f2;
    }

    .alert-success {
      border-left-color: #059669;
      background-color: #f0fdf4;
    }

    .alert-title {
      font-weight: 600;
      margin-bottom: 4px;
      color: #1a1a1a;
    }

    /* Primary Button */
    .button-wrapper {
      text-align: center;
      margin: 32px 0;
    }

    .primary-button {
      display: inline-block;
      background-color: #1a1a1a;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 36px;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Secondary Link */
    .secondary-link {
      color: #1a1a1a;
      text-decoration: underline;
      font-weight: 500;
    }

    /* Divider */
    .divider {
      border: none;
      border-top: 1px solid #e0e0e0;
      margin: 28px 0;
    }

    /* Text Styles */
    .text-muted {
      color: #666666;
    }

    .text-center {
      text-align: center;
    }

    .text-small {
      font-size: 13px;
    }

    /* Footer */
    .email-footer {
      background-color: #f5f5f5;
      border-top: 1px solid #e0e0e0;
      padding: 30px 40px;
      text-align: center;
    }

    .footer-brand {
      color: #1a1a1a;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .footer-divider {
      width: 60px;
      height: 1px;
      background-color: #1a1a1a;
      margin: 16px auto;
    }

    .footer-links {
      margin: 16px 0;
    }

    .footer-link {
      color: #666666;
      text-decoration: none;
      font-size: 12px;
      margin: 0 10px;
    }

    .footer-copyright {
      color: #999999;
      font-size: 12px;
      margin-top: 16px;
    }

    /* Responsive */
    @media only screen and (max-width: 600px) {
      .email-wrapper {
        padding: 20px 10px;
      }

      .email-header {
        padding: 24px 20px;
      }

      .brand-name {
        font-size: 20px;
      }

      .email-content {
        padding: 28px 20px;
      }

      .info-row {
        flex-direction: column;
      }

      .info-label {
        width: 100%;
        border-right: none;
        border-bottom: 1px solid #e0e0e0;
      }

      .email-footer {
        padding: 24px 20px;
      }

      .primary-button {
        width: 100%;
        text-align: center;
      }
    }
  </style>
</head>
<body>
  <!-- Preheader Text -->
  <div class="preheader">${previewText || title}</div>

  <div class="email-wrapper">
    <div class="email-container">

      <!-- Header -->
      <div class="email-header">
        <div class="brand-name">Growth Valley</div>
        <div class="email-title">${title}</div>
      </div>

      <!-- Content -->
      <div class="email-content">
        ${content}
      </div>

      ${showFooter ? `
      <!-- Footer -->
      <div class="email-footer">
        <div class="footer-brand">Growth Valley</div>
        <div class="footer-divider"></div>
        <div class="footer-links">
          <a href="https://growthvalley.com" class="footer-link">Website</a>
          <a href="https://growthvalley.com/contact" class="footer-link">Contact</a>
          <a href="https://growthvalley.com/privacy" class="footer-link">Privacy</a>
        </div>
        <p class="footer-copyright">&copy; ${currentYear} Growth Valley. All rights reserved.</p>
      </div>
      ` : ''}

    </div>
  </div>
</body>
</html>
  `;
};

module.exports = baseTemplate;