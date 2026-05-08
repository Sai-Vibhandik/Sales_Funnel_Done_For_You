const baseTemplate = require('./baseTemplate');
const { buildUrl } = require('../urlHelper');

/**
 * Project Assignment Email Template
 * Sent when a user is assigned to a project
 */

const projectAssignmentTemplate = (project, assignedUser, role, assignedBy) => {
  const projectUrl = buildUrl(`/dashboard/projects/${project._id}`);

  // Format role for display
  const formatRole = (roleKey) => {
    const roleMap = {
      performanceMarketer: 'Performance Marketer',
      performance_marketer: 'Performance Marketer',
      contentWriter: 'Content Writer',
      content_writer: 'Content Writer',
      uiUxDesigner: 'UI/UX Designer',
      ui_ux_designer: 'UI/UX Designer',
      graphicDesigner: 'Graphic Designer',
      graphic_designer: 'Graphic Designer',
      videoEditor: 'Video Editor',
      video_editor: 'Video Editor',
      developer: 'Developer',
      tester: 'QA Tester'
    };
    return roleMap[roleKey] || roleKey;
  };

  const projectName = project.projectName || project.businessName;

  const content = `
    <p class="greeting">Dear ${assignedUser.name},</p>
    <p>You have been assigned to a new project by <strong>${assignedBy.name}</strong>.</p>

    <div class="info-table">
      <div class="info-table-header">Project Details</div>

      <div class="info-row">
        <span class="info-label">Project Name</span>
        <span class="info-value info-value-highlight">${projectName}</span>
      </div>

      <div class="info-row">
        <span class="info-label">Your Role</span>
        <span class="info-value">${formatRole(role)}</span>
      </div>

      ${project.industry ? `
      <div class="info-row">
        <span class="info-label">Industry</span>
        <span class="info-value">${project.industry}</span>
      </div>
      ` : ''}

      ${project.status ? `
      <div class="info-row">
        <span class="info-label">Status</span>
        <span class="info-value">${project.status.charAt(0).toUpperCase() + project.status.slice(1).replace(/_/g, ' ')}</span>
      </div>
      ` : ''}

      ${project.description ? `
      <div class="info-row">
        <span class="info-label">Description</span>
        <span class="info-value">${project.description}</span>
      </div>
      ` : ''}
    </div>

    <div class="button-wrapper">
      <a href="${projectUrl}" class="primary-button">View Project</a>
    </div>

    <hr class="divider">

    <p class="text-center text-muted text-small">
      Manage all your projects in the <a href="${buildUrl('/dashboard/projects')}" class="secondary-link">Project Dashboard</a>
    </p>
  `;

  return {
    subject: `Project Assignment: ${projectName} - Growth Valley`,
    html: baseTemplate(content, { title: 'Project Assignment' })
  };
};

module.exports = projectAssignmentTemplate;