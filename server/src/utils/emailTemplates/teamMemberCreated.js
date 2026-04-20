const baseTemplate = require('./baseTemplate');

/**
 * Team Member Created Email Template
 * Sent when a new team member is created by an admin
 */

const teamMemberCreatedTemplate = (user, organization, createdBy, temporaryPassword = null) => {
  const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;
  const dashboardUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard`;

  const content = `
    <h2>Welcome to ${organization?.name || 'Growth Valley'}!</h2>
    <p>Hi ${user.name},</p>
    <p><strong>${createdBy?.name || 'An administrator'}</strong> has added you as a team member to <strong>${organization?.name || 'Growth Valley'}</strong>.</p>

    <div class="details">
      <div class="details-item">
        <span class="details-label">Email:</span>
        <span class="details-value">${user.email}</span>
      </div>
      ${temporaryPassword ? `
      <div class="details-item">
        <span class="details-label">Temporary Password:</span>
        <span class="details-value" style="font-family: monospace; background: #f1f5f9; padding: 4px 8px; border-radius: 4px;">${temporaryPassword}</span>
      </div>
      ` : ''}
    </div>

    ${temporaryPassword ? `
    <p style="background-color: #FEF3C7; padding: 12px; border-radius: 6px; border-left: 4px solid #F59E0B;">
      <strong>Important:</strong> Please log in using the temporary password above and change it immediately after your first login.
    </p>
    ` : ''}

    <p style="text-align: center; margin-top: 24px;">
      <a href="${loginUrl}" class="button">Log In Now</a>
    </p>

    <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
      If you have any questions, please contact your team administrator.
    </p>
  `;

  return {
    subject: `Welcome to ${organization?.name || 'Growth Valley'}! - Your Account is Ready`,
    html: baseTemplate(content, { title: 'Growth Valley' })
  };
};

module.exports = teamMemberCreatedTemplate;