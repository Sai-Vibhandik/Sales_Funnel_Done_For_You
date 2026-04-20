const Project = require('../models/Project');
const Notification = require('../models/Notification');
const User = require('../models/User');
const CreativeStrategy = require('../models/Creative');
const { generateTasksFromStrategy } = require('../services/taskGenerationService');

// Stage mapping for validation
const STAGE_MAP = {
  onboarding: { order: 1, previous: null },
  marketResearch: { order: 2, previous: 'onboarding' },
  offerEngineering: { order: 3, previous: 'marketResearch' },
  trafficStrategy: { order: 4, previous: 'offerEngineering' },
  landingPage: { order: 5, previous: 'trafficStrategy' },
  creativeStrategy: { order: 6, previous: 'landingPage' }
};

// Middleware to check stage access
exports.checkStageAccess = (stageKey) => {
  return async (req, res, next) => {
    try {
      const { projectId } = req.params;

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

      // Helper to check if user is in an array
      const isInArray = (arr) => arr && Array.isArray(arr) && arr.some(member => member?._id?.toString() === req.user._id.toString() || member?.toString() === req.user._id.toString());

      // Check if user has access to this project (admin, creator, or assigned team member)
      const userId = req.user._id.toString();
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

      if (req.user.role !== 'admin' && project.createdBy.toString() !== userId && !isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this project'
        });
      }

      const stageInfo = STAGE_MAP[stageKey];

      if (!stageInfo) {
        return res.status(400).json({
          success: false,
          message: 'Invalid stage key'
        });
      }

      // Check if this is the first stage (always accessible)
      if (stageInfo.order === 1) {
        req.project = project;
        return next();
      }

      // Check if all previous stages are completed
      const previousStageKey = stageInfo.previous;
      const previousStage = project.stages[previousStageKey];

      if (!previousStage || !previousStage.isCompleted) {
        return res.status(403).json({
          success: false,
          message: `Complete ${formatStageName(previousStageKey)} first to access this stage`,
          stageGate: {
            currentStage: stageKey,
            requiredStage: previousStageKey,
            requiredStageComplete: false
          }
        });
      }

      req.project = project;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware to mark stage as completed
exports.completeStage = async (projectId, stageKey, completedBy = null) => {
  const project = await Project.findById(projectId);

  if (!project) {
    throw new Error('Project not found');
  }

  if (!project.stages[stageKey]) {
    throw new Error('Invalid stage key');
  }

  project.stages[stageKey].isCompleted = true;
  project.stages[stageKey].completedAt = new Date();

  // Update current stage to next stage
  const stageOrder = ['onboarding', 'marketResearch', 'offerEngineering', 'trafficStrategy', 'landingPage', 'creativeStrategy'];
  const currentIndex = stageOrder.indexOf(stageKey);

  // Always update currentStage to reflect progress
  if (currentIndex < stageOrder.length - 1) {
    // Move to next stage
    project.currentStage = currentIndex + 2; // +2 because stage starts at 1
  } else {
    // All stages completed - set to completed (stage 7 = completed)
    project.currentStage = stageOrder.length + 1; // 7 = all stages completed
  }

  // Calculate overall progress
  project.calculateProgress();

  // Check if all stages are completed (strategy complete)
  const allStagesComplete = stageOrder.every(stage => project.stages[stage]?.isCompleted);

  if (allStagesComplete && project.strategyStatus === 'in_progress') {
    project.strategyStatus = 'completed';
    project.strategyCompletedAt = new Date();

    // Notify all admins about strategy completion
    const admins = await User.find({ role: 'admin', isActive: true });
    const projectDisplay = project.projectName || project.businessName;

    for (const admin of admins) {
      await Notification.create({
        recipient: admin._id,
        type: 'strategy_completed',
        title: 'Strategy Completed',
        message: `The full strategy for project "${projectDisplay}" has been completed by the Performance Marketer and is ready for your review.`,
        projectId: project._id,
        organizationId: project.organizationId
      });
    }

    console.log(`Strategy completed for project ${projectDisplay}. Notified ${admins.length} admins.`);

    // Generate tasks automatically when strategy is completed
    try {
      const creativeStrategy = await CreativeStrategy.findOne({ projectId });
      // Landing pages are embedded in the Project document
      const landingPages = project.landingPages || [];
      const hasAdTypes = creativeStrategy && creativeStrategy.adTypes && creativeStrategy.adTypes.length > 0;
      const hasCreativePlan = creativeStrategy && creativeStrategy.creativePlan && creativeStrategy.creativePlan.length > 0;
      const hasLandingPages = landingPages.length > 0;

      console.log(`Task generation check: hasAdTypes=${hasAdTypes}, hasCreativePlan=${hasCreativePlan}, hasLandingPages=${hasLandingPages}`);

      if (hasAdTypes || hasCreativePlan || hasLandingPages) {
        // Use the completedBy user if provided, otherwise use project creator
        const taskCreator = completedBy || project.createdBy;
        const tasks = await generateTasksFromStrategy(projectId, creativeStrategy, taskCreator);
        console.log(`Generated ${tasks.length} tasks for project ${projectDisplay}`);
      } else {
        console.log(`No tasks generated: No ad types or landing pages found for project ${projectDisplay}`);
      }
    } catch (error) {
      console.error('Error generating tasks after strategy completion:', error);
      console.error('Error stack:', error.stack);
      // Don't throw - we don't want to fail the stage completion if task generation fails
    }
  }

  await project.save();
  return project;
};

// Get stage status for a project
exports.getStageStatus = (project) => {
  const stages = [
    { key: 'onboarding', name: 'Customer Onboarding', order: 1 },
    { key: 'marketResearch', name: 'Market Research', order: 2 },
    { key: 'offerEngineering', name: 'Offer Engineering', order: 3 },
    { key: 'trafficStrategy', name: 'Traffic Strategy', order: 4 },
    { key: 'landingPage', name: 'Landing Page & Lead Capture', order: 5 },
    { key: 'creativeStrategy', name: 'Creative Strategy Execution', order: 6 }
  ];

  return stages.map((stage, index) => {
    const stageData = project.stages[stage.key] || {};
    const isCompleted = stageData.isCompleted || false;
    const isAccessible = index === 0 || (project.stages[stages[index - 1].key]?.isCompleted);

    return {
      ...stage,
      isCompleted,
      isAccessible,
      completedAt: stageData.completedAt,
      isLocked: !isAccessible
    };
  });
};

// Helper function to format stage names
function formatStageName(stageKey) {
  const names = {
    onboarding: 'Customer Onboarding',
    marketResearch: 'Market Research',
    offerEngineering: 'Offer Engineering',
    trafficStrategy: 'Traffic Strategy',
    landingPage: 'Landing Page & Lead Capture',
    creativeStrategy: 'Creative Strategy Execution'
  };
  return names[stageKey] || stageKey;
}

module.exports.STAGE_MAP = STAGE_MAP;