const baseTemplate = require('./baseTemplate');
const { buildUrl } = require('../urlHelper');

/**
 * Team Invitation Email Template
 * Sent when a user is invited to join an organization
 */

const teamInvitationTemplate = (invitation, organization, inviter) => {
  const acceptUrl = buildUrl(`/invite/${invitation.token}`);

  // Format role for display
  const formatRole = (role) => {
    const roleMap = {
      admin: 'Administrator',
      performance_marketer: 'Performance Marketer',
      graphic_designer: 'Graphic Designer',
      video_editor: 'Video Editor',
      ui_ux_designer: 'UI/UX Designer',
      developer: 'Developer',
      tester: 'QA Tester',
      content_writer: 'Content Writer',
      content_creator: 'Content Creator'
    };
    return roleMap[role] || role;
  };

  const content = `
    <p class="greeting">Dear Sir/Madam,</p>
    <p><strong>${inviter.name}</strong> has invited you to join <strong>${organization.name}</strong> on Growth Valley.</p>

    <div class="info-table">
      <div class="info-table-header">Invitation Details</div>

      <div class="info-row">
        <span class="info-label">Organization</span>
        <span class="info-value info-value-highlight">${organization.name}</span>
      </div>

      <div class="info-row">
        <span class="info-label">Your Role</span>
        <span class="info-value">${formatRole(invitation.role)}</span>
      </div>

      ${invitation.department ? `
      <div class="info-row">
        <span class="info-label">Department</span>
        <span class="info-value">${invitation.department}</span>
      </div>
      ` : ''}

      ${invitation.jobTitle ? `
      <div class="info-row">
        <span class="info-label">Job Title</span>
        <span class="info-value">${invitation.jobTitle}</span>
      </div>
      ` : ''}

      ${invitation.message ? `
      <div class="info-row">
        <span class="info-label">Message</span>
        <span class="info-value" style="font-style: italic;">"${invitation.message}"</span>
      </div>
      ` : ''}
    </div>

    <div class="alert">
      <div class="alert-title">Next Steps</div>
      <p style="margin: 8px 0 0;">Click the button below to accept your invitation. If you do not have an account, you will be prompted to create one.</p>
    </div>

    <div class="button-wrapper">
      <a href="${acceptUrl}" class="primary-button">Accept Invitation</a>
    </div>

    <hr class="divider">

    <p class="text-center text-muted text-small">
      This invitation will expire in <strong>7 days</strong>. If you did not expect this invitation, you may safely ignore this email.
    </p>
  `;

  return {
    subject: `Invitation to join ${organization.name} - Growth Valley`,
    html: baseTemplate(content, { title: 'Team Invitation' })
  };
};

module.exports = teamInvitationTemplate;