const baseTemplate = require('./baseTemplate');

/**
 * Project Assignment Email Template
 * Sent when a user is assigned to a project
 */

const projectAssignmentTemplate = (project, assignedUser, role, assignedBy) => {
  const projectUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard/projects/${project._id}`;

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

  // Get project details
  const projectDetails = [];
  if (project.industry) {
    projectDetails.push(`<div class="details-item"><span class="details-label">Industry:</span><span class="details-value">${project.industry}</span></div>`);
  }
  if (project.status) {
    projectDetails.push(`<div class="details-item"><span class="details-label">Status:</span><span class="details-value">${project.status}</span></div>`);
  }

  const content = `
    <h2>Project Assignment</h2>
    <p>Hi ${assignedUser.name},</p>
    <p><strong>${assignedBy.name}</strong> has assigned you to a new project.</p>

    <div class="details">
      <div class="details-item">
        <span class="details-label">Project:</span>
        <span class="details-value">${projectName}</span>
      </div>
      <div class="details-item">
        <span class="details-label">Your Role:</span>
        <span class="details-value">${formatRole(role)}</span>
      </div>
      ${projectDetails.join('')}
    </div>

    <p style="text-align: center;">
      <a href="${projectUrl}" class="button">View Project</a>
    </p>

    <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
      You can view all your projects in your <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard/projects" style="color: #4F46E5;">Project Dashboard</a>.
    </p>
  `;

  return {
    subject: `Assigned to Project: ${projectName} - Growth Valley`,
    html: baseTemplate(content, { title: 'Growth Valley' })
  };
};

module.exports = projectAssignmentTemplate;