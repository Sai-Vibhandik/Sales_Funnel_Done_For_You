const baseTemplate = require('./baseTemplate');
const { buildUrl } = require('../urlHelper');

/**
 * Team Member Created Email Template
 * Sent when a new team member is created by an admin
 */

const teamMemberCreatedTemplate = (user, organization, createdBy, temporaryPassword = null) => {
  const loginUrl = buildUrl('/login');

  const content = `
    <p class="greeting">Dear ${user.name},</p>
    <p>Welcome to <strong>${organization?.name || 'Growth Valley'}</strong>. We are pleased to have you join our team.</p>
    <p><strong>${createdBy?.name || 'An administrator'}</strong> has created your account and added you as a team member.</p>

    <div class="info-table">
      <div class="info-table-header">Account Information</div>

      <div class="info-row">
        <span class="info-label">Email</span>
        <span class="info-value info-value-highlight">${user.email}</span>
      </div>

      ${temporaryPassword ? `
      <div class="info-row">
        <span class="info-label">Password</span>
        <span class="info-value" style="font-family: 'Courier New', Consolas, monospace; letter-spacing: 0.5px;">${temporaryPassword}</span>
      </div>
      ` : ''}
    </div>

    ${temporaryPassword ? `
    <div class="alert alert-warning">
      <div class="alert-title">Important</div>
      <p style="margin: 8px 0 0;">Please log in using the temporary password above and change it immediately after your first login to secure your account.</p>
    </div>
    ` : ''}

    <div class="button-wrapper">
      <a href="${loginUrl}" class="primary-button">Log In</a>
    </div>

    <hr class="divider">

    <p class="text-center text-muted text-small">
      If you have any questions, please contact your team administrator.
    </p>
  `;

  return {
    subject: `Welcome to ${organization?.name || 'Growth Valley'} - Your Account is Ready`,
    html: baseTemplate(content, { title: 'Account Created' })
  };
};

module.exports = teamMemberCreatedTemplate;