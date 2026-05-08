const LandingPage = require('../models/LandingPage');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const { completeStage, getStageStatus } = require('../middleware/stageGating');
const { hasProjectAccess } = require('../utils/auth');
const emailService = require('../services/emailService');
const UsageService = require('../services/usageService');
const { buildUrl } = require('../utils/urlHelper');

const checkProjectAccess = async (projectId, user, organizationId = null) => {
  const orgId = organizationId || user.currentOrganization;
  const project = await Project.findOne({
    _id: projectId,
    organizationId: orgId
  })
    // New array fields
    .populate('assignedTeam.performanceMarketers', '_id name')
    .populate('assignedTeam.uiUxDesigners', '_id name')
    .populate('assignedTeam.graphicDesigners', '_id name')
    .populate('assignedTeam.developers', '_id name')
    .populate('assignedTeam.testers', '_id name')
    // Legacy fields
    .populate('assignedTeam.performanceMarketer', '_id name')
    .populate('assignedTeam.uiUxDesigner', '_id name')
    .populate('assignedTeam.graphicDesigner', '_id name')
    .populate('assignedTeam.developer', '_id name')
    .populate('assignedTeam.tester', '_id name');

  if (!project) {
    return { project: null, error: { status: 404, message: 'Project not found' } };
  }

  if (!hasProjectAccess(project, user)) {
    return { project: null, error: { status: 403, message: 'Not authorized to access this project' } };
  }

  return { project, error: null };
};

// @desc    Get all landing pages for a project
// @route   GET /api/landing-pages/:projectId
// @access  Private
exports.getLandingPages = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const { project, error } = await checkProjectAccess(projectId, req.user, req.organizationId);
    if (error) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }

    // Check stage access
    if (!project.stages.trafficStrategy.isCompleted) {
      return res.status(403).json({
        success: false,
        message: 'Complete Traffic Strategy first to access Landing Page Strategy'
      });
    }

    const landingPages = await LandingPage.find({ projectId, isActive: true })
      .sort({ order: 1 })
      .populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      count: landingPages.length,
      data: landingPages.map(lp => ({
        ...lp.toObject(),
        completionPercentage: lp.calculateCompletion()
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single landing page
// @route   GET /api/landing-pages/:projectId/:landingPageId
// @access  Private
exports.getLandingPage = async (req, res, next) => {
  try {
    const { projectId, landingPageId } = req.params;

    const { project, error } = await checkProjectAccess(projectId, req.user, req.organizationId);
    if (error) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }

    // Check stage access
    if (!project.stages.trafficStrategy.isCompleted) {
      return res.status(403).json({
        success: false,
        message: 'Complete Traffic Strategy first to access Landing Page Strategy'
      });
    }

    const landingPage = await LandingPage.findOne({
      _id: landingPageId,
      projectId,
      isActive: true
    }).populate('createdBy', 'name email');

    if (!landingPage) {
      return res.status(404).json({
        success: false,
        message: 'Landing page not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...landingPage.toObject(),
        completionPercentage: landingPage.calculateCompletion()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new landing page
// @route   POST /api/landing-pages/:projectId
// @access  Private
exports.createLandingPage = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const {
      name, type, funnelType, hook, angle, platform, cta, offer, messaging,
      leadCaptureMethod, leadCapture, nurturing, headline, subheadline,
      designPreferences, seoSettings
    } = req.body;

    const { project, error } = await checkProjectAccess(projectId, req.user, req.organizationId);
    if (error) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }

    // Check stage access
    if (!project.stages.trafficStrategy.isCompleted) {
      return res.status(403).json({
        success: false,
        message: 'Complete Traffic Strategy first to access Landing Page Strategy'
      });
    }

    // Get count for auto-ordering
    const count = await LandingPage.countDocuments({ projectId, isActive: true });

    const landingPage = await LandingPage.create({
      projectId,
      organizationId: req.organizationId || req.user.currentOrganization,
      name: name || `Landing Page ${count + 1}`,
      order: count,
      // Support both field names for backward compatibility
      funnelType: funnelType || type || 'video_sales_letter',
      type: type || funnelType || 'video_sales_letter',
      hook: hook || '',
      angle: angle || '',
      platform: platform || 'facebook',
      cta: cta || '',
      ctaText: cta || '', // Sync ctaText for backward compatibility
      offer: offer || '',
      messaging: messaging || '',
      leadCaptureMethod: leadCaptureMethod || 'form',
      leadCapture: leadCapture || { method: leadCaptureMethod || 'form' },
      nurturing: nurturing || [],
      headline: headline || '',
      subheadline: subheadline || '',
      designPreferences: designPreferences || {},
      seoSettings: seoSettings || {},
      createdBy: req.user._id
    });

    // Track landing page usage
    await UsageService.trackUsage(req.organizationId || req.user.currentOrganization, 'landingPages', 1);

    res.status(201).json({
      success: true,
      data: {
        ...landingPage.toObject(),
        completionPercentage: landingPage.calculateCompletion()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update landing page
// @route   PUT /api/landing-pages/:projectId/:landingPageId
// @access  Private
exports.updateLandingPage = async (req, res, next) => {
  try {
    const { projectId, landingPageId } = req.params;

    const { project, error } = await checkProjectAccess(projectId, req.user, req.organizationId);
    if (error) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }

    // Check stage access
    if (!project.stages.trafficStrategy.isCompleted) {
      return res.status(403).json({
        success: false,
        message: 'Complete Traffic Strategy first to access Landing Page Strategy'
      });
    }

    const landingPage = await LandingPage.findOne({
      _id: landingPageId,
      projectId,
      isActive: true
    });

    if (!landingPage) {
      return res.status(404).json({
        success: false,
        message: 'Landing page not found'
      });
    }

    // Update fields
    const updatableFields = [
      'name', 'type', 'funnelType', 'hook', 'angle', 'platform', 'cta', 'offer', 'messaging',
      'leadCaptureMethod', 'leadCapture', 'nurturing', 'headline', 'subheadline',
      'designPreferences', 'seoSettings'
    ];

    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        landingPage[field] = req.body[field];
      }
    });

    // Sync ctaText for backward compatibility
    if (req.body.cta !== undefined) {
      landingPage.ctaText = req.body.cta;
    }

    // Sync funnelType/type for backward compatibility
    if (req.body.funnelType !== undefined) {
      landingPage.type = req.body.funnelType;
    }
    if (req.body.type !== undefined) {
      landingPage.funnelType = req.body.type;
    }

    await landingPage.save();

    // Update existing tasks for this landing page
    try {
      const existingTasks = await Task.find({
        landingPageId: landingPage._id,
        projectId
      });

      if (existingTasks.length > 0) {
        const platformStr = landingPage.platform || '';
        const lpName = landingPage.name || 'Landing Page';
        const lpType = landingPage.type || landingPage.funnelType || 'video_sales_letter';
        const leadCaptureMethod = landingPage.leadCaptureMethod || landingPage.leadCapture?.method || 'form';

        for (const task of existingTasks) {
          // Update task title if name changed
          if (task.taskType === 'landing_page_design') {
            task.taskTitle = `Design: ${lpName}`;
          } else if (task.taskType === 'landing_page_development') {
            task.taskTitle = `Develop: ${lpName}`;
          }

          // Update strategy context with correct field names
          task.strategyContext = {
            ...task.strategyContext,
            businessName: project.businessName || project.customerName,
            industry: project.industry || '',
            platform: platformStr,
            hook: landingPage.hook || '',
            creativeAngle: landingPage.angle || '',
            headline: landingPage.headline || '',
            cta: landingPage.ctaText || landingPage.cta || '',
            // These are the fields displayed in the UI
            funnelStage: lpType, // funnelStage is displayed as "Funnel Stage"
            creativeType: task.taskType === 'landing_page_design' ? 'landing_page_design' : 'landing_page_development', // creativeType is displayed as "Creative Type"
            landingPageType: lpType,
            leadCapture: landingPage.leadCapture || null,
            leadCaptureMethod: leadCaptureMethod
          };

          // Update landing page type on task
          task.landingPageType = lpType;

          await task.save();
        }

        console.log(`Updated ${existingTasks.length} tasks for landing page ${landingPageId}`);
      }
    } catch (taskUpdateError) {
      console.error('Error updating landing page tasks:', taskUpdateError);
      // Don't fail the request if task update fails
    }

    res.status(200).json({
      success: true,
      data: {
        ...landingPage.toObject(),
        completionPercentage: landingPage.calculateCompletion()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete landing page (soft delete)
// @route   DELETE /api/landing-pages/:projectId/:landingPageId
// @access  Private
exports.deleteLandingPage = async (req, res, next) => {
  try {
    const { projectId, landingPageId } = req.params;

    const { project, error } = await checkProjectAccess(projectId, req.user, req.organizationId);
    if (error) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }

    const landingPage = await LandingPage.findOne({
      _id: landingPageId,
      projectId,
      isActive: true
    });

    if (!landingPage) {
      return res.status(404).json({
        success: false,
        message: 'Landing page not found'
      });
    }

    // Soft delete
    landingPage.isActive = false;
    await landingPage.save();

    // Decrease landing page usage count
    await UsageService.decreaseUsage(req.organizationId || req.user.currentOrganization, 'landingPages', 1);

    // Re-order remaining landing pages
    const remainingLandingPages = await LandingPage.find({
      projectId,
      isActive: true,
      order: { $gt: landingPage.order }
    }).sort({ order: 1 });

    for (const lp of remainingLandingPages) {
      lp.order = lp.order - 1;
      await lp.save();
    }

    res.status(200).json({
      success: true,
      message: 'Landing page deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete landing page and generate tasks
// @route   POST /api/landing-pages/:projectId/:landingPageId/complete
// @access  Private
exports.completeLandingPage = async (req, res, next) => {
  try {
    const { projectId, landingPageId } = req.params;

    const { project, error } = await checkProjectAccess(projectId, req.user, req.organizationId);
    if (error) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }

    // Check stage access
    if (!project.stages.trafficStrategy.isCompleted) {
      return res.status(403).json({
        success: false,
        message: 'Complete Traffic Strategy first to access Landing Page Strategy'
      });
    }

    const landingPage = await LandingPage.findOne({
      _id: landingPageId,
      projectId,
      isActive: true
    });

    if (!landingPage) {
      return res.status(404).json({
        success: false,
        message: 'Landing page not found'
      });
    }

    // FIX: Prevent re-completing an already completed landing page to avoid duplicate tasks
    if (landingPage.isCompleted) {
      return res.status(400).json({
        success: false,
        message: 'Landing page is already completed'
      });
    }

    // Mark as completed
    landingPage.isCompleted = true;
    landingPage.completedAt = new Date();
    await landingPage.save();

    // Check if this is the first completed landing page - if so, complete the stage
    const completedCount = await LandingPage.countDocuments({
      projectId,
      isCompleted: true,
      isActive: true
    });

    // If this is the first completed landing page, mark the stage as complete
    if (completedCount === 1 && !project.stages.landingPage.isCompleted) {
      await completeStage(projectId, 'landingPage');
    }

    // FIX: Check for existing tasks before generating to prevent duplicates
    const tasksCreated = await generateLandingPageTasks(project, landingPage, req.user._id);

    // Get updated project
    const updatedProject = await Project.findOne({
      _id: projectId,
      organizationId: req.organizationId || req.user.currentOrganization
    });

    res.status(200).json({
      success: true,
      message: 'Landing page completed successfully',
      data: {
        ...landingPage.toObject(),
        completionPercentage: landingPage.calculateCompletion(),
        tasksCreated: tasksCreated.length,
        projectProgress: {
          overallProgress: updatedProject.overallProgress,
          currentStage: updatedProject.currentStage,
          stages: getStageStatus(updatedProject)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to generate tasks for a landing page
// FIX: Checks for existing tasks first to prevent duplicates on re-runs
// FIX: Supports multiple designers and developers per landing page
const generateLandingPageTasks = async (project, landingPage, userId) => {
  // Check if tasks already exist for this landing page
  const existingTasks = await Task.find({
    landingPageId: landingPage._id,
    projectId: project._id
  });

  if (existingTasks.length > 0) {
    console.warn(`Tasks already exist for landing page ${landingPage._id}, skipping task generation.`);
    return existingTasks;
  }

  const tasks = [];

  // Get strategy context for task generation
  const MarketResearch = require('../models/MarketResearch');
  const Offer = require('../models/Offer');
  const TrafficStrategy = require('../models/TrafficStrategy');

  const [marketResearch, offer, trafficStrategy] = await Promise.all([
    MarketResearch.findOne({ projectId: project._id }),
    Offer.findOne({ projectId: project._id }),
    TrafficStrategy.findOne({ projectId: project._id })
  ]);

  // Build strategy context
  const strategyContext = {
    businessName: project.businessName || project.customerName,
    industry: project.industry || '',
    platform: landingPage.platform,
    hook: landingPage.hook,
    creativeAngle: landingPage.angle,
    headline: landingPage.headline,
    cta: landingPage.ctaText,
    targetAudience: marketResearch?.targetAudience || '',
    painPoints: marketResearch?.painPoints || [],
    desires: marketResearch?.desires || [],
    offer: offer?.bonuses?.map(b => b.title).join(', ') || ''
  };

  // Landing page type for funnelStage
  const lpType = landingPage.type || landingPage.funnelType || 'video_sales_letter';
  const leadCaptureMethod = landingPage.leadCaptureMethod || landingPage.leadCapture?.method || 'form';

  // Resolve testers (for design and development review)
  let testerIds = [];
  if (landingPage.assignedTesters && Array.isArray(landingPage.assignedTesters) && landingPage.assignedTesters.length > 0) {
    testerIds = landingPage.assignedTesters.map(t => t._id || t);
  } else if (project.assignedTeam?.testers && project.assignedTeam.testers.length > 0) {
    testerIds = project.assignedTeam.testers.map(t => t._id || t);
  } else if (project.assignedTeam?.tester) {
    testerIds = [project.assignedTeam.tester._id || project.assignedTeam.tester];
  }

  // Get performance marketer for final approval
  const marketerId = project.assignedTeam?.performanceMarketers?.[0]?._id ||
    project.assignedTeam?.performanceMarketers?.[0] ||
    project.assignedTeam?.performanceMarketer?._id ||
    project.assignedTeam?.performanceMarketer ||
    null;

  // Resolve UI/UX designers (SUPPORT MULTIPLE DESIGNERS)
  // Priority: landing page's assignedDesigners array → legacy assignedDesigner → project team's uiUxDesigners
  let designerIds = [];
  if (landingPage.assignedDesigners && Array.isArray(landingPage.assignedDesigners) && landingPage.assignedDesigners.length > 0) {
    designerIds = landingPage.assignedDesigners.map(d => d._id || d);
  } else if (landingPage.assignedDesigner) {
    designerIds = [landingPage.assignedDesigner._id || landingPage.assignedDesigner];
  } else if (project.assignedTeam?.uiUxDesigners && project.assignedTeam.uiUxDesigners.length > 0) {
    designerIds = project.assignedTeam.uiUxDesigners.map(d => d._id || d);
  } else if (project.assignedTeam?.uiUxDesigner) {
    designerIds = [project.assignedTeam.uiUxDesigner._id || project.assignedTeam.uiUxDesigner];
  }

  // Resolve developers (SUPPORT MULTIPLE DEVELOPERS)
  // Priority: landing page's assignedDevelopers array → legacy assignedDeveloper → project team's developers
  let developerIds = [];
  if (landingPage.assignedDevelopers && Array.isArray(landingPage.assignedDevelopers) && landingPage.assignedDevelopers.length > 0) {
    developerIds = landingPage.assignedDevelopers.map(d => d._id || d);
  } else if (landingPage.assignedDeveloper) {
    developerIds = [landingPage.assignedDeveloper._id || landingPage.assignedDeveloper];
  } else if (project.assignedTeam?.developers && project.assignedTeam.developers.length > 0) {
    developerIds = project.assignedTeam.developers.map(d => d._id || d);
  } else if (project.assignedTeam?.developer) {
    developerIds = [project.assignedTeam.developer._id || project.assignedTeam.developer];
  }

  console.log(`Landing page "${landingPage.name}": ${designerIds.length} designer(s), ${developerIds.length} developer(s), ${testerIds.length} tester(s)`);

  const contextLink = buildUrl(`/landing-page-strategy?projectId=${project._id}&landingPageId=${landingPage._id}`);

  // Create design tasks for EACH assigned designer
  for (const designerId of designerIds) {
    const designTask = {
      projectId: project._id,
      organizationId: project.organizationId,
      landingPageId: landingPage._id,
      taskTitle: `Design: ${landingPage.name}`,
      taskType: 'landing_page_design',
      assetType: 'landing_page_design',
      assignedRole: 'ui_ux_designer',
      assignedTo: designerId,
      assignedBy: userId,
      createdBy: userId,
      status: 'design_pending',
      landingPageType: lpType,
      strategyContext: {
        ...strategyContext,
        funnelStage: lpType,
        creativeType: 'landing_page_design',
        landingPageType: lpType,
        leadCapture: landingPage.leadCapture || null,
        leadCaptureMethod: leadCaptureMethod
      },
      contextLink,
      testerIds: testerIds,
      marketerId: marketerId
    };
    tasks.push(designTask);
    console.log(`Created design task for designer: ${designerId}`);
  }

  // If no designers assigned, create an unassigned design task
  if (designerIds.length === 0) {
    const designTask = {
      projectId: project._id,
      organizationId: project.organizationId,
      landingPageId: landingPage._id,
      taskTitle: `Design: ${landingPage.name}`,
      taskType: 'landing_page_design',
      assetType: 'landing_page_design',
      assignedRole: 'ui_ux_designer',
      assignedTo: null,
      assignedBy: userId,
      createdBy: userId,
      status: 'design_pending',
      landingPageType: lpType,
      strategyContext: {
        ...strategyContext,
        funnelStage: lpType,
        creativeType: 'landing_page_design',
        landingPageType: lpType,
        leadCapture: landingPage.leadCapture || null,
        leadCaptureMethod: leadCaptureMethod
      },
      contextLink,
      testerIds: testerIds,
      marketerId: marketerId
    };
    tasks.push(designTask);
    console.log('Created unassigned design task (no designers assigned)');
  }

  // Create development tasks for EACH assigned developer
  // Developer is NOT assigned yet - will be assigned when design is approved
  for (const developerId of developerIds) {
    const devTask = {
      projectId: project._id,
      organizationId: project.organizationId,
      landingPageId: landingPage._id,
      taskTitle: `Develop: ${landingPage.name}`,
      taskType: 'landing_page_development',
      assetType: 'landing_page_page',
      assignedRole: 'developer',
      assignedTo: null,       // Assigned after design approval
      developerId: developerId, // Stored for later assignment
      assignedBy: userId,
      createdBy: userId,
      status: 'development_pending',
      description: 'This task will become active after the design is approved by the tester and marketer.',
      landingPageType: lpType,
      strategyContext: {
        ...strategyContext,
        funnelStage: lpType,
        creativeType: 'landing_page_development',
        landingPageType: lpType,
        leadCapture: landingPage.leadCapture || null,
        leadCaptureMethod: leadCaptureMethod
      },
      contextLink,
      testerIds: testerIds,
      marketerId: marketerId
    };
    tasks.push(devTask);
    console.log(`Created development task for developer: ${developerId}`);
  }

  // If no developers assigned, create an unassigned development task
  if (developerIds.length === 0) {
    const devTask = {
      projectId: project._id,
      organizationId: project.organizationId,
      landingPageId: landingPage._id,
      taskTitle: `Develop: ${landingPage.name}`,
      taskType: 'landing_page_development',
      assetType: 'landing_page_page',
      assignedRole: 'developer',
      assignedTo: null,
      assignedBy: userId,
      createdBy: userId,
      status: 'development_pending',
      description: 'This task will become active after the design is approved by the tester and marketer.',
      landingPageType: lpType,
      strategyContext: {
        ...strategyContext,
        funnelStage: lpType,
        creativeType: 'landing_page_development',
        landingPageType: lpType,
        leadCapture: landingPage.leadCapture || null,
        leadCaptureMethod: leadCaptureMethod
      },
      contextLink,
      testerIds: testerIds,
      marketerId: marketerId
    };
    tasks.push(devTask);
    console.log('Created unassigned development task (no developers assigned)');
  }

  const createdTasks = await Task.insertMany(tasks);

  // Send notifications to assigned users
  const Notification = require('../models/Notification');
  const notificationPromises = createdTasks
    .filter(task => task.assignedTo)
    .map(task =>
      Notification.create({
        recipient: task.assignedTo,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `You have been assigned a new task: "${task.taskTitle}" for landing page "${landingPage.name}"`,
        projectId: project._id,
        organizationId: project.organizationId,
        taskId: task._id
      })
    );

  await Promise.all(notificationPromises);

  // Send email notifications to assigned users
  for (const task of createdTasks) {
    if (task.assignedTo) {
      try {
        const assignedUser = await User.findById(task.assignedTo).select('name email');
        if (assignedUser && assignedUser.email) {
          console.log(`Sending landing page task email to ${assignedUser.email} for task: ${task.taskTitle}`);
          await emailService.sendTaskAssignmentNotification(
            task,
            project,
            assignedUser,
            { name: 'System' }
          ).catch(err => console.error(`Failed to send landing page task email to ${assignedUser.email}:`, err.message));
        }
      } catch (emailError) {
        console.error('Error sending landing page task email:', emailError.message);
      }
    }
  }

  console.log(`Created ${createdTasks.length} tasks for landing page "${landingPage.name}" (${designerIds.length} design tasks, ${developerIds.length} development tasks)`);
  return createdTasks;
};

// @desc    Add nurturing method
// @route   POST /api/landing-pages/:projectId/:landingPageId/nurturing
// @access  Private
exports.addNurturing = async (req, res, next) => {
  try {
    const { projectId, landingPageId } = req.params;
    const { method, frequency } = req.body;

    const { project, error } = await checkProjectAccess(projectId, req.user, req.organizationId);
    if (error) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }

    const landingPage = await LandingPage.findOne({
      _id: landingPageId,
      projectId,
      isActive: true
    });

    if (!landingPage) {
      return res.status(404).json({
        success: false,
        message: 'Landing page not found'
      });
    }

    landingPage.nurturing.push({ method, frequency });
    await landingPage.save();

    res.status(200).json({
      success: true,
      data: landingPage
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove nurturing method
// @route   DELETE /api/landing-pages/:projectId/:landingPageId/nurturing/:nurturingId
// @access  Private
exports.removeNurturing = async (req, res, next) => {
  try {
    const { projectId, landingPageId, nurturingId } = req.params;

    const { project, error } = await checkProjectAccess(projectId, req.user, req.organizationId);
    if (error) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }

    const landingPage = await LandingPage.findOne({
      _id: landingPageId,
      projectId,
      isActive: true
    });

    if (!landingPage) {
      return res.status(404).json({
        success: false,
        message: 'Landing page not found'
      });
    }

    landingPage.nurturing = landingPage.nurturing.filter(
      n => n._id.toString() !== nurturingId
    );
    await landingPage.save();

    res.status(200).json({
      success: true,
      data: landingPage
    });
  } catch (error) {
    next(error);
  }
};