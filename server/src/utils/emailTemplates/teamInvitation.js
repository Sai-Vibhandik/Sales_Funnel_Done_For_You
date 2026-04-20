const baseTemplate = require('./baseTemplate');

/**
 * Team Invitation Email Template
 * Sent when a user is invited to join an organization
 */

const teamInvitationTemplate = (invitation, organization, inviter) => {
  const acceptUrl = `${process.env.FRONTEND_URL || 'https://growthvalley.com'}/invite/${invitation.token}`;

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
    <h2>You're Invited!</h2>
    <p><strong>${inviter.name}</strong> has invited you to join <strong>${organization.name}</strong> on Growth Valley.</p>

    <div class="details">
      <div class="details-item">
        <span class="details-label">Organization:</span>
        <span class="details-value">${organization.name}</span>
      </div>
      <div class="details-item">
        <span class="details-label">Your Role:</span>
        <span class="details-value">${formatRole(invitation.role)}</span>
      </div>
      ${invitation.department ? `
      <div class="details-item">
        <span class="details-label">Department:</span>
        <span class="details-value">${invitation.department}</span>
      </div>
      ` : ''}
      ${invitation.jobTitle ? `
      <div class="details-item">
        <span class="details-label">Job Title:</span>
        <span class="details-value">${invitation.jobTitle}</span>
      </div>
      ` : ''}
      ${invitation.message ? `
      <div class="details-item">
        <span class="details-label">Message:</span>
        <span class="details-value">${invitation.message}</span>
      </div>
      ` : ''}
    </div>

    <p style="text-align: center;">
      <a href="${acceptUrl}" class="button">Accept Invitation</a>
    </p>

    <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
      This invitation will expire in 7 days. If you don't have an account yet, you'll be prompted to create one after accepting.
    </p>

    <p style="font-size: 14px; color: #64748b;">
      If you did not expect this invitation, you can safely ignore this email.
    </p>
  `;

  return {
    subject: `${inviter.name} invited you to join ${organization.name} - Growth Valley`,
    html: baseTemplate(content, { title: 'Growth Valley' })
  };
};

module.exports = teamInvitationTemplate;