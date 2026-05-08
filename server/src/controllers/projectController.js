const Project = require('../models/Project');
const Notification = require('../models/Notification');
const Task = require('../models/Task');
const User = require('../models/User');
const Membership = require('../models/Membership');
const { getStageStatus, completeStage } = require('../middleware/stageGating');
const UsageService = require('../services/usageService');
const emailService = require('../services/emailService');
const MarketResearch = require('../models/MarketResearch');
const Offer = require('../models/Offer');
const TrafficStrategy = require('../models/TrafficStrategy');
const { buildUrl } = require('../utils/urlHelper');

// Helper to emit notification (will be set from index.js)
let io = null;
const setIO = (socketIO) => {
  io = socketIO;
};

// Helper to create and emit notification
const createNotification = async ({
  recipient,
  type,
  title,
  message,
  projectId,
  organizationId,
  sendEmail = false,
  emailData = null
}) => {
  try {
    const notification = await Notification.create({
      recipient,
      type,
      title,
      message,
      projectId,
      organizationId
    });

    if (io) {
      io.to(recipient.toString()).emit('notification', {
        _id: notification._id,
        type,
        title,
        message,
        projectId,
        isRead: false,
        createdAt: notification.createdAt
      });
    }

    if (sendEmail && emailData) {
      console.log('=== createNotification: sendEmail is true, looking up recipient ===');
      console.log('recipient:', recipient);
      const recipientUser = await User.findById(recipient).select('name email');
      console.log('recipientUser found:', recipientUser ? `${recipientUser.name} (${recipientUser.email})` : 'NOT FOUND');
      if (recipientUser) {
        console.log('Calling emailService.sendProjectAssignmentNotification...');
        console.log('Project:', emailData.project?.projectName || emailData.project?.businessName || emailData.project?._id);
        console.log('Role:', emailData.role);
        console.log('Assigned by:', emailData.assignedBy?.name || emailData.assignedBy?.email);
        emailService.sendProjectAssignmentNotification(
          emailData.project,
          recipientUser,
          emailData.role,
          emailData.assignedBy
        ).catch(err => console.error('Failed to send project assignment email:', err));
      }
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED HELPER: checks if a userId is a performance marketer on the project,
// handling BOTH the new array field and the legacy single field.
// ─────────────────────────────────────────────────────────────────────────────
const isPerformanceMarketer = (project, userId) => {
  const team = project.assignedTeam || {};
  const id = userId.toString();

  // New array field
  if (Array.isArray(team.performanceMarketers) && team.performanceMarketers.length > 0) {
    if (team.performanceMarketers.some(m => (m._id || m).toString() === id)) return true;
  }
  // Legacy single field
  if (team.performanceMarketer) {
    if ((team.performanceMarketer._id || team.performanceMarketer).toString() === id) return true;
  }
  return false;
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Generate tasks for a landing page when team assignments are made
// This is called when adding or updating landing pages with team assignments
// ─────────────────────────────────────────────────────────────────────────────
const generateLandingPageTasksIfAssigned = async (project, landingPage, userId) => {
  try {
    // Check if tasks already exist for this landing page
    const existingTasks = await Task.find({
      projectId: project._id,
      landingPageId: landingPage._id
    });

    if (existingTasks.length > 0) {
      console.log(`Tasks already exist for landing page ${landingPage._id}, skipping task generation.`);
      return existingTasks;
    }

    // Only generate tasks if team assignments are provided
    const assignedDesignerId = landingPage.assignedDesigner?._id || landingPage.assignedDesigner;
    const assignedDeveloperId = landingPage.assignedDeveloper?._id || landingPage.assignedDeveloper;

    if (!assignedDesignerId && !assignedDeveloperId) {
      console.log(`No team assignments for landing page ${landingPage._id}, skipping task generation.`);
      return [];
    }

    // Get landing-page-specific testers, fall back to project-level testers
    const landingPageTesters = (landingPage.assignedTesters && landingPage.assignedTesters.length > 0)
      ? landingPage.assignedTesters.map(t => t._id || t)
      : (project.assignedTeam?.testers?.length > 0)
        ? project.assignedTeam.testers.map(t => t._id || t)
        : project.assignedTeam?.tester
          ? [project.assignedTeam.tester._id || project.assignedTeam.tester]
          : [];

    // Get performance marketer
    const marketerId = project.assignedTeam?.performanceMarketers?.[0]?._id ||
                      project.assignedTeam?.performanceMarketers?.[0] ||
                      project.assignedTeam?.performanceMarketer?._id ||
                      project.assignedTeam?.performanceMarketer ||
                      null;

    console.log(`Generating tasks for landing page: ${landingPage.name}`);
    console.log(`Assigned Designer: ${assignedDesignerId}`);
    console.log(`Assigned Developer: ${assignedDeveloperId}`);
    console.log(`Landing Page Testers: ${landingPageTesters.join(', ')}`);
    console.log(`Marketer: ${marketerId}`);

    // Get strategy context for AI prompt generation
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
      cta: landingPage.cta,
      targetAudience: marketResearch?.targetAudience || '',
      painPoints: marketResearch?.painPoints || [],
      desires: marketResearch?.desires || [],
      offer: offer?.bonuses?.map(b => b.title).join(', ') || ''
    };

    const tasks = [];
    const contextLink = buildUrl(`/landing-page-strategy?projectId=${project._id}&landingPageId=${landingPage._id}`);

    // Create design task if designer is assigned
    if (assignedDesignerId) {
      const designTask = {
        projectId: project._id,
        organizationId: project.organizationId,
        landingPageId: landingPage._id,
        taskTitle: `Design: ${landingPage.name}`,
        taskType: 'landing_page_design',
        assetType: 'landing_page_design',
        assignedRole: 'ui_ux_designer',
        assignedTo: assignedDesignerId,
        assignedBy: userId,
        createdBy: userId,
        status: 'design_pending',
        strategyContext,
        contextLink,
        testerIds: landingPageTesters,
        marketerId: marketerId
      };
      tasks.push(designTask);
    }

    // Create development task if developer is assigned
    if (assignedDeveloperId) {
      const devTask = {
        projectId: project._id,
        organizationId: project.organizationId,
        landingPageId: landingPage._id,
        taskTitle: `Develop: ${landingPage.name}`,
        taskType: 'landing_page_development',
        assetType: 'landing_page_page',
        assignedRole: 'developer',
        assignedTo: null, // Assigned after design approval
        developerId: assignedDeveloperId, // Stored for later assignment
        assignedBy: userId,
        createdBy: userId,
        status: 'development_pending',
        description: 'This task will become active after the design is approved.',
        strategyContext,
        contextLink,
        testerIds: landingPageTesters,
        marketerId: marketerId
      };
      tasks.push(devTask);
    }

    if (tasks.length === 0) {
      return [];
    }

    const createdTasks = await Task.insertMany(tasks);
    console.log(`Created ${createdTasks.length} tasks for landing page ${landingPage.name || landingPage._id}`);

    // Send notifications to assigned users
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
              { name: 'System' } // System-generated task
            ).catch(err => console.error(`Failed to send landing page task email to ${assignedUser.email}:`, err.message));
          }
        } catch (emailError) {
          console.error('Error sending landing page task email:', emailError.message);
          // Don't throw - email failures should not block the operation
        }
      }
    }

    return createdTasks;
  } catch (error) {
    console.error('Error generating landing page tasks:', error);
    // Don't throw - landing page should still be saved even if task creation fails
    return [];
  }
};

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
exports.getProjects = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, search, organizationId: queryOrgId } = req.query;

    // Platform admins can see all projects or filter by organizationId query param
    let query = {};

    if (req.user.role === 'platform_admin') {
      // Platform admin: can see all projects, optionally filter by org
      if (queryOrgId) {
        query.organizationId = queryOrgId;
      }
      // If no org specified, show all projects (no filter)
    } else {
      // Regular user: filter by their organization
      query.organizationId = req.organizationId;

      if (req.user.role !== 'admin') {
        query.$or = [
          { createdBy: req.user._id },
          { 'assignedTeam.performanceMarketers': req.user._id },
          { 'assignedTeam.contentWriters': req.user._id },
          { 'assignedTeam.uiUxDesigners': req.user._id },
          { 'assignedTeam.graphicDesigners': req.user._id },
          { 'assignedTeam.videoEditors': req.user._id },
          { 'assignedTeam.developers': req.user._id },
          { 'assignedTeam.testers': req.user._id },
          { 'assignedTeam.performanceMarketer': req.user._id },
          { 'assignedTeam.uiUxDesigner': req.user._id },
          { 'assignedTeam.graphicDesigner': req.user._id },
          { 'assignedTeam.developer': req.user._id },
          { 'assignedTeam.tester': req.user._id }
        ];
      }
    }

    if (status) query.status = status;
    if (req.query.isActive !== undefined) query.isActive = req.query.isActive === 'true';
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
        { projectName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const projects = await Project.find(query)
      .populate('createdBy', 'name email')
      .populate('client', 'customerName businessName email mobile industry address')
      .populate('assignedTeam.performanceMarketers', 'name email specialization avatar')
      .populate('assignedTeam.contentWriters', 'name email specialization avatar')
      .populate('assignedTeam.uiUxDesigners', 'name email specialization avatar')
      .populate('assignedTeam.graphicDesigners', 'name email specialization avatar')
      .populate('assignedTeam.videoEditors', 'name email specialization avatar')
      .populate('assignedTeam.developers', 'name email specialization avatar')
      .populate('assignedTeam.testers', 'name email specialization avatar')
      .populate('assignedTeam.performanceMarketer', 'name email specialization')
      .populate('assignedTeam.contentCreator', 'name email specialization')
      .populate('assignedTeam.contentWriter', 'name email specialization')
      .populate('assignedTeam.uiUxDesigner', 'name email specialization')
      .populate('assignedTeam.graphicDesigner', 'name email specialization')
      .populate('assignedTeam.developer', 'name email specialization')
      .populate('assignedTeam.tester', 'name email specialization')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Project.countDocuments(query);

    const projectsWithStatus = projects.map(project => ({
      ...project.toObject(),
      stageStatus: getStageStatus(project)
    }));

    res.status(200).json({
      success: true,
      count: projects.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: projectsWithStatus
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
exports.getProject = async (req, res, next) => {
  try {
    // Platform admins can view any project, regular users are limited to their org
    const query = { _id: req.params.id };
    if (req.user.role !== 'platform_admin') {
      query.organizationId = req.organizationId;
    }

    const project = await Project.findOne(query)
      .populate('createdBy', 'name email')
      .populate('client', 'customerName businessName email mobile industry address')
      .populate('assignedTeam.performanceMarketers', 'name email specialization avatar')
      .populate('assignedTeam.contentWriters', 'name email specialization avatar')
      .populate('assignedTeam.uiUxDesigners', 'name email specialization avatar')
      .populate('assignedTeam.graphicDesigners', 'name email specialization avatar')
      .populate('assignedTeam.videoEditors', 'name email specialization avatar')
      .populate('assignedTeam.developers', 'name email specialization avatar')
      .populate('assignedTeam.testers', 'name email specialization avatar')
      .populate('assignedTeam.performanceMarketer', 'name email specialization avatar')
      .populate('assignedTeam.contentCreator', 'name email specialization avatar')
      .populate('assignedTeam.contentWriter', 'name email specialization avatar')
      .populate('assignedTeam.uiUxDesigner', 'name email specialization avatar')
      .populate('assignedTeam.graphicDesigner', 'name email specialization avatar')
      .populate('assignedTeam.developer', 'name email specialization avatar')
      .populate('assignedTeam.tester', 'name email specialization avatar')
      // Populate landing pages team assignments
      .populate('landingPages.assignedDesigners', 'name email specialization avatar')
      .populate('landingPages.assignedDevelopers', 'name email specialization avatar')
      .populate('landingPages.assignedContentWriters', 'name email specialization avatar')
      .populate('landingPages.assignedGraphicDesigners', 'name email specialization avatar')
      .populate('landingPages.assignedVideoEditors', 'name email specialization avatar')
      .populate('landingPages.assignedTesters', 'name email specialization avatar')
      .populate('landingPages.assignedDesigner', 'name email specialization avatar')
      .populate('landingPages.assignedDeveloper', 'name email specialization avatar');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Platform admins have full access
    if (req.user.role === 'platform_admin') {
      return res.status(200).json({
        success: true,
        data: {
          ...project.toObject(),
          stageStatus: getStageStatus(project)
        }
      });
    }

    const isUserAssigned = (team, field, pluralField, userId) => {
      if (pluralField && Array.isArray(team[pluralField])) {
        if (team[pluralField].some(m => (m._id || m).toString() === userId)) return true;
      }
      if (team[field]) {
        if ((team[field]._id || team[field]).toString() === userId) return true;
      }
      return false;
    };

    const userId = req.user._id.toString();
    const team = project.assignedTeam || {};
    const isAssigned =
      isUserAssigned(team, 'performanceMarketer', 'performanceMarketers', userId) ||
      isUserAssigned(team, 'contentWriter', 'contentWriters', userId) ||
      isUserAssigned(team, 'uiUxDesigner', 'uiUxDesigners', userId) ||
      isUserAssigned(team, 'graphicDesigner', 'graphicDesigners', userId) ||
      isUserAssigned(team, 'videoEditor', 'videoEditors', userId) ||
      isUserAssigned(team, 'developer', 'developers', userId) ||
      isUserAssigned(team, 'tester', 'testers', userId);

    if (req.user.role !== 'admin' && project.createdBy._id.toString() !== userId && !isAssigned) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this project' });
    }

    res.status(200).json({
      success: true,
      data: {
        ...project.toObject(),
        stageStatus: getStageStatus(project)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
exports.createProject = async (req, res, next) => {
  try {
    const {
      projectName, customerName, businessName, mobile, email,
      industry, address, description, budget, timeline, client
    } = req.body;

    const project = await Project.create({
      client, projectName, customerName, businessName, mobile, email,
      industry, address, description, budget, timeline,
      organizationId: req.organizationId,
      createdBy: req.user._id,
      stages: {
        onboarding: { isCompleted: true, completedAt: new Date() },
        marketResearch: { isCompleted: false },
        offerEngineering: { isCompleted: false },
        trafficStrategy: { isCompleted: false },
        landingPage: { isCompleted: false },
        creativeStrategy: { isCompleted: false }
      }
    });

    project.calculateProgress();
    await project.save();

    await UsageService.trackUsage(req.organizationId, 'projects', 1);

    res.status(201).json({
      success: true,
      data: { ...project.toObject(), stageStatus: getStageStatus(project) }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
exports.updateProject = async (req, res, next) => {
  try {
    const {
      projectName, customerName, businessName, mobile, email,
      industry, description, budget, timeline, status
    } = req.body;

    let project = await Project.findOne({ _id: req.params.id, organizationId: req.organizationId });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (req.user.role !== 'admin' && project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this project' });
    }

    const fieldsToUpdate = {};
    if (projectName !== undefined) fieldsToUpdate.projectName = projectName;
    if (customerName) fieldsToUpdate.customerName = customerName;
    if (businessName) fieldsToUpdate.businessName = businessName;
    if (mobile) fieldsToUpdate.mobile = mobile;
    if (email) fieldsToUpdate.email = email;
    if (industry !== undefined) fieldsToUpdate.industry = industry;
    if (description !== undefined) fieldsToUpdate.description = description;
    if (budget !== undefined) fieldsToUpdate.budget = budget;
    if (timeline) fieldsToUpdate.timeline = timeline;
    if (status) fieldsToUpdate.status = status;

    project = await Project.findByIdAndUpdate(req.params.id, fieldsToUpdate, { new: true, runValidators: true })
      .populate('createdBy', 'name email')
      .populate('assignedTeam.performanceMarketer', 'name email specialization avatar')
      .populate('assignedTeam.uiUxDesigner', 'name email specialization avatar')
      .populate('assignedTeam.graphicDesigner', 'name email specialization avatar')
      .populate('assignedTeam.developer', 'name email specialization avatar')
      .populate('assignedTeam.tester', 'name email specialization avatar');

    res.status(200).json({
      success: true,
      data: { ...project.toObject(), stageStatus: getStageStatus(project) }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (Admin only)
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, organizationId: req.organizationId });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only administrators can delete projects' });
    }

    const Task = require('../models/Task');
    await Task.deleteMany({ projectId: project._id });

    const MarketResearch = require('../models/MarketResearch');
    const Offer = require('../models/Offer');
    const TrafficStrategy = require('../models/TrafficStrategy');
    const CreativeStrategy = require('../models/Creative');
    const LandingPage = require('../models/LandingPage');

    await MarketResearch.deleteMany({ projectId: project._id });
    await Offer.deleteMany({ projectId: project._id });
    await TrafficStrategy.deleteMany({ projectId: project._id });
    await CreativeStrategy.deleteMany({ projectId: project._id });
    await LandingPage.deleteMany({ projectId: project._id });

    const Notification = require('../models/Notification');
    await Notification.deleteMany({ projectId: project._id });

    await project.deleteOne();

    await UsageService.decreaseUsage(req.organizationId, 'projects', 1);

    res.status(200).json({ success: true, message: 'Project and all associated data deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign team to project
// @route   PUT /api/projects/:id/assign-team
// @access  Private (Admin only)
exports.assignTeam = async (req, res, next) => {
  try {
    const {
      performanceMarketers, contentWriters, uiUxDesigners, graphicDesigners,
      videoEditors, developers, testers,
      performanceMarketer, uiUxDesigner, graphicDesigner, developer, tester
    } = req.body;

    const project = await Project.findOne({ _id: req.params.id, organizationId: req.organizationId });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Validate required roles
    const performanceMarketerId = (performanceMarketers && performanceMarketers[0]) || performanceMarketer;
    // const hasTester = (testers && testers.length > 0) || tester; // Commented out for now

    if (!performanceMarketerId) {
      return res.status(400).json({
        success: false,
        message: 'Performance Marketer is required. Please select a Performance Marketer for this project.'
      });
    }

    // Commented out tester validation for now
    // if (!hasTester) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Tester is required. Please select at least one Tester for this project.'
    //   });
    // }

    const allUserIds = [
      ...(performanceMarketers || []),
      ...(contentWriters || []),
      ...(uiUxDesigners || []),
      ...(graphicDesigners || []),
      ...(videoEditors || []),
      ...(developers || []),
      ...(testers || []),
      performanceMarketer, uiUxDesigner, graphicDesigner, developer, tester
    ].filter(Boolean);

    if (allUserIds.length > 0) {
      const validMemberships = await Membership.find({
        userId: { $in: allUserIds },
        organizationId: req.organizationId,
        status: 'active'
      }).select('userId');

      const validUserIds = new Set(validMemberships.map(m => m.userId.toString()));
      const invalidUsers = allUserIds.filter(id => !validUserIds.has(id.toString()));

      if (invalidUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Some team members do not belong to this organization or are not active',
          invalidUsers
        });
      }
    }

    let performanceMarketersArray = performanceMarketers || [];
    if (performanceMarketersArray.length > 1) performanceMarketersArray = [performanceMarketersArray[0]];

    // Testers can be multiple - no limit
    let testersArray = testers || [];

    project.assignedTeam = {
      performanceMarketers: performanceMarketersArray,
      contentWriters: contentWriters || [],
      uiUxDesigners: uiUxDesigners || [],
      graphicDesigners: graphicDesigners || [],
      videoEditors: videoEditors || [],
      developers: developers || [],
      testers: testersArray,
      performanceMarketer: performanceMarketer || (performanceMarketersArray[0]) || null,
      contentCreator: req.body.contentCreator || null,
      contentWriter: req.body.contentWriter || (contentWriters && contentWriters[0]) || null,
      uiUxDesigner: uiUxDesigner || (uiUxDesigners && uiUxDesigners[0]) || null,
      graphicDesigner: graphicDesigner || (graphicDesigners && graphicDesigners[0]) || null,
      videoEditor: req.body.videoEditor || (videoEditors && videoEditors[0]) || null,
      developer: developer || (developers && developers[0]) || null,
      tester: tester || (testersArray[0]) || null
    };

    await project.save();

    // Update existing tasks with new team assignments
    // Only update tasks that don't have specific testers/marketers assigned
    console.log('=== assignTeam: Updating existing tasks with new team members ===');

    // Build tester IDs array (project-level testers)
    const projectTesterIds = testersArray.map(t => t.toString());
    const projectMarketerId = performanceMarketersArray[0]?.toString() || null;

    // Update tasks that don't have specific testers assigned
    if (projectTesterIds.length > 0) {
      // Update tasks where testerIds is empty or not set (meaning they should use project-level testers)
      const tasksUpdateResult = await Task.updateMany(
        {
          projectId: project._id,
          status: { $in: ['todo', 'in_progress', 'content_pending', 'design_pending', 'development_pending', 'content_submitted', 'design_submitted', 'development_submitted'] },
          $or: [
            { testerIds: { $exists: false } },
            { testerIds: { $size: 0 } }
          ]
        },
        {
          $set: { testerIds: projectTesterIds }
        }
      );
      console.log(`Updated ${tasksUpdateResult.modifiedCount} tasks with new project-level testers`);
    }

    // Update tasks with new marketer
    if (projectMarketerId) {
      const marketerUpdateResult = await Task.updateMany(
        {
          projectId: project._id,
          status: { $in: ['approved_by_tester', 'todo', 'in_progress', 'content_pending', 'design_pending', 'development_pending'] },
          $or: [
            { marketerId: { $exists: false } },
            { marketerId: null }
          ]
        },
        {
          $set: { marketerId: projectMarketerId }
        }
      );
      console.log(`Updated ${marketerUpdateResult.modifiedCount} tasks with new project-level marketer`);
    }

    console.log('=== assignTeam: Task update complete ===');

    const allAssignedIds = new Set();
    const addIds = (ids) => {
      if (ids) (Array.isArray(ids) ? ids : [ids]).forEach(id => { if (id) allAssignedIds.add(id.toString()); });
    };

    addIds(performanceMarketers); addIds(contentWriters); addIds(uiUxDesigners);
    addIds(graphicDesigners); addIds(videoEditors); addIds(developers); addIds(testers);
    addIds(performanceMarketer); addIds(uiUxDesigner); addIds(graphicDesigner);
    addIds(developer); addIds(tester);

    const getUserRole = (userId) => {
      const id = userId.toString();
      if (performanceMarketers?.some(m => m.toString() === id) || performanceMarketer?.toString() === id) return 'performance_marketer';
      if (contentWriters?.some(m => m.toString() === id) || req.body.contentWriter?.toString() === id) return 'content_writer';
      if (uiUxDesigners?.some(m => m.toString() === id) || uiUxDesigner?.toString() === id) return 'ui_ux_designer';
      if (graphicDesigners?.some(m => m.toString() === id) || graphicDesigner?.toString() === id) return 'graphic_designer';
      if (videoEditors?.some(m => m.toString() === id) || req.body.videoEditor?.toString() === id) return 'video_editor';
      if (developers?.some(m => m.toString() === id) || developer?.toString() === id) return 'developer';
      if (testers?.some(m => m.toString() === id) || tester?.toString() === id) return 'tester';
      return 'team_member';
    };

    console.log('=== assignTeam: Sending notifications ===');
    console.log('allAssignedIds:', allAssignedIds);
    console.log('Project:', project.projectName || project.businessName);
    console.log('Assigned by:', req.user?.name, req.user?.email);

    for (const userId of allAssignedIds) {
      console.log(`Creating notification for userId: ${userId}, role: ${getUserRole(userId)}`);
      await createNotification({
        recipient: userId,
        type: 'project_assigned',
        title: 'New Project Assignment',
        message: `You have been assigned to project: ${project.projectName || project.businessName}`,
        projectId: project._id,
        organizationId: project.organizationId,
        sendEmail: true,
        emailData: { project, role: getUserRole(userId), assignedBy: req.user }
      });
    }
    console.log('=== assignTeam: Notifications sent ===');

    await project.populate('assignedTeam.performanceMarketers', 'name email specialization avatar');
    await project.populate('assignedTeam.contentWriters', 'name email specialization avatar');
    await project.populate('assignedTeam.uiUxDesigners', 'name email specialization avatar');
    await project.populate('assignedTeam.graphicDesigners', 'name email specialization avatar');
    await project.populate('assignedTeam.videoEditors', 'name email specialization avatar');
    await project.populate('assignedTeam.developers', 'name email specialization avatar');
    await project.populate('assignedTeam.testers', 'name email specialization avatar');
    await project.populate('assignedTeam.performanceMarketer', 'name email specialization avatar');
    await project.populate('assignedTeam.uiUxDesigner', 'name email specialization avatar');
    await project.populate('assignedTeam.graphicDesigner', 'name email specialization avatar');
    await project.populate('assignedTeam.developer', 'name email specialization avatar');
    await project.populate('assignedTeam.tester', 'name email specialization avatar');

    res.status(200).json({
      success: true,
      data: { ...project.toObject(), stageStatus: getStageStatus(project) }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Activate/Deactivate project
// @route   PUT /api/projects/:id/activate
// @access  Private (Admin only)
exports.toggleProjectActivation = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const project = await Project.findOne({ _id: req.params.id, organizationId: req.organizationId });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    project.isActive = isActive;
    await project.save();

    if (isActive) {
      const teamMembers = [
        project.assignedTeam.performanceMarketer,
        project.assignedTeam.uiUxDesigner,
        project.assignedTeam.graphicDesigner,
        project.assignedTeam.developer,
        project.assignedTeam.tester
      ].filter(Boolean);

      for (const memberId of teamMembers) {
        await createNotification({
          recipient: memberId,
          type: 'project_activated',
          title: 'Project Activated',
          message: `Project "${project.projectName || project.businessName}" is now active.`,
          projectId: project._id,
          organizationId: project.organizationId
        });
      }
    }

    res.status(200).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload brand assets
// @route   POST /api/projects/:id/assets
// @access  Private
exports.uploadAssets = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, organizationId: req.organizationId });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const userId = req.user._id.toString();
    const isAssigned =
      project.assignedTeam.performanceMarketer?._id?.toString() === userId ||
      project.assignedTeam.uiUxDesigner?._id?.toString() === userId ||
      project.assignedTeam.graphicDesigner?._id?.toString() === userId ||
      project.assignedTeam.developer?._id?.toString() === userId ||
      project.assignedTeam.tester?._id?.toString() === userId;

    if (req.user.role !== 'admin' && project.createdBy.toString() !== userId && !isAssigned) {
      return res.status(403).json({ success: false, message: 'Not authorized to upload assets' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const newAssets = req.files.map(file => {
      // For Cloudinary, use the provided path
      // For local storage, convert absolute path to URL path
      let filePath = file.path;
      let publicId = file.filename;

      // If using local storage, convert absolute path to URL path
      if (file.path && file.path.includes('uploads')) {
        const uploadsIndex = file.path.indexOf('uploads');
        if (uploadsIndex !== -1) {
          filePath = '/' + file.path.substring(uploadsIndex).replace(/\\/g, '/');
        }
      }

      return {
        fileName: file.originalname,
        filePath: filePath,
        publicId: publicId,
        uploadedAt: new Date()
      };
    });

    project.brandAssets = [...project.brandAssets, ...newAssets];
    await project.save();

    res.status(200).json({ success: true, data: project.brandAssets });
  } catch (error) {
    next(error);
  }
};

// @desc    Get projects assigned to current user
// @route   GET /api/projects/assigned
// @access  Private
exports.getAssignedProjects = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    // Platform admins don't have "assigned" projects - return empty
    if (req.user.role === 'platform_admin') {
      return res.status(200).json({
        success: true,
        count: 0,
        total: 0,
        page: 1,
        pages: 0,
        data: []
      });
    }

    let query = {
      organizationId: req.organizationId,
      $or: [
        { 'assignedTeam.performanceMarketer': req.user._id },
        { 'assignedTeam.uiUxDesigner': req.user._id },
        { 'assignedTeam.graphicDesigner': req.user._id },
        { 'assignedTeam.developer': req.user._id },
        { 'assignedTeam.tester': req.user._id }
      ]
    };

    if (status) query.status = status;
    if (req.query.isActive !== undefined) query.isActive = req.query.isActive === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const projects = await Project.find(query)
      .populate('createdBy', 'name email')
      .populate('assignedTeam.performanceMarketer', 'name email specialization')
      .populate('assignedTeam.uiUxDesigner', 'name email specialization')
      .populate('assignedTeam.graphicDesigner', 'name email specialization')
      .populate('assignedTeam.developer', 'name email specialization')
      .populate('assignedTeam.tester', 'name email specialization')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Project.countDocuments(query);

    res.status(200).json({
      success: true,
      count: projects.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: projects.map(p => ({ ...p.toObject(), stageStatus: getStageStatus(p) }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get project progress
// @route   GET /api/projects/:id/progress
// @access  Private
exports.getProjectProgress = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, organizationId: req.organizationId });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (req.user.role !== 'admin' && project.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.status(200).json({
      success: true,
      data: {
        progress: project.overallProgress,
        currentStage: project.currentStage,
        stages: getStageStatus(project)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/projects/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    // Platform admins can see all projects, regular users filter by org
    let query = {};
    if (req.user.role !== 'platform_admin') {
      query.organizationId = req.organizationId;

      if (req.user.role !== 'admin') {
        query.$or = [
          { createdBy: req.user._id },
          { 'assignedTeam.performanceMarketer': req.user._id },
          { 'assignedTeam.uiUxDesigner': req.user._id },
          { 'assignedTeam.graphicDesigner': req.user._id },
          { 'assignedTeam.developer': req.user._id },
          { 'assignedTeam.tester': req.user._id }
        ];
      }
    }

    const [
      totalProjects, activeProjects, pausedProjects,
      completedProjects, archivedProjects, recentProjects
    ] = await Promise.all([
      Project.countDocuments(query),
      Project.countDocuments({ ...query, status: 'active' }),
      Project.countDocuments({ ...query, status: 'paused' }),
      Project.countDocuments({ ...query, status: 'completed' }),
      Project.countDocuments({ ...query, status: 'archived' }),
      Project.find(query).sort({ updatedAt: -1 }).limit(5)
        .populate('createdBy', 'name')
        .populate('assignedTeam.performanceMarketer', 'name')
        .populate('assignedTeam.uiUxDesigner', 'name')
        .populate('assignedTeam.graphicDesigner', 'name')
        .populate('assignedTeam.developer', 'name')
        .populate('assignedTeam.tester', 'name')
    ]);

    const projectsByStage = await Project.aggregate([
      { $match: query },
      { $group: { _id: '$currentStage', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalProjects, activeProjects, pausedProjects,
        completedProjects, archivedProjects, recentProjects, projectsByStage
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.setIO = setIO;
exports.createNotification = createNotification;

// ============================================
// Landing Pages Management (embedded in Project)
// ============================================

// @desc    Add landing page to project
// @route   POST /api/projects/:id/landing-pages
// @access  Private (Admin, Performance Marketer)
exports.addLandingPage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name, funnelType, platform, hook, angle, cta, offer,
      messaging, leadCaptureMethod, headline, subheadline,
      // Legacy single fields
      assignedDesigner, assignedDeveloper,
      // New array fields for multi-select
      assignedDesigners, assignedDevelopers, assignedContentWriters,
      assignedGraphicDesigners, assignedVideoEditors, assignedTesters
    } = req.body;

    // ─────────────────────────────────────────────────────────────────────
    // FIX: populate team fields so isPerformanceMarketer() can compare _id
    // ─────────────────────────────────────────────────────────────────────
    const project = await Project.findOne({ _id: id, organizationId: req.organizationId })
      .populate('assignedTeam.performanceMarketers', '_id')
      .populate('assignedTeam.performanceMarketer', '_id')
      .populate('assignedTeam.testers', '_id')
      .populate('assignedTeam.tester', '_id');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const userId = req.user._id.toString();

    // FIX: use shared helper that checks BOTH array and legacy field
    if (req.user.role !== 'admin' && project.createdBy.toString() !== userId && !isPerformanceMarketer(project, userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized to add landing pages to this project' });
    }

    const newLandingPage = {
      name: name || `Landing Page ${project.landingPages.length + 1}`,
      funnelType: funnelType || 'video_sales_letter',
      platform: platform || 'facebook',
      hook: hook || '',
      angle: angle || '',
      cta: cta || '',
      offer: offer || '',
      messaging: messaging || '',
      leadCaptureMethod: leadCaptureMethod || 'form',
      headline: headline || '',
      subheadline: subheadline || '',
      // Legacy single fields (use first element from arrays for backward compatibility)
      assignedDesigner: assignedDesigner || (assignedDesigners && assignedDesigners[0]) || null,
      assignedDeveloper: assignedDeveloper || (assignedDevelopers && assignedDevelopers[0]) || null,
      // New array fields for multi-select
      assignedDesigners: assignedDesigners || [],
      assignedDevelopers: assignedDevelopers || [],
      assignedContentWriters: assignedContentWriters || [],
      assignedGraphicDesigners: assignedGraphicDesigners || [],
      assignedVideoEditors: assignedVideoEditors || [],
      assignedTesters: assignedTesters || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    project.landingPages.push(newLandingPage);
    await project.save();

    // Track landing page usage
    await UsageService.trackUsage(req.organizationId, 'landingPages', 1);

    // Get the newly added landing page (it's the last one in the array)
    const addedLandingPage = project.landingPages[project.landingPages.length - 1];

    // Generate tasks if team assignments are provided
    const hasAssignments = (assignedDesigners && assignedDesigners.length > 0) ||
                          (assignedDevelopers && assignedDevelopers.length > 0) ||
                          assignedDesigner || assignedDeveloper;
    if (hasAssignments) {
      await generateLandingPageTasksIfAssigned(project, addedLandingPage, req.user._id);
    }

    res.status(201).json({
      success: true,
      data: addedLandingPage
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all landing pages for a project
// @route   GET /api/projects/:id/landing-pages
// @access  Private
exports.getLandingPages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await Project.findOne({ _id: id, organizationId: req.organizationId });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const userId = req.user._id.toString();
    const team = project.assignedTeam || {};
    const isAssigned =
      (team.performanceMarketer?._id || team.performanceMarketer)?.toString() === userId ||
      (Array.isArray(team.performanceMarketers) && team.performanceMarketers.some(m => (m._id || m).toString() === userId)) ||
      (team.uiUxDesigner?._id || team.uiUxDesigner)?.toString() === userId ||
      (team.developer?._id || team.developer)?.toString() === userId ||
      (team.tester?._id || team.tester)?.toString() === userId;

    if (req.user.role !== 'admin' && project.createdBy.toString() !== userId && !isAssigned) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.status(200).json({ success: true, count: project.landingPages.length, data: project.landingPages });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single landing page
// @route   GET /api/projects/:id/landing-pages/:landingPageId
// @access  Private
exports.getLandingPage = async (req, res, next) => {
  try {
    const { id, landingPageId } = req.params;
    const project = await Project.findOne({ _id: id, organizationId: req.organizationId });

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const landingPage = project.landingPages.id(landingPageId);
    if (!landingPage) return res.status(404).json({ success: false, message: 'Landing page not found' });

    res.status(200).json({ success: true, data: landingPage });
  } catch (error) {
    next(error);
  }
};

// @desc    Update landing page
// @route   PUT /api/projects/:id/landing-pages/:landingPageId
// @access  Private (Admin, Performance Marketer)
exports.updateLandingPage = async (req, res, next) => {
  try {
    const { id, landingPageId } = req.params;
    const {
      name, funnelType, platform, hook, angle, cta, offer,
      messaging, leadCaptureMethod, headline, subheadline,
      // Legacy single fields
      assignedDesigner, assignedDeveloper,
      // New array fields for multi-select
      assignedDesigners, assignedDevelopers, assignedContentWriters,
      assignedGraphicDesigners, assignedVideoEditors, assignedTesters
    } = req.body;

    // FIX: populate so isPerformanceMarketer() works correctly
    const project = await Project.findOne({ _id: id, organizationId: req.organizationId })
      .populate('assignedTeam.performanceMarketers', '_id')
      .populate('assignedTeam.performanceMarketer', '_id');

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const userId = req.user._id.toString();
    if (req.user.role !== 'admin' && project.createdBy.toString() !== userId && !isPerformanceMarketer(project, userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized to update landing pages' });
    }

    const landingPage = project.landingPages.id(landingPageId);
    if (!landingPage) return res.status(404).json({ success: false, message: 'Landing page not found' });

    // Track if team assignments changed
    const oldDesignerIds = (landingPage.assignedDesigners || []).map(d => d?._id?.toString() || d?.toString());
    const oldDeveloperIds = (landingPage.assignedDevelopers || []).map(d => d?._id?.toString() || d?.toString());
    const oldTesterIds = (landingPage.assignedTesters || []).map(t => t?._id?.toString() || t?.toString());

    // Legacy single assignment fields (for backward compatibility)
    const oldDesignerId = landingPage.assignedDesigner?._id?.toString() || landingPage.assignedDesigner?.toString() || null;
    const oldDeveloperId = landingPage.assignedDeveloper?._id?.toString() || landingPage.assignedDeveloper?.toString() || null;

    const teamAssignmentChanged =
      (assignedDesigners !== undefined && JSON.stringify(assignedDesigners.map(String).sort()) !== JSON.stringify(oldDesignerIds.sort())) ||
      (assignedDevelopers !== undefined && JSON.stringify(assignedDevelopers.map(String).sort()) !== JSON.stringify(oldDeveloperIds.sort())) ||
      (assignedTesters !== undefined && JSON.stringify(assignedTesters.map(String).sort()) !== JSON.stringify(oldTesterIds.sort()));

    if (name !== undefined) landingPage.name = name;
    if (funnelType !== undefined) landingPage.funnelType = funnelType;
    if (platform !== undefined) landingPage.platform = platform;
    if (hook !== undefined) landingPage.hook = hook;
    if (angle !== undefined) landingPage.angle = angle;
    if (cta !== undefined) landingPage.cta = cta;
    if (offer !== undefined) landingPage.offer = offer;
    if (messaging !== undefined) landingPage.messaging = messaging;
    if (leadCaptureMethod !== undefined) landingPage.leadCaptureMethod = leadCaptureMethod;
    if (headline !== undefined) landingPage.headline = headline;
    if (subheadline !== undefined) landingPage.subheadline = subheadline;

    // Legacy single fields (use first element from arrays for backward compatibility)
    if (assignedDesigner !== undefined) landingPage.assignedDesigner = assignedDesigner;
    if (assignedDeveloper !== undefined) landingPage.assignedDeveloper = assignedDeveloper;

    // New array fields for multi-select
    if (assignedDesigners !== undefined) landingPage.assignedDesigners = assignedDesigners;
    if (assignedDevelopers !== undefined) landingPage.assignedDevelopers = assignedDevelopers;
    if (assignedContentWriters !== undefined) landingPage.assignedContentWriters = assignedContentWriters;
    if (assignedGraphicDesigners !== undefined) landingPage.assignedGraphicDesigners = assignedGraphicDesigners;
    if (assignedVideoEditors !== undefined) landingPage.assignedVideoEditors = assignedVideoEditors;
    if (assignedTesters !== undefined) landingPage.assignedTesters = assignedTesters;

    landingPage.updatedAt = new Date();

    await project.save();

    // Update existing tasks for this landing page (name, hook, angle, platform, etc.)
    try {
      const existingTasks = await Task.find({
        landingPageId: landingPageId,
        projectId: id
      });

      if (existingTasks.length > 0) {
        const lpName = name || landingPage.name || 'Landing Page';
        const platformStr = platform || landingPage.platform || '';
        const lpHook = hook !== undefined ? hook : landingPage.hook;
        const lpAngle = angle !== undefined ? angle : landingPage.angle;
        const lpHeadline = headline !== undefined ? headline : landingPage.headline;
        const lpCta = cta !== undefined ? cta : landingPage.cta;
        const lpType = funnelType || landingPage.funnelType || 'video_sales_letter';
        const lpLeadCapture = landingPage.leadCapture || null;
        const lpLeadCaptureMethod = landingPage.leadCaptureMethod || landingPage.leadCapture?.method || 'form';

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
            hook: lpHook || '',
            creativeAngle: lpAngle || '',
            headline: lpHeadline || '',
            cta: lpCta || '',
            // These are the fields displayed in the UI
            funnelStage: lpType, // funnelStage is displayed as "Funnel Stage"
            creativeType: task.taskType === 'landing_page_design' ? 'landing_page_design' : 'landing_page_development', // creativeType is displayed as "Creative Type"
            landingPageType: lpType,
            leadCapture: lpLeadCapture,
            leadCaptureMethod: lpLeadCaptureMethod
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

    // Update existing tasks if team assignments changed
    if (teamAssignmentChanged) {
      console.log('=== Team assignment changed, updating tasks ===');
      console.log('Old designer:', oldDesignerId, '-> New:', assignedDesigner);
      console.log('Old developer:', oldDeveloperId, '-> New:', assignedDeveloper);

      // Update design task if designer changed
      if (assignedDesigner !== undefined && assignedDesigner !== oldDesignerId) {
        const designTask = await Task.findOne({
          projectId: id,
          landingPageId: landingPageId,
          taskType: 'landing_page_design'
        });

        if (designTask) {
          designTask.assignedTo = assignedDesigner || null;
          designTask.assignedRole = assignedDesigner ? 'ui_ux_designer' : null;
          designTask.updatedAt = new Date();
          await designTask.save();
          console.log('Updated design task:', designTask._id);

          // Notify new designer if assigned
          if (assignedDesigner) {
            const newDesigner = await User.findById(assignedDesigner).select('name email');
            if (newDesigner && newDesigner.email) {
              await Notification.create({
                recipient: assignedDesigner,
                type: 'task_assigned',
                title: 'Task Assignment Updated',
                message: `You have been assigned to design "${landingPage.name}" landing page.`,
                projectId: id,
                organizationId: req.organizationId
              });

              // Send email notification
              emailService.sendTaskAssignmentNotification(
                designTask,
                project,
                newDesigner,
                req.user
              ).catch(err => console.error('Failed to send task email:', err.message));
            }
          }
        }
      }

      // Update development task if developer changed
      if (assignedDeveloper !== undefined && assignedDeveloper !== oldDeveloperId) {
        const devTask = await Task.findOne({
          projectId: id,
          landingPageId: landingPageId,
          taskType: 'landing_page_development'
        });

        if (devTask) {
          devTask.assignedTo = assignedDeveloper || null;
          devTask.assignedRole = assignedDeveloper ? 'developer' : null;
          devTask.updatedAt = new Date();
          await devTask.save();
          console.log('Updated development task:', devTask._id);

          // Notify new developer if assigned
          if (assignedDeveloper) {
            const newDeveloper = await User.findById(assignedDeveloper).select('name email');
            if (newDeveloper && newDeveloper.email) {
              await Notification.create({
                recipient: assignedDeveloper,
                type: 'task_assigned',
                title: 'Task Assignment Updated',
                message: `You have been assigned to develop "${landingPage.name}" landing page.`,
                projectId: id,
                organizationId: req.organizationId
              });

              // Send email notification
              emailService.sendTaskAssignmentNotification(
                devTask,
                project,
                newDeveloper,
                req.user
              ).catch(err => console.error('Failed to send task email:', err.message));
            }
          }
        }
      }

      // Update testerIds on all landing page tasks if assignedTesters changed
      if (assignedTesters !== undefined && JSON.stringify(assignedTesters.map(String).sort()) !== JSON.stringify(oldTesterIds.sort())) {
        console.log('Updating testerIds on landing page tasks. Old testers:', oldTesterIds, '-> New testers:', assignedTesters);

        const newTesterIds = (assignedTesters || []).map(t => t.toString());

        // Update all tasks for this landing page with new testers
        const taskUpdateResult = await Task.updateMany(
          {
            projectId: id,
            landingPageId: landingPageId,
            status: { $in: ['todo', 'in_progress', 'design_pending', 'development_pending', 'design_submitted', 'development_submitted'] }
          },
          {
            $set: { testerIds: newTesterIds }
          }
        );
        console.log(`Updated ${taskUpdateResult.modifiedCount} landing page tasks with new testers`);
      }
    }

    // Generate tasks if team assignments are provided and no tasks exist yet
    if ((assignedDesigner || assignedDeveloper) && teamAssignmentChanged) {
      await generateLandingPageTasksIfAssigned(project, landingPage, req.user._id);
    }

    res.status(200).json({ success: true, data: landingPage });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete landing page
// @route   DELETE /api/projects/:id/landing-pages/:landingPageId
// @access  Private (Admin, Performance Marketer)
exports.deleteLandingPage = async (req, res, next) => {
  try {
    const { id, landingPageId } = req.params;

    // FIX: populate so isPerformanceMarketer() works correctly
    const project = await Project.findOne({ _id: id, organizationId: req.organizationId })
      .populate('assignedTeam.performanceMarketers', '_id')
      .populate('assignedTeam.performanceMarketer', '_id');

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const userId = req.user._id.toString();
    if (req.user.role !== 'admin' && project.createdBy.toString() !== userId && !isPerformanceMarketer(project, userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete landing pages' });
    }

    const landingPage = project.landingPages.id(landingPageId);
    if (!landingPage) return res.status(404).json({ success: false, message: 'Landing page not found' });

    // Delete associated tasks
    const deletedTasks = await Task.deleteMany({
      projectId: id,
      landingPageId: landingPageId
    });
    console.log(`Deleted ${deletedTasks.deletedCount} tasks for landing page ${landingPageId}`);

    // Delete associated notifications
    const deletedNotifications = await Notification.deleteMany({
      projectId: id,
      // Note: Notifications don't have landingPageId, but we can match by task reference
    });

    project.landingPages.pull(landingPageId);
    await project.save();

    // Decrease landing page usage count
    await UsageService.decreaseUsage(req.organizationId, 'landingPages', 1);

    res.status(200).json({
      success: true,
      message: 'Landing page deleted successfully',
      deletedTasks: deletedTasks.deletedCount
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete landing page stage
// @route   POST /api/projects/:id/landing-pages/complete
// @access  Private (Admin, Performance Marketer)
exports.completeLandingPageStage = async (req, res, next) => {
  try {
    const { id } = req.params;

    // ─────────────────────────────────────────────────────────────────────
    // FIX: populate ALL team fields needed for task creation AND auth check
    //      in a single query — the original code only populated some fields
    //      which caused uiuxDesigners to resolve as empty.
    // ─────────────────────────────────────────────────────────────────────
    const project = await Project.findOne({ _id: id, organizationId: req.organizationId })
      .populate('assignedTeam.performanceMarketers', '_id name email')
      .populate('assignedTeam.performanceMarketer',  '_id name email')
      .populate('assignedTeam.uiUxDesigners',        '_id name email')
      .populate('assignedTeam.uiUxDesigner',         '_id name email')
      .populate('assignedTeam.developers',           '_id name email')
      .populate('assignedTeam.developer',            '_id name email')
      .populate('assignedTeam.testers',              '_id name email')
      .populate('assignedTeam.tester',               '_id name email');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const userId = req.user._id.toString();

    // FIX: use shared helper that checks BOTH array and legacy field
    if (req.user.role !== 'admin' && project.createdBy.toString() !== userId && !isPerformanceMarketer(project, userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized to complete this stage' });
    }

    const landingPages = project.landingPages || [];

    if (landingPages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Add at least one landing page before completing this stage'
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // FIX: resolve UI/UX designers from BOTH new array field and legacy
    //      single field — this is the critical fix for tasks not being created
    // ─────────────────────────────────────────────────────────────────────
    const uiuxDesigners =
      (project.assignedTeam?.uiUxDesigners?.length > 0)
        ? project.assignedTeam.uiUxDesigners
        : project.assignedTeam?.uiUxDesigner
          ? [project.assignedTeam.uiUxDesigner]
          : [];

    // Resolve developer the same way
    const developerEntry =
      project.assignedTeam?.developers?.[0] ||
      project.assignedTeam?.developer ||
      null;
    const developerId = developerEntry?._id || developerEntry || null;

    // Resolve testers (support multiple)
    const projectTesters =
      (project.assignedTeam?.testers?.length > 0)
        ? project.assignedTeam.testers.map(t => t._id || t)
        : project.assignedTeam?.tester
          ? [project.assignedTeam.tester._id || project.assignedTeam.tester]
          : [];

    // Resolve performance marketer
    const marketerEntry =
      project.assignedTeam?.performanceMarketers?.[0] ||
      project.assignedTeam?.performanceMarketer ||
      null;
    const marketerId = marketerEntry?._id || marketerEntry || null;

    console.log('=== completeLandingPageStage: team resolution ===');
    console.log('uiUxDesigners (array):', JSON.stringify(project.assignedTeam?.uiUxDesigners?.map(d => ({ id: d._id, name: d.name }))));
    console.log('uiUxDesigner (legacy):', JSON.stringify(project.assignedTeam?.uiUxDesigner));
    console.log('Resolved uiuxDesigners count:', uiuxDesigners.length);
    console.log('Resolved developerId:', developerId);
    console.log('Resolved testers:', projectTesters);
    console.log('Resolved marketerId:', marketerId);

    // Allow Performance Marketer to complete stage without requiring UI/UX Designer or Developer
    // Tasks will be created when those roles are assigned later
    // if (uiuxDesigners.length === 0) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'No UI/UX Designer is assigned to this project. Please ask the admin to assign one before completing this stage.'
    //   });
    // }

    // if (!developerId) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'No Developer is assigned to this project. Please ask the admin to assign one before completing this stage.'
    //   });
    // }

    // Only create tasks if team members are assigned
    // If no UI/UX Designer or Developer, skip task creation - Performance Marketer can complete stage without them
    if (uiuxDesigners.length === 0 || !developerId) {
      console.log('=== completeLandingPageStage: Skipping task creation - missing team members ===');
      console.log('UI/UX Designers:', uiuxDesigners.length);
      console.log('Developer:', developerId ? 'assigned' : 'not assigned');

      // Mark stage as complete without creating tasks
      project.stages = project.stages || {};
      project.stages.landingPage = {
        isCompleted: true,
        completedAt: new Date(),
        completedBy: req.user._id
      };
      project.currentStage = 'creativeStrategy';
      await project.save();

      return res.status(200).json({
        success: true,
        message: 'Landing page stage completed. Tasks will be created when team members are assigned.',
        tasksCreated: [],
        skippedTaskCreation: true
      });
    }

    // Find existing tasks to avoid duplicates
    const existingTasks = await Task.find({
      projectId: id,
      taskType: { $in: ['landing_page_design', 'landing_page_development'] }
    });
    const existingLandingPageIds = new Set(
      existingTasks.map(t => t.landingPageId?.toString()).filter(Boolean)
    );

    const MarketResearch = require('../models/MarketResearch');
    const Offer = require('../models/Offer');
    const TrafficStrategy = require('../models/TrafficStrategy');

    const [marketResearch, offer, trafficStrategy] = await Promise.all([
      MarketResearch.findOne({ projectId: id }),
      Offer.findOne({ projectId: id }),
      TrafficStrategy.findOne({ projectId: id })
    ]);

    const tasksCreated = [];
    const contextLink = buildUrl(`/projects/${id}/strategy-summary`);

    for (const landingPage of landingPages) {
      if (existingLandingPageIds.has(landingPage._id.toString())) {
        console.log(`Skipping landing page "${landingPage.name}" — tasks already exist`);
        continue;
      }

      const strategyContext = {
        businessName: project.businessName || project.customerName,
        industry: project.industry || '',
        platform: landingPage.platform,
        hook: landingPage.hook,
        creativeAngle: landingPage.angle,
        headline: landingPage.headline,
        cta: landingPage.cta,
        targetAudience: '',
        painPoints: marketResearch?.painPoints || [],
        desires: marketResearch?.desires || [],
        offer: offer?.bonuses?.map(b => b.title).join(', ') || ''
      };

      // Use the landing page's assignedDesigner if set, otherwise fall back to project's assignedTeam
      // This is the fix: respect the Performance Marketer's specific designer assignment per landing page
      const landingPageDesignerId = landingPage.assignedDesigner?._id ||
                                     landingPage.assignedDesigner?.toString() ||
                                     landingPage.assignedDesigner ||
                                     null;

      // Resolve designer ID - either from landing page or project team
      let designerIdToAssign = landingPageDesignerId;

      // If no landing page specific designer, use project team designers
      if (!designerIdToAssign && uiuxDesigners.length > 0) {
        designerIdToAssign = uiuxDesigners[0]._id || uiuxDesigners[0];
      }

      console.log(`Creating design task for landing page: "${landingPage.name}"`);
      console.log(`Landing page assignedDesigner: ${landingPage.assignedDesigner}`);
      console.log(`Resolved designerIdToAssign: ${designerIdToAssign}`);

      // Get landing-page-specific testers if set, otherwise use project-level testers
      const landingPageTesters = (landingPage.assignedTesters && landingPage.assignedTesters.length > 0)
        ? landingPage.assignedTesters.map(t => t._id || t)
        : projectTesters;

      console.log(`Landing page testers: ${landingPageTesters.join(', ')}`);

      if (designerIdToAssign) {
        const designTask = await Task.create({
          projectId: id,
          organizationId: project.organizationId,
          landingPageId: landingPage._id,
          taskTitle: `Design: ${landingPage.name || 'Landing Page'}`,
          taskType: 'landing_page_design',
          assetType: 'landing_page_design',
          assignedRole: 'ui_ux_designer',
          assignedTo: designerIdToAssign,
          assignedBy: userId,
          createdBy: userId,
          status: 'design_pending',
          strategyContext,
          contextLink,
          testerIds: landingPageTesters,
          marketerId: marketerId
        });

        tasksCreated.push(designTask);

        // Send in-app notification
        await createNotification({
          recipient: designerIdToAssign,
          type: 'task_assigned',
          title: 'New Landing Page Design Task',
          message: `You have been assigned a design task: "${landingPage.name || 'Landing Page'}" for project "${project.projectName || project.businessName}"`,
          projectId: project._id,
          organizationId: project.organizationId
        });

        // Send email notification
        try {
          const assignedUser = await User.findById(designerIdToAssign).select('name email');
          if (assignedUser && assignedUser.email) {
            await emailService.sendTaskAssignmentNotification(
              designTask,
              project,
              assignedUser,
              req.user
            ).catch(err => console.error(`Failed to send design task email to ${assignedUser.email}:`, err.message));
          }
        } catch (emailError) {
          console.error('Error sending design task email:', emailError.message);
        }

        console.log(`Design task created and notification sent to designer: ${designerIdToAssign}`);
      } else {
        console.log(`No designer assigned for landing page "${landingPage.name}" - skipping design task`);
      }

      // Use the landing page's assignedDeveloper if set, otherwise fall back to project's assignedTeam
      const landingPageDeveloperId = landingPage.assignedDeveloper?._id ||
                                     landingPage.assignedDeveloper?.toString() ||
                                     landingPage.assignedDeveloper ||
                                     null;

      // Resolve developer ID - either from landing page or project team
      const developerIdToAssign = landingPageDeveloperId || developerId;

      console.log(`Landing page assignedDeveloper: ${landingPage.assignedDeveloper}`);
      console.log(`Resolved developerIdToAssign: ${developerIdToAssign}`);

      // Create development task (unassigned until design is approved, but store developer for later)
      const devTask = await Task.create({
        projectId: id,
        organizationId: project.organizationId,
        landingPageId: landingPage._id,
        taskTitle: `Develop: ${landingPage.name || 'Landing Page'}`,
        taskType: 'landing_page_development',
        assetType: 'landing_page_page',
        assignedRole: 'developer',
        assignedTo: null,
        developerId: developerIdToAssign,
        assignedBy: userId,
        createdBy: userId,
        status: 'development_pending',
        description: 'This task will become active after the design is approved.',
        strategyContext,
        contextLink,
        testerIds: landingPageTesters,
        marketerId: marketerId
      });

      tasksCreated.push(devTask);
    }

    console.log(`Total tasks created: ${tasksCreated.length}`);

    project.stages.landingPage.isCompleted = true;
    project.stages.landingPage.completedAt = new Date();
    project.currentStage = 6;
    project.calculateProgress();
    await project.save();

    res.status(200).json({
      success: true,
      message: 'Landing page stage completed successfully',
      data: {
        ...project.toObject(),
        stageStatus: getStageStatus(project),
        tasksCreated: tasksCreated.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Skip landing page stage
// @route   POST /api/projects/:id/landing-pages/skip
// @access  Private (Admin, Performance Marketer)
exports.skipLandingPageStage = async (req, res, next) => {
  try {
    const { id } = req.params;

    // FIX: populate so isPerformanceMarketer() works correctly
    const project = await Project.findOne({ _id: id, organizationId: req.organizationId })
      .populate('assignedTeam.performanceMarketers', '_id')
      .populate('assignedTeam.performanceMarketer', '_id');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const userId = req.user._id.toString();
    if (req.user.role !== 'admin' && project.createdBy.toString() !== userId && !isPerformanceMarketer(project, userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized to skip this stage' });
    }

    project.stages.landingPage.isCompleted = true;
    project.stages.landingPage.completedAt = new Date();
    project.stages.landingPage.skipped = true;
    project.currentStage = 6;
    project.calculateProgress();
    await project.save();

    res.status(200).json({
      success: true,
      message: 'Landing page stage skipped successfully',
      data: { ...project.toObject(), stageStatus: getStageStatus(project) }
    });
  } catch (error) {
    next(error);
  }
};