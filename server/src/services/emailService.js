const sendEmail = require('../utils/sendEmail');
const {
  orgRegistrationTemplate,
  teamInvitationTemplate,
  taskAssignmentTemplate,
  projectAssignmentTemplate,
  teamMemberCreatedTemplate
} = require('../utils/emailTemplates');

// Debug: Confirm templates loaded
console.log('📧 Email Service loaded');
console.log('  - taskAssignmentTemplate:', typeof taskAssignmentTemplate);
console.log('  - projectAssignmentTemplate:', typeof projectAssignmentTemplate);

/**
 * Email Service
 * Centralized service for sending transactional emails
 */

/**
 * Send notification to organization owner and platform admins about new registration
 * @param {Object} organization - The created organization
 * @param {Object} owner - The organization owner (user)
 * @param {Object} plan - The selected plan
 */
const sendOrgRegistrationNotification = async (organization, owner, plan) => {
  console.log('=== sendOrgRegistrationNotification called ===');
  console.log('Organization:', organization?.name);
  console.log('Owner:', owner?.name, owner?.email);

  try {
    // Get all platform admins
    const User = require('../models/User');
    const platformAdmins = await User.find({ role: 'platform_admin', isActive: true });

    console.log('Platform admins found:', platformAdmins?.length || 0);
    if (platformAdmins?.length > 0) {
      console.log('Platform admin emails:', platformAdmins.map(a => a.email));
    }

    const { subject, html } = orgRegistrationTemplate(organization, owner, plan);

    // Send to organization owner (confirmation email)
    if (owner && owner.email) {
      console.log('Sending confirmation email to owner:', owner.email);
      await sendEmail({
        email: owner.email,
        subject: `Welcome to ${organization.name || 'Growth Valley'}!`,
        html
      });
      console.log(`Confirmation email sent to owner: ${owner.email}`);
    }

    // Send to platform admins (notification about new registration)
    if (platformAdmins && platformAdmins.length > 0) {
      for (const admin of platformAdmins) {
        if (admin.email) {
          try {
            console.log('Sending notification to platform admin:', admin.email);
            await sendEmail({
              email: admin.email,
              subject: `[Admin] New Organization: ${organization.name}`,
              html
            });
            console.log(`Notification sent to platform admin: ${admin.email}`);
          } catch (adminError) {
            // Don't fail if one admin email fails
            console.error(`Failed to send to platform admin ${admin.email}:`, adminError.message);
          }
        }
      }
    }

    console.log('=== sendOrgRegistrationNotification completed ===');
  } catch (error) {
    console.error('Error sending org registration notification:', error);
    console.error('Error stack:', error.stack);
    // Don't throw - email failures should not block the main operation
  }
};

/**
 * Send team invitation email
 * @param {Object} invitation - The invitation document
 * @param {Object} organization - The organization
 * @param {Object} inviter - The user who sent the invitation
 */
const sendTeamInvitation = async (invitation, organization, inviter) => {
  console.log('=== sendTeamInvitation called ===');
  console.log('Invitation:', invitation?.email, invitation?._id);
  console.log('Organization:', organization?.name);
  console.log('Inviter:', inviter?.name, inviter?.email);

  try {
    const { subject, html } = teamInvitationTemplate(invitation, organization, inviter);

    console.log('Template generated, sending email to:', invitation.email);

    await sendEmail({
      email: invitation.email,
      subject,
      html
    });

    console.log(`Team invitation email sent to ${invitation.email}`);
  } catch (error) {
    console.error('Error sending team invitation email:', error);
    console.error('Error stack:', error.stack);
    // Don't throw - email failures should not block the main operation
  }
};

/**
 * Send task assignment notification email
 * @param {Object} task - The assigned task
 * @param {Object} project - The project the task belongs to
 * @param {Object} assignedUser - The user assigned to the task
 * @param {Object} assignedBy - The user who assigned the task
 * @param {Object} rejectionContext - Optional context for rejection emails
 */
const sendTaskAssignmentNotification = async (task, project, assignedUser, assignedBy, rejectionContext = null) => {
  console.log('=== sendTaskAssignmentNotification called ===');
  console.log('Task:', task?.taskTitle, task?._id);
  console.log('Project:', project?.projectName || project?.businessName, project?._id);
  console.log('Assigned User:', assignedUser?.name, assignedUser?.email);
  console.log('Assigned By:', assignedBy?.name);
  console.log('Is Rejection:', rejectionContext?.isRejection);

  try {
    const { subject, html } = taskAssignmentTemplate(task, project, assignedUser, assignedBy, rejectionContext);

    console.log('Template generated, sending email to:', assignedUser.email);

    await sendEmail({
      email: assignedUser.email,
      subject,
      html
    });

    console.log(`Task assignment notification sent to ${assignedUser.email}`);
  } catch (error) {
    console.error('Error sending task assignment notification:', error);
    console.error('Error stack:', error.stack);
    // Don't throw - email failures should not block the main operation
  }
};

/**
 * Send project assignment notification email
 * @param {Object} project - The project
 * @param {Object} assignedUser - The user assigned to the project
 * @param {string} role - The role assigned (e.g., 'graphic_designer', 'developer')
 * @param {Object} assignedBy - The user who made the assignment
 */
const sendProjectAssignmentNotification = async (project, assignedUser, role, assignedBy) => {
  try {
    const { subject, html } = projectAssignmentTemplate(project, assignedUser, role, assignedBy);

    await sendEmail({
      email: assignedUser.email,
      subject,
      html
    });

    console.log(`Project assignment notification sent to ${assignedUser.email}`);
  } catch (error) {
    console.error('Error sending project assignment notification:', error);
    // Don't throw - email failures should not block the main operation
  }
};

/**
 * Send team member created notification email
 * @param {Object} user - The newly created user
 * @param {Object} organization - The organization
 * @param {Object} createdBy - The admin who created the user
 * @param {string} temporaryPassword - The temporary password (optional)
 */
const sendTeamMemberCreatedNotification = async (user, organization, createdBy, temporaryPassword = null) => {
  console.log('=== sendTeamMemberCreatedNotification called ===');
  console.log('User:', user?.name, user?.email);
  console.log('Organization:', organization?.name);
  console.log('Created by:', createdBy?.name);

  try {
    const { subject, html } = teamMemberCreatedTemplate(user, organization, createdBy, temporaryPassword);

    await sendEmail({
      email: user.email,
      subject,
      html
    });

    console.log(`Team member created notification sent to ${user.email}`);
  } catch (error) {
    console.error('Error sending team member created notification:', error);
    console.error('Error stack:', error.stack);
    // Don't throw - email failures should not block the main operation
  }
};

module.exports = {
  sendOrgRegistrationNotification,
  sendTeamInvitation,
  sendTaskAssignmentNotification,
  sendProjectAssignmentNotification,
  sendTeamMemberCreatedNotification
};