const baseTemplate = require('./baseTemplate');
const { buildUrl } = require('../urlHelper');

/**
 * Task Assignment Email Template
 * Sent when a user is assigned to a task
 */

const taskAssignmentTemplate = (task, project, assignedUser, assignedBy, rejectionContext = null) => {
  const taskUrl = buildUrl(`/dashboard/tasks/${task._id}`);

  // Check if this is a rejection email
  const isRejection = rejectionContext?.isRejection === true;

  // Check if this is a system notification (tester review)
  const isTesterReview = assignedBy?.name === 'System' &&
    (task.status === 'content_submitted' ||
     task.status === 'design_submitted' ||
     task.status === 'development_submitted' ||
     task.status === 'submitted');

  // If it's System but task is pending, it's a new task assignment
  const isNewTaskFromSystem = assignedBy?.name === 'System' &&
    (task.status === 'design_pending' ||
     task.status === 'content_pending' ||
     task.status === 'development_pending' ||
     task.status === 'todo');

  // Check if this is a marketer final approval assignment
  const isMarketerApproval = assignedBy?.name === 'System' &&
    (task.status === 'design_approved' ||
     task.status === 'development_approved');

  // Format task type for display
  const formatTaskType = (taskType) => {
    const typeMap = {
      creative_strategy: 'Creative Strategy',
      copywriting: 'Copywriting',
      content_writing: 'Content Writing',
      landing_page_design: 'Landing Page Design',
      landing_page_development: 'Landing Page Development',
      video_editing: 'Video Editing',
      graphic_design: 'Graphic Design',
      testing: 'Testing',
      review: 'Review'
    };
    return typeMap[taskType] || taskType?.replace(/_/g, ' ');
  };

  // Get review-specific description
  const getReviewDescription = (taskType) => {
    const descriptions = {
      content_writing: 'Review the submitted content for quality, accuracy, and alignment with the creative brief.',
      graphic_design: 'Review the submitted design work for quality and brand alignment.',
      video_editing: 'Review the submitted video content for quality and engagement.',
      landing_page_design: 'Review the submitted landing page design for user experience and conversion optimization.',
      landing_page_development: 'Review the submitted landing page implementation for functionality and responsiveness.'
    };
    return descriptions[taskType] || 'Review the submitted work for quality and completeness.';
  };

  // Get rejection-specific description
  const getRejectionDescription = (taskType) => {
    const descriptions = {
      content_writing: 'Your content submission needs revision. Please review the feedback and make the necessary updates.',
      graphic_design: 'Your design work needs revision. Please review the feedback and make the necessary changes.',
      video_editing: 'Your video submission needs revision. Please review the feedback and resubmit.',
      landing_page_design: 'Your landing page design needs revision. Please review the feedback and update accordingly.',
      landing_page_development: 'Your landing page implementation needs revision. Please review the feedback and fix the issues.'
    };
    return descriptions[taskType] || 'Your submission needs revision. Please review the feedback and resubmit.';
  };

  // Format rejection reason
  const formatRejectionReason = (reason) => {
    const reasonMap = {
      'quality_issues': 'Quality Issues',
      'brand_mismatch': 'Brand Guidelines Mismatch',
      'content_errors': 'Content Errors',
      'design_inconsistencies': 'Design Inconsistencies',
      'technical_issues': 'Technical Issues',
      'not_as_per_brief': 'Not As Per Brief',
      'other': 'Other'
    };
    return reasonMap[reason] || reason;
  };

  const projectName = project.projectName || project.businessName;

  // Determine email content
  let title, intro, descriptionToShow, additionalContent = '';

  if (isRejection) {
    title = 'Task Revision Required';
    intro = `Your task on <strong>${projectName}</strong> requires revision based on reviewer feedback.`;
    descriptionToShow = getRejectionDescription(task.taskType);

    if (rejectionContext.rejectionReason || rejectionContext.rejectionNote) {
      additionalContent = `
        <div class="alert alert-error">
          <div class="alert-title">Revision Details</div>
          ${rejectionContext.rejectionReason ? `<p style="margin: 8px 0 0;"><strong>Reason:</strong> ${formatRejectionReason(rejectionContext.rejectionReason)}</p>` : ''}
          ${rejectionContext.rejectionNote ? `<p style="margin: 8px 0 0;"><strong>Feedback:</strong> ${rejectionContext.rejectionNote}</p>` : ''}
        </div>
      `;
    }
  } else if (isTesterReview) {
    title = 'Task Ready for Review';
    intro = `A task has been submitted and is ready for your review on <strong>${projectName}</strong>.`;
    descriptionToShow = getReviewDescription(task.taskType);
  } else if (isMarketerApproval) {
    title = 'Task Ready for Final Approval';
    intro = `A task has been approved by the tester and is ready for your final review on <strong>${projectName}</strong>.`;
    descriptionToShow = task.taskType === 'landing_page_development'
      ? 'Review the implemented landing page for functionality, responsiveness, and final approval.'
      : 'Review the submitted work for quality and provide final approval.';
  } else if (isNewTaskFromSystem) {
    title = 'New Task Assigned';
    intro = `You have been assigned a new task on <strong>${projectName}</strong>.`;
    descriptionToShow = task.description;
  } else {
    title = 'New Task Assigned';
    intro = `<strong>${assignedBy?.name || 'System'}</strong> has assigned you a new task on <strong>${projectName}</strong>.`;
    descriptionToShow = task.description;
  }

  const content = `
    <p class="greeting">Dear ${assignedUser.name},</p>
    <p>${intro}</p>

    <div class="info-table">
      <div class="info-table-header">Task Details</div>

      <div class="info-row">
        <span class="info-label">Task Name</span>
        <span class="info-value info-value-highlight">${task.taskTitle}</span>
      </div>

      <div class="info-row">
        <span class="info-label">Task Type</span>
        <span class="info-value">${formatTaskType(task.taskType)}</span>
      </div>

      <div class="info-row">
        <span class="info-label">Project</span>
        <span class="info-value">${projectName}</span>
      </div>

      ${task.dueDate ? `
      <div class="info-row">
        <span class="info-label">Due Date</span>
        <span class="info-value">${new Date(task.dueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
      ` : ''}

      ${task.priority ? `
      <div class="info-row">
        <span class="info-label">Priority</span>
        <span class="info-value">${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
      </div>
      ` : ''}

      ${descriptionToShow ? `
      <div class="info-row">
        <span class="info-label">${isRejection ? 'Action Required' : 'Description'}</span>
        <span class="info-value">${descriptionToShow}</span>
      </div>
      ` : ''}
    </div>

    ${additionalContent}

    <div class="button-wrapper">
      <a href="${taskUrl}" class="primary-button">
        ${isRejection ? 'View Feedback' : isTesterReview || isMarketerApproval ? 'Review Task' : 'View Task'}
      </a>
    </div>

    <hr class="divider">

    <p class="text-center text-muted text-small">
      View all your tasks in the <a href="${buildUrl('/dashboard/tasks')}" class="secondary-link">Task Dashboard</a>
    </p>
  `;

  // Determine subject
  let subject;
  if (isRejection) {
    subject = `Revision Required: ${task.taskTitle} - Growth Valley`;
  } else if (isTesterReview) {
    subject = `Review Request: ${task.taskTitle} - Growth Valley`;
  } else if (isMarketerApproval) {
    subject = `Final Approval Needed: ${task.taskTitle} - Growth Valley`;
  } else {
    subject = `New Task: ${task.taskTitle} - Growth Valley`;
  }

  return {
    subject,
    html: baseTemplate(content, { title })
  };
};

module.exports = taskAssignmentTemplate;