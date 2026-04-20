/**
 * Base Email Template
 * Provides a consistent branded HTML layout for all emails
 */

const baseTemplate = (content, options = {}) => {
  const {
    title = 'Growth Valley',
    previewText = '',
    showFooter = true
  } = options;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f5f7;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .card {
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
      padding: 30px 40px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      font-size: 24px;
      font-weight: 600;
      margin: 0;
    }
    .header .logo {
      color: #ffffff;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 40px;
    }
    .content h2 {
      color: #1a1a1a;
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .content p {
      color: #555;
      font-size: 16px;
      margin-bottom: 16px;
    }
    .content .details {
      background-color: #f8fafc;
      border-radius: 6px;
      padding: 20px;
      margin: 20px 0;
    }
    .content .details-item {
      display: flex;
      margin-bottom: 12px;
    }
    .content .details-label {
      color: #64748b;
      font-size: 14px;
      width: 120px;
      flex-shrink: 0;
    }
    .content .details-value {
      color: #1e293b;
      font-size: 14px;
      font-weight: 500;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
    }
    .button:hover {
      opacity: 0.9;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 40px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer p {
      color: #64748b;
      font-size: 14px;
      margin: 0;
    }
    .footer a {
      color: #4F46E5;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    @media only screen and (max-width: 600px) {
      .container {
        padding: 10px;
      }
      .header {
        padding: 24px 20px;
      }
      .content {
        padding: 24px 20px;
      }
      .content .details-item {
        flex-direction: column;
      }
      .content .details-label {
        width: 100%;
        margin-bottom: 4px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">${title}</div>
      </div>
      <div class="content">
        ${content}
      </div>
      ${showFooter ? `
      <div class="footer">
        <p>
          &copy; ${new Date().getFullYear()} Growth Valley. All rights reserved.<br>
          <a href="https://growthvalley.com">growthvalley.com</a>
        </p>
      </div>
      ` : ''}
    </div>
  </div>
</body>
</html>
  `;
};

module.exports = baseTemplate;