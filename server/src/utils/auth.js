const Project = require('../models/Project');

/**
 * Check if a user has access to a project
 * @param {Object} project - The project document (should have assignedTeam populated)
 * @param {Object} user - The user object from req.user
 * @returns {boolean} - True if user has access
 */
exports.hasProjectAccess = (project, user) => {
  // Admin always has access
  if (user.role === 'admin') {
    return true;
  }

  const userId = user._id.toString();

  // Check if user is the creator
  if (project.createdBy && project.createdBy.toString() === userId) {
    return true;
  }

  // Helper to check if user is in an array
  const isInArray = (arr) => arr && Array.isArray(arr) && arr.some(member => member?._id?.toString() === userId || member?.toString() === userId);

  // Check if user is assigned to the team (both new array fields and legacy single fields)
  const isAssigned =
    // New array fields
    isInArray(project.assignedTeam?.performanceMarketers) ||
    isInArray(project.assignedTeam?.contentWriters) ||
    isInArray(project.assignedTeam?.uiUxDesigners) ||
    isInArray(project.assignedTeam?.graphicDesigners) ||
    isInArray(project.assignedTeam?.videoEditors) ||
    isInArray(project.assignedTeam?.developers) ||
    isInArray(project.assignedTeam?.testers) ||
    // Legacy single fields
    project.assignedTeam?.performanceMarketer?._id?.toString() === userId ||
    project.assignedTeam?.contentCreator?._id?.toString() === userId ||
    project.assignedTeam?.contentWriter?._id?.toString() === userId ||
    project.assignedTeam?.uiUxDesigner?._id?.toString() === userId ||
    project.assignedTeam?.graphicDesigner?._id?.toString() === userId ||
    project.assignedTeam?.developer?._id?.toString() === userId ||
    project.assignedTeam?.tester?._id?.toString() === userId;

  return isAssigned;
};

/**
 * Middleware to check project access
 * @param {string} projectIdParam - The request param name for project ID (default: 'projectId')
 * @returns {Function} Express middleware
 */
exports.checkProjectAccess = (projectIdParam = 'projectId') => {
  return async (req, res, next) => {
    try {
      const projectId = req.params[projectIdParam];

      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: 'Project ID is required'
        });
      }

      const project = await Project.findOne({
        _id: projectId,
        organizationId: req.user.currentOrganization
      })
        // New array fields
        .populate('assignedTeam.performanceMarketers', '_id')
        .populate('assignedTeam.contentWriters', '_id')
        .populate('assignedTeam.uiUxDesigners', '_id')
        .populate('assignedTeam.graphicDesigners', '_id')
        .populate('assignedTeam.videoEditors', '_id')
        .populate('assignedTeam.developers', '_id')
        .populate('assignedTeam.testers', '_id')
        // Legacy single fields
        .populate('assignedTeam.performanceMarketer', '_id')
        .populate('assignedTeam.contentCreator', '_id')
        .populate('assignedTeam.contentWriter', '_id')
        .populate('assignedTeam.uiUxDesigner', '_id')
        .populate('assignedTeam.graphicDesigner', '_id')
        .populate('assignedTeam.developer', '_id')
        .populate('assignedTeam.tester', '_id');

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      if (!exports.hasProjectAccess(project, req.user)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this project'
        });
      }

      req.project = project;
      next();
    } catch (error) {
      next(error);
    }
  };
};