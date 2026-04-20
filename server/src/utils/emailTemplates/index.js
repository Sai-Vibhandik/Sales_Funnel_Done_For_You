/**
 * Email Templates Registry
 * Exports all email templates
 */

const orgRegistrationTemplate = require('./orgRegistration');
const teamInvitationTemplate = require('./teamInvitation');
const taskAssignmentTemplate = require('./taskAssignment');
const projectAssignmentTemplate = require('./projectAssignment');
const teamMemberCreatedTemplate = require('./teamMemberCreated');

module.exports = {
  orgRegistrationTemplate,
  teamInvitationTemplate,
  taskAssignmentTemplate,
  projectAssignmentTemplate,
  teamMemberCreatedTemplate
};