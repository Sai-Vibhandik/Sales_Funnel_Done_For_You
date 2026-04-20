const baseTemplate = require('./baseTemplate');

/**
 * Task Assignment Email Template
 * Sent when a user is assigned to a task
 */

const taskAssignmentTemplate = (task, project, assignedUser, assignedBy, rejectionContext = null) => {
  const taskUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard/tasks/${task._id}`;
  const projectUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard/projects/${project._id}`;

  // Check if this is a rejection email
  const isRejection = rejectionContext?.isRejection === true;

  // Check if this is a system notification (tester review)
  // But differentiate between tester review and new task assignment based on task status
  const isTesterReview = assignedBy?.name === 'System' &&
    (task.status === 'content_submitted' ||
     task.status === 'design_submitted' ||
     task.status === 'development_submitted' ||
     task.status === 'submitted');

  // If it's System but task is pending (design_pending, content_pending, etc.), it's a new task assignment
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

  // Get review-specific description based on task type
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

  // Get rejection-specific description based on task type
  const getRejectionDescription = (taskType) => {
    const descriptions = {
      content_writing: 'Your content submission needs revision. Please review the feedback and resubmit.',
      graphic_design: 'Your design work needs revision. Please review the feedback and make the necessary changes.',
      video_editing: 'Your video submission needs revision. Please review the feedback and resubmit.',
      landing_page_design: 'Your landing page design needs revision. Please review the feedback and update accordingly.',
      landing_page_development: 'Your landing page implementation needs revision. Please review the feedback and fix the issues.'
    };
    return descriptions[taskType] || 'Your submission needs revision. Please review the feedback and resubmit.';
  };

  // Format rejection reason for display
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

  // Format priority
  const formatPriority = (priority) => {
    const priorityMap = {
      low: { text: 'Low', color: '#10B981' },
      medium: { text: 'Medium', color: '#F59E0B' },
      high: { text: 'High', color: '#EF4444' }
    };
    return priorityMap[priority] || { text: priority || 'Medium', color: '#64748b' };
  };

  const priorityInfo = formatPriority(task.priority);
  const projectName = project.projectName || project.businessName;

  // Determine email content based on type
  let title, intro, descriptionToShow, additionalContent = '';

  if (isRejection) {
    // Rejection email
    title = 'Task Needs Revision';
    intro = `Your task on <strong>${projectName}</strong> requires revision based on reviewer feedback.`;
    descriptionToShow = getRejectionDescription(task.taskType);

    // Add rejection reason and notes if available
    if (rejectionContext.rejectionReason || rejectionContext.rejectionNote) {
      additionalContent = `
        <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <h4 style="margin: 0 0 8px 0; color: #DC2626; font-size: 14px;">Rejection Details</h4>
          ${rejectionContext.rejectionReason ? `
          <p style="margin: 0 0 8px 0; font-size: 14px;">
            <strong>Reason:</strong> ${formatRejectionReason(rejectionContext.rejectionReason)}
          </p>
          ` : ''}
          ${rejectionContext.rejectionNote ? `
          <p style="margin: 0; font-size: 14px;">
            <strong>Feedback:</strong> ${rejectionContext.rejectionNote}
          </p>
          ` : ''}
        </div>
      `;
    }
  } else if (isTesterReview) {
    // Tester review notification
    title = 'Task Ready for Review';
    intro = `A task has been submitted and is ready for your review on <strong>${projectName}</strong>.`;
    descriptionToShow = getReviewDescription(task.taskType);
  } else if (isMarketerApproval) {
    // Marketer final approval notification
    title = 'Task Ready for Final Approval';
    intro = `A task has been approved by the tester and is ready for your final review on <strong>${projectName}</strong>.`;
    descriptionToShow = task.taskType === 'landing_page_development'
      ? 'Review the implemented landing page for functionality, responsiveness, and final approval.'
      : 'Review the submitted work for quality and provide final approval.';
  } else if (isNewTaskFromSystem) {
    // New task assignment from system (e.g., designer assigned after content approval)
    title = 'New Task Assigned';
    intro = `You have been assigned a new task on <strong>${projectName}</strong>.`;
    descriptionToShow = task.description;
  } else {
    // Regular task assignment from a user
    title = 'New Task Assigned';
    intro = `<strong>${assignedBy?.name || 'System'}</strong> has assigned you a new task on <strong>${projectName}</strong>.`;
    descriptionToShow = task.description;
  }

  const content = `
    <h2>${title}</h2>
    <p>Hi ${assignedUser.name},</p>
    <p>${intro}</p>

    <div class="details">
      <div class="details-item">
        <span class="details-label">Task:</span>
        <span class="details-value">${task.taskTitle}</span>
      </div>
      <div class="details-item">
        <span class="details-label">Type:</span>
        <span class="details-value">${formatTaskType(task.taskType)}</span>
      </div>
      <div class="details-item">
        <span class="details-label">Project:</span>
        <span class="details-value">${projectName}</span>
      </div>
      ${task.dueDate ? `
      <div class="details-item">
        <span class="details-label">Due Date:</span>
        <span class="details-value">${new Date(task.dueDate).toLocaleDateString()}</span>
      </div>
      ` : ''}
      ${descriptionToShow ? `
      <div class="details-item" style="flex-direction: column;">
        <span class="details-label" style="margin-bottom: 8px;">${isRejection ? 'Action Required' : 'Description'}:</span>
        <span class="details-value">${descriptionToShow}</span>
      </div>
      ` : ''}
    </div>

    ${additionalContent}

    <p style="text-align: center;">
      <a href="${taskUrl}" class="button">${isRejection ? 'View Feedback' : isTesterReview || isMarketerApproval ? 'Review Task' : 'View Task'}</a>
    </p>

    <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
      You can view all your tasks in your <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard/tasks" style="color: #4F46E5;">Task Dashboard</a>.
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
    html: baseTemplate(content, { title: 'Growth Valley' })
  };
};

module.exports = taskAssignmentTemplate;