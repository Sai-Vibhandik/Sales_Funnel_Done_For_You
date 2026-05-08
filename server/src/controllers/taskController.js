const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const Notification = require('../models/Notification');
const CreativeStrategy = require('../models/Creative');
const { generateTasksFromStrategy } = require('../services/taskGenerationService');
const emailService = require('../services/emailService');
const RejectionService = require('../services/rejectionService');

// Debug: Confirm emailService loaded
console.log('📋 Task Controller loaded');
console.log('  - emailService type:', typeof emailService);
console.log('  - sendTaskAssignmentNotification:', typeof emailService.sendTaskAssignmentNotification);

// Import centralized status constants
const {
  PENDING_STATUSES,
  SUBMITTED_STATUSES,
  APPROVED_STATUSES,
  TESTER_APPROVED_STATUSES,
  FINAL_STATUSES,
  REJECTED_STATUSES,
  STATUS_CONFIG,
  getStatusConfig,
  getInitialStatus,
  getValidTransitions
} = require('../constants/taskStatuses');

// Map status to progress action
const STATUS_TO_ACTION = {
  'todo': 'created',
  'in_progress': 'assigned',
  'content_pending': 'assigned',
  'content_submitted': 'submitted',
  'content_final_approved': 'approved',
  'content_rejected': 'rejected',
  'design_pending': 'assigned',
  'design_submitted': 'submitted',
  'design_approved': 'approved',
  'design_rejected': 'rejected',
  'development_pending': 'assigned',
  'development_submitted': 'submitted',
  'development_approved': 'approved',
  'development_rejected': 'rejected',
  'final_approved': 'completed',
  'rejected': 'rejected',
  'approved_by_tester': 'approved',
  'submitted': 'submitted'
};

// Helper function to add progress history entry
const addProgressEntry = (task, userId, userRole, action, notes = null) => {
  // Map current status to stage
  const stageMap = {
    'todo': 'created',
    'in_progress': 'assigned',
    'content_pending': 'content_pending',
    'content_submitted': 'content_submitted',
    'content_final_approved': 'content_approved',
    'content_rejected': 'content_rejected',
    'design_pending': 'design_pending',
    'design_submitted': 'design_submitted',
    'design_approved': 'design_approved',
    'design_rejected': 'design_rejected',
    'development_pending': 'development_pending',
    'development_submitted': 'development_submitted',
    'development_approved': 'development_approved',
    'final_approved': 'final_approved',
    'rejected': 'rejected',
    'approved_by_tester': 'marketer_review'
  };

  const stage = stageMap[task.status] || task.status;

  // Calculate duration from previous entry
  let durationFromPrevious = null;
  if (task.progressHistory && task.progressHistory.length > 0) {
    const lastEntry = task.progressHistory[task.progressHistory.length - 1];
    durationFromPrevious = new Date() - new Date(lastEntry.timestamp);
  }

  task.progressHistory.push({
    stage,
    action,
    actor: userId,
    actorRole: userRole,
    timestamp: new Date(),
    notes,
    durationFromPrevious
  });
};

// Helper to check project access
const checkProjectAccess = async (projectId, user) => {
  const project = await Project.findOne({
    _id: projectId,
    organizationId: user.currentOrganization
  })
    // New array fields
    .populate('assignedTeam.performanceMarketers', '_id name')
    .populate('assignedTeam.contentWriters', '_id name')
    .populate('assignedTeam.uiUxDesigners', '_id name')
    .populate('assignedTeam.graphicDesigners', '_id name')
    .populate('assignedTeam.videoEditors', '_id name')
    .populate('assignedTeam.developers', '_id name')
    .populate('assignedTeam.testers', '_id name')
    // Legacy single fields
    .populate('assignedTeam.performanceMarketer', '_id name')
    .populate('assignedTeam.contentCreator', '_id name')
    .populate('assignedTeam.contentWriter', '_id name')
    .populate('assignedTeam.uiUxDesigner', '_id name')
    .populate('assignedTeam.graphicDesigner', '_id name')
    .populate('assignedTeam.videoEditor', '_id name')
    .populate('assignedTeam.developer', '_id name')
    .populate('assignedTeam.tester', '_id name');

  if (!project) {
    return { project: null, error: { status: 404, message: 'Project not found' } };
  }

  const userId = user._id.toString();
  const isAdmin = user.role === 'admin';
  const isCreator = project.createdBy?.toString() === userId;

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
    project.assignedTeam?.videoEditor?._id?.toString() === userId ||
    project.assignedTeam?.developer?._id?.toString() === userId ||
    project.assignedTeam?.tester?._id?.toString() === userId;

  if (!isAdmin && !isCreator && !isAssigned) {
    return { project: null, error: { status: 403, message: 'Not authorized to access this project' } };
  }

  return { project, error: null };
};

// @desc    Get all tasks for a project
// @route   GET /api/tasks/project/:projectId
// @access  Private
exports.getProjectTasks = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, taskType, assignedTo, assignedRole } = req.query;

    const { project, error } = await checkProjectAccess(projectId, req.user);
    if (error) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    const query = { projectId };
    if (status) query.status = status;
    if (taskType) query.taskType = taskType;
    if (assignedTo) query.assignedTo = assignedTo;
    if (assignedRole) query.assignedRole = assignedRole;

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email role')
      .populate('assignedBy', 'name email')
      .populate('reviewedBy', 'name email')
      .populate('testerReviewedBy', 'name email')
      .populate('marketerApprovedBy', 'name email')
      .populate('testerId', 'name email role')
      .populate('marketerId', 'name email role')
      .populate('parentTaskId', 'taskTitle status')
      .populate('progressHistory.actor', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tasks assigned to current user
// @route   GET /api/tasks/my-tasks
// @access  Private
exports.getMyTasks = async (req, res, next) => {
  try {
    const { status, taskType, projectId } = req.query;

    // Build query to find tasks assigned to user OR
    // tasks where user is originalAssignedTo and task is in rejected status
    const rejectedStatuses = ['content_rejected', 'design_rejected', 'rejected'];

    const query = {
      $or: [
        // Tasks directly assigned to user
        {
          assignedTo: req.user._id,
          organizationId: req.organizationId
        },
        // Tasks where user is original assignee and task needs resubmission
        {
          originalAssignedTo: req.user._id,
          status: { $in: rejectedStatuses },
          organizationId: req.organizationId
        },
        // Tasks where user is original assignee and in pending status with rejection notes
        {
          originalAssignedTo: req.user._id,
          status: { $in: ['content_pending', 'design_pending', 'development_pending'] },
          organizationId: req.organizationId,
          $or: [
            { rejectionNote: { $ne: null, $exists: true } },
            { rejectionReason: { $ne: null, $exists: true } }
          ]
        }
      ]
    };

    if (status) {
      // Override the query with simple status filter if provided
      query.$or = undefined;
      query.assignedTo = req.user._id;
      query.organizationId = req.organizationId;
      query.status = status;
    }
    if (taskType) query.taskType = taskType;
    if (projectId) query.projectId = projectId;

    const tasks = await Task.find(query)
      .populate('projectId', 'projectName businessName industry')
      .populate('assignedTo', 'name email role')
      .populate('originalAssignedTo', 'name email role')
      .populate('assignedBy', 'name email')
      .populate('progressHistory.actor', 'name email role')
      .sort({ priority: -1, dueDate: 1 });

    // Filter out tasks where project was deleted
    const validTasks = tasks.filter(task => task.projectId !== null);

    res.status(200).json({
      success: true,
      count: validTasks.length,
      data: validTasks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single task
// @route   GET /api/tasks/:taskId
// @access  Private
exports.getTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId)
      .populate('projectId', 'projectName businessName industry')
      .populate('assignedTo', 'name email role')
      .populate('originalAssignedTo', 'name email role')
      .populate('assignedBy', 'name email')
      .populate('reviewedBy', 'name email')
      .populate('testerReviewedBy', 'name email')
      .populate('marketerApprovedBy', 'name email')
      .populate('testerId', 'name email role')
      .populate('marketerId', 'name email role')
      .populate('parentTaskId', 'taskTitle status')
      .populate('progressHistory.actor', 'name email role');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check access
    const { error } = await checkProjectAccess(task.projectId._id, req.user);
    if (error) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new task (manual)
// @route   POST /api/tasks
// @access  Private (Admin or Performance Marketer)
exports.createTask = async (req, res, next) => {
  try {
    const {
      projectId,
      taskType,
      assetType,
      taskTitle,
      assignedTo,
      assignedRole,
      description,
      priority,
      dueDate,
      aiPrompt,
      strategyContext
    } = req.body;

    const { project, error } = await checkProjectAccess(projectId, req.user);
    if (error) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    // Only admin or performance marketer can create tasks
    if (req.user.role !== 'admin' && req.user.role !== 'performance_marketer') {
      return res.status(403).json({
        success: false,
        message: 'Only admins or performance marketers can create tasks'
      });
    }

    // Determine assigned role if not provided
    const role = assignedRole || Task.getRoleForTaskType(taskType);

    const task = await Task.create({
      projectId,
      organizationId: req.organizationId,
      taskType,
      assetType,
      taskTitle,
      assignedTo: assignedTo || null,
      originalAssignedTo: assignedTo || null, // Track original assignee
      assignedRole: role,
      assignedBy: req.user._id,
      createdBy: req.user._id,
      description,
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      aiPrompt,
      strategyContext,
      status: Task.getInitialStatus(taskType),
      // Initialize progress history with creation entry
      progressHistory: [{
        stage: 'created',
        action: 'created',
        actor: req.user._id,
        actorRole: req.user.role,
        timestamp: new Date(),
        notes: assignedTo ? `Task created and assigned to ${role}` : 'Task created'
      }]
    });

    // Notify assigned user if any
    console.log('=== createTask: Checking if assignedTo exists:', !!assignedTo);
    if (assignedTo) {
      console.log('Creating notification for assigned user:', assignedTo);
      const projectDisplay = project.projectName || project.businessName;
      await Notification.create({
        recipient: assignedTo,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `You have been assigned a new task: "${taskTitle}" for project "${projectDisplay}"`,
        projectId,
        organizationId: req.organizationId
      });
      console.log('Notification created');

      // Send email notification (async, don't block)
      console.log('Finding assigned user...');
      const assignedUser = await User.findById(assignedTo).select('name email');
      console.log('Assigned user found:', assignedUser?.name, assignedUser?.email);

      if (assignedUser) {
        console.log('Calling emailService.sendTaskAssignmentNotification...');
        emailService.sendTaskAssignmentNotification(task, project, assignedUser, req.user)
          .catch(err => console.error('Failed to send task assignment email:', err));
      } else {
        console.log('No assigned user found, skipping email');
      }
    } else {
      console.log('No assignedTo provided, skipping notification and email');
    }

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task (start, submit, upload files)
// @route   PUT /api/tasks/:taskId
// @access  Private (Assigned user only)
exports.updateTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const {
      status, assetUrl, outputFiles, contentOutput, notes,
      // Content creator submission fields
      contentLink, contentFile, contentNotes,
      // Creative task fields
      creativeLink, reviewNotes,
      // Landing page design fields
      designLink, designFile, designNotes,
      // Landing page development fields
      implementationUrl, repoLink, devNotes
    } = req.body;

    const task = await Task.findById(taskId).populate('projectId', '_id projectName businessName organizationId');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Ensure organizationId is set (fix for tasks created before multi-tenant migration)
    if (!task.organizationId && task.projectId?.organizationId) {
      task.organizationId = task.projectId.organizationId;
    }

    // Check if user is assigned to this task or is admin
    const isAssigned = task.assignedTo?.toString() === req.user._id.toString();
    // Also check if user is the original assignee (for rejected tasks that need resubmission)
    const isOriginalAssigned = task.originalAssignedTo?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    // Allow update if user is assigned, is the original assignee (for rejected tasks), or is admin
    if (!isAssigned && !isOriginalAssigned && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned user or admin can update this task'
      });
    }

    const oldStatus = task.status;

    // Update fields
    if (status) {
      // Validate status transitions
      const validTransitions = getValidTransitions(task.status, task.taskType);
      if (!validTransitions.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot transition from ${task.status} to ${status}. Valid transitions: ${validTransitions.join(', ')}`
        });
      }
      task.status = status;

      // Update assignedRole and assignedTo based on status transition
      // When submitted for review, assign to the specific tester
      // IMPORTANT: Preserve originalAssignedTo so the original creator can still see their tasks
      if (status === 'content_submitted') {
        // Preserve the original Content Planner for history
        if (!task.originalAssignedTo && task.assignedTo) {
          task.originalAssignedTo = task.assignedTo;
        }
        task.assignedRole = 'tester';
        // Assign to specific tester if available (check testerIds array first, then legacy testerId)
        const assignedTesterId = task.testerIds?.[0] || task.testerId;
        if (assignedTesterId) {
          task.assignedTo = assignedTesterId;
          console.log(`Task ${task._id}: Assigned to tester from task.testerIds/testerId: ${assignedTesterId}`);
        }
      } else if (status === 'design_submitted') {
        // Preserve the original designer for history
        if (!task.originalAssignedTo && task.assignedTo) {
          task.originalAssignedTo = task.assignedTo;
        }
        task.assignedRole = 'tester';
        const assignedTesterId = task.testerIds?.[0] || task.testerId;
        if (assignedTesterId) {
          task.assignedTo = assignedTesterId;
          console.log(`Task ${task._id}: Assigned to tester from task.testerIds/testerId: ${assignedTesterId}`);
        }
      } else if (status === 'development_submitted') {
        // Preserve the original developer for history
        if (!task.originalAssignedTo && task.assignedTo) {
          task.originalAssignedTo = task.assignedTo;
        }
        task.assignedRole = 'tester';
        const assignedTesterId = task.testerIds?.[0] || task.testerId;
        if (assignedTesterId) {
          task.assignedTo = assignedTesterId;
          console.log(`Task ${task._id}: Assigned to tester from task.testerIds/testerId: ${assignedTesterId}`);
        }
      }

      // If testerId is not set and task is being submitted, get tester from project
      if (['content_submitted', 'design_submitted', 'development_submitted'].includes(status) && !task.testerIds?.length && !task.testerId) {
        const project = await Project.findById(task.projectId._id || task.projectId).select('assignedTeam');
        if (project?.assignedTeam) {
          // Get tester from project team (check array field first, then legacy field)
          const projectTesterId = project.assignedTeam.testers?.[0]?._id ||
                                   project.assignedTeam.testers?.[0] ||
                                   project.assignedTeam.tester?._id ||
                                   project.assignedTeam.tester;
          if (projectTesterId) {
            task.testerId = projectTesterId;
            task.assignedTo = projectTesterId;
            console.log(`Task ${task._id}: Setting testerId from project: ${projectTesterId}`);
          }
        }
      }
      // When rejected, assign back to original role
      else if (status === 'content_rejected') {
        task.assignedRole = 'content_writer';
        // Re-assign to original Content Planner (from the task's creator info)
        // The task should be assigned back to whoever created the content
      } else if (status === 'design_rejected') {
        // Assign to appropriate designer based on task type
        if (task.taskType === 'landing_page_design') {
          task.assignedRole = 'ui_ux_designer';
        } else {
          task.assignedRole = 'graphic_designer';
        }
        // The task should be assigned back to the original designer
      }

      // Update timestamps
      if (status === 'in_progress' && !task.startedAt) {
        task.startedAt = new Date();
      }
      if (['submitted', 'content_submitted', 'design_submitted', 'development_submitted'].includes(status)) {
        task.submittedAt = new Date();
      }
      if (status === 'final_approved') {
        task.completedAt = new Date();
      }

      task.addRevision(req.user._id, notes || '', oldStatus, status);

      // Add progress history entry for status change
      const action = STATUS_TO_ACTION[status] || 'submitted';
      const progressNotes = notes || `Status changed from ${oldStatus} to ${status}`;
      addProgressEntry(task, req.user._id, req.user.role, action, progressNotes);
    }

    // If status is changing to content_final_approved, copy content to linked design task
    if (status === 'content_final_approved' && oldStatus !== 'content_final_approved') {
      console.log('\n========== STATUS CHANGE TO CONTENT_FINAL_APPROVED - COPYING TO DESIGN TASK ==========');
      console.log('Content task ID:', task._id);
      console.log('Content task contentLink:', task.contentLink || '(none)');

      try {
        // Find linked design task by parentTaskId
        const videoTypes = ['video_creative', 'ugc_content', 'testimonial_content', 'demo_video', 'reel'];
        const isVideoTask = task.creativeOutputType && videoTypes.includes(task.creativeOutputType);
        const designTaskType = isVideoTask ? 'video_editing' : 'graphic_design';

        const designTask = await Task.findOne({
          parentTaskId: task._id,
          taskType: designTaskType
        });

        if (designTask) {
          console.log('Found linked design task:', designTask._id);
          console.log('Design task type:', designTask.taskType);

          // Copy content fields
          if (task.contentLink) {
            designTask.contentLink = task.contentLink;
            console.log('✓ Copied contentLink');
          }
          if (task.contentFile) {
            designTask.contentFile = task.contentFile;
            console.log('✓ Copied contentFile');
          }
          if (task.contentNotes) {
            designTask.contentNotes = task.contentNotes;
            console.log('✓ Copied contentNotes');
          }
          if (task.contentOutput) {
            designTask.contentOutput = task.contentOutput;
            console.log('✓ Copied contentOutput');
          }

          await designTask.save();
          console.log('✓ Design task saved with copied content');
        } else {
          console.log('No linked design task found for content task:', task._id);
        }
      } catch (copyError) {
        console.error('Error copying content to design task:', copyError);
      }
      console.log('========== END STATUS CHANGE COPY ==========\n');
    }

    if (assetUrl) task.assetUrl = assetUrl;
    if (outputFiles && outputFiles.length > 0) {
      task.outputFiles = [...task.outputFiles, ...outputFiles.map(f => ({
        name: f.name,
        path: f.path,
        publicId: f.publicId,
        uploadedAt: new Date()
      }))];
    }
    if (contentOutput) {
      task.contentOutput = { ...task.contentOutput, ...contentOutput };
    }

    // Handle content creator submission fields
    if (contentLink !== undefined) {
      task.contentLink = contentLink;
    }
    if (contentFile !== undefined) {
      task.contentFile = contentFile;
    }
    if (contentNotes !== undefined) {
      task.contentNotes = contentNotes;
    }

    // If content is being updated and task is already approved, also update linked design task
    if (task.taskType === 'content_creation' && task.status === 'content_final_approved') {
      const hasContentUpdate = contentLink !== undefined || contentFile !== undefined || contentNotes !== undefined || contentOutput !== undefined;

      if (hasContentUpdate) {
        console.log('\n========== CONTENT UPDATE AFTER APPROVAL - SYNCING TO DESIGN TASK ==========');
        console.log('Content task ID:', task._id);

        // Find linked design task
        const linkedDesignTask = await Task.findOne({
          parentTaskId: task._id,
          taskType: { $in: ['graphic_design', 'video_editing'] }
        });

        if (linkedDesignTask) {
          console.log('Found linked design task:', linkedDesignTask._id);
          console.log('Task type:', linkedDesignTask.taskType);
          console.log('Task title:', linkedDesignTask.taskTitle);

          // Sync content fields
          if (contentLink !== undefined) {
            linkedDesignTask.contentLink = contentLink;
            console.log('✓ Synced contentLink to design task');
          }
          if (contentFile !== undefined) {
            linkedDesignTask.contentFile = contentFile;
            console.log('✓ Synced contentFile to design task');
          }
          if (contentNotes !== undefined) {
            linkedDesignTask.contentNotes = contentNotes;
            console.log('✓ Synced contentNotes to design task');
          }
          if (contentOutput !== undefined) {
            linkedDesignTask.contentOutput = { ...linkedDesignTask.contentOutput, ...contentOutput };
            console.log('✓ Synced contentOutput to design task');
          }

          await linkedDesignTask.save();
          console.log('✓ Design task saved with updated content');
        } else {
          console.log('No linked design task found for content task:', task._id);
        }
        console.log('========== END CONTENT SYNC ==========\n');
      }
    }

    // Handle designer submission fields
    if (creativeLink !== undefined) {
      task.creativeLink = creativeLink;
    }
    if (reviewNotes !== undefined) {
      task.reviewNotes = reviewNotes;
    }

    // Handle landing page design submission fields
    if (designLink !== undefined) {
      task.designLink = designLink;
    }
    if (designFile !== undefined) {
      task.designFile = designFile;
    }
    if (designNotes !== undefined) {
      task.designNotes = designNotes;
    }

    // Handle landing page development submission fields
    if (implementationUrl !== undefined) {
      task.implementationUrl = implementationUrl;
    }
    if (repoLink !== undefined) {
      task.repoLink = repoLink;
    }
    if (devNotes !== undefined) {
      task.devNotes = devNotes;
    }

    await task.save();

    // Notify tester when task is submitted
    if (['submitted', 'content_submitted', 'design_submitted', 'development_submitted'].includes(status)) {
      await notifyTesterForReview(task, req.organizationId);
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Tester review - approve or reject
// @route   PUT /api/tasks/:taskId/tester-review
// @access  Private (Tester only)
exports.testerReview = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { approved, rejectionNote, rejectionReason } = req.body;

    // Verify user is a tester or admin
    if (req.user.role !== 'tester' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only testers or admins can perform this action'
      });
    }

    const task = await Task.findById(taskId)
      .populate('projectId', 'projectName businessName organizationId')
      .populate('assignedTo', 'name email');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Ensure organizationId is set (fix for tasks created before multi-tenant migration)
    if (!task.organizationId && task.projectId?.organizationId) {
      task.organizationId = task.projectId.organizationId;
    }

    // Check if task can be reviewed by tester
    if (!task.canBeReviewedByTester()) {
      return res.status(400).json({
        success: false,
        message: 'This task cannot be reviewed by tester in its current status'
      });
    }

    let newStatus;
    let notificationType;
    let notificationMessage;

    if (approved) {
      // Determine next status based on task type and current status
      if (task.status === 'content_submitted') {
        // Content approved by tester - goes to marketer for final approval
        // After marketer approves, the content will be finalized and design can start
        newStatus = 'content_approved';
        task.assignedRole = 'performance_marketer';
        // Assign to specific marketer if available
        if (task.marketerId) {
          task.assignedTo = task.marketerId;
        }
        notificationMessage = `Your content for "${task.taskTitle}" has been approved by the tester and is awaiting final marketer review.`;
        notificationType = 'task_approved_by_tester';
      } else if (task.taskType === 'landing_page_design' || task.status === 'design_submitted') {
        // Design approved by tester - goes to marketer for final approval
        newStatus = 'design_approved';
        task.assignedRole = 'performance_marketer';
        // Assign to specific marketer if available
        if (task.marketerId) {
          task.assignedTo = task.marketerId;
        }
        notificationMessage = `Your design for "${task.projectId?.projectName || task.projectId?.businessName || 'the project'}" has been approved by the tester and is awaiting marketer review.`;
        notificationType = 'task_approved_by_tester';
      } else if (task.taskType === 'landing_page_development' || task.status === 'development_submitted') {
        // Development approved by tester - goes to marketer for final approval
        newStatus = 'development_approved';
        task.assignedRole = 'performance_marketer';
        // Assign to specific marketer if available
        if (task.marketerId) {
          task.assignedTo = task.marketerId;
        }
        notificationMessage = `Your development work for "${task.projectId?.projectName || task.projectId?.businessName || 'the project'}" has been approved by the tester and is awaiting marketer review.`;
        notificationType = 'task_approved_by_tester';
      } else {
        // Legacy workflow
        newStatus = 'approved_by_tester';
        task.assignedRole = 'performance_marketer';
        if (task.marketerId) {
          task.assignedTo = task.marketerId;
        }
        notificationMessage = `Your task "${task.taskTitle}" has been approved by the tester and is now awaiting marketer review.`;
        notificationType = 'task_approved_by_tester';
      }
    } else {
      // Rejected - determine the rejection status and reassign to appropriate role
      // Need to get project team to find the correct team member
      const project = await Project.findOne({
        _id: task.projectId._id || task.projectId,
        organizationId: req.organizationId
      })
        .populate('assignedTeam.contentWriters', '_id name')
        .populate('assignedTeam.graphicDesigners', '_id name')
        .populate('assignedTeam.videoEditors', '_id name')
        .populate('assignedTeam.uiUxDesigners', '_id name')
        .populate('assignedTeam.developers', '_id name')
        .populate('assignedTeam.contentWriter', '_id name')
        .populate('assignedTeam.graphicDesigner', '_id name')
        .populate('assignedTeam.videoEditor', '_id name')
        .populate('assignedTeam.uiUxDesigner', '_id name')
        .populate('assignedTeam.developer', '_id name');

      if (task.status === 'content_submitted') {
        // Content rejected - assign back to the ORIGINAL Content Planner who submitted
        newStatus = 'content_rejected';
        task.assignedRole = 'content_writer';

        // IMPORTANT: Assign back to the original submitter, not a random team member
        if (task.originalAssignedTo) {
          task.assignedTo = task.originalAssignedTo;
        } else {
          // Fallback: Find the Content Planner from project team
          const contentWriter = project?.assignedTeam?.contentWriters?.[0] ||
                                project?.assignedTeam?.contentWriter;
          if (contentWriter) {
            task.assignedTo = contentWriter._id || contentWriter;
          }
        }

      } else if (task.status === 'design_submitted') {
        // Design rejected - assign back to the ORIGINAL designer who submitted
        newStatus = 'design_rejected';

        // IMPORTANT: Assign back to the original submitter
        if (task.originalAssignedTo) {
          task.assignedTo = task.originalAssignedTo;
          // Set the correct role based on task type
          if (task.taskType === 'landing_page_design') {
            task.assignedRole = 'ui_ux_designer';
          } else {
            // Determine if it's video or graphic based on task type
            const videoTypes = ['video_creative', 'ugc_content', 'testimonial_content', 'demo_video', 'reel'];
            const isVideoTask = task.creativeOutputType && videoTypes.includes(task.creativeOutputType);
            task.assignedRole = (isVideoTask || task.taskType === 'video_editing') ? 'video_editor' : 'graphic_designer';
          }
        } else {
          // Fallback: Find appropriate designer from project team
          let designer = null;
          if (task.taskType === 'landing_page_design') {
            task.assignedRole = 'ui_ux_designer';
            designer = project?.assignedTeam?.uiUxDesigners?.[0] ||
                       project?.assignedTeam?.uiUxDesigner;
          } else {
            const videoTypes = ['video_creative', 'ugc_content', 'testimonial_content', 'demo_video', 'reel'];
            const isVideoTask = task.creativeOutputType && videoTypes.includes(task.creativeOutputType);

            if (isVideoTask || task.taskType === 'video_editing') {
              task.assignedRole = 'video_editor';
              designer = project?.assignedTeam?.videoEditors?.[0] ||
                         project?.assignedTeam?.videoEditor;
            } else {
              task.assignedRole = 'graphic_designer';
              designer = project?.assignedTeam?.graphicDesigners?.[0] ||
                         project?.assignedTeam?.graphicDesigner;
            }
          }

          if (designer) {
            task.assignedTo = designer._id || designer;
          }
        }

      } else if (task.status === 'development_submitted') {
        // Development rejected - assign back to the ORIGINAL developer who submitted
        newStatus = 'development_pending';
        task.assignedRole = 'developer';

        // IMPORTANT: Assign back to the original submitter
        if (task.originalAssignedTo) {
          task.assignedTo = task.originalAssignedTo;
        } else {
          // Fallback: Use developerId if stored, otherwise get from project team
          let developer = task.developerId;
          if (!developer) {
            developer = project?.assignedTeam?.developers?.[0] ||
                        project?.assignedTeam?.developer;
          }
          if (developer) {
            task.assignedTo = developer._id || developer;
          }
        }

      } else {
        // Legacy rejection
        newStatus = 'rejected';
        task.assignedRole = Task.getRoleForTaskType(task.taskType);
        // Also assign back to original submitter for legacy tasks
        if (task.originalAssignedTo) {
          task.assignedTo = task.originalAssignedTo;
        }
      }

      notificationType = 'task_rejected';
      notificationMessage = `Your task "${task.taskTitle}" has been rejected. Please review the feedback and resubmit.`;
    }

    task.status = newStatus;
    task.testerReviewedBy = req.user._id;
    task.testerReviewedAt = new Date();

    if (!approved) {
      task.rejectionNote = rejectionNote;
      task.rejectionReason = rejectionReason;
    }

    task.addRevision(req.user._id, approved ? 'Approved by tester' : `Rejected: ${rejectionNote}`, task.status, newStatus);

    // Add progress history entry for tester review
    const testerAction = approved ? 'approved' : 'rejected';
    const testerNotes = approved
      ? `Approved by tester ${req.user.name || 'Tester'}`
      : `Rejected by tester: ${rejectionReason || 'No reason provided'} - ${rejectionNote || ''}`;
    addProgressEntry(task, req.user._id, req.user.role, testerAction, testerNotes);

    await task.save();

    // Create rejection record if rejected
    if (!approved && task.originalAssignedTo) {
      try {
        await RejectionService.createRejection({
          taskId: task._id,
          organizationId: task.organizationId || req.organizationId,
          projectId: task.projectId?._id || task.projectId,
          rejectedUserId: task.originalAssignedTo._id || task.originalAssignedTo,
          rejectedByUserId: req.user._id,
          rejectionReason: rejectionReason || 'other',
          rejectionNote: rejectionNote || '',
          rejectedByRole: 'tester'
        });
      } catch (rejectionError) {
        console.error('Failed to create rejection record:', rejectionError);
        // Don't fail the rejection if logging fails
      }
    }

    // Notify assigned user
    if (task.assignedTo) {
      await Notification.create({
        recipient: task.assignedTo._id || task.assignedTo,
        type: notificationType,
        title: approved ? 'Task Approved by Tester' : 'Task Rejected',
        message: notificationMessage,
        projectId: task.projectId?._id || task.projectId,
        organizationId: req.organizationId
      });

      // Send email notification for:
      // 1. Rejections (task reassigned back to someone)
      // 2. Marketer final approval assignments (design_approved, development_approved)
      const isMarketerAssignment = approved && (newStatus === 'design_approved' || newStatus === 'development_approved');

      if (!approved) {
        // Rejection email
        const assignedUser = await User.findById(task.assignedTo._id || task.assignedTo).select('name email');
        if (assignedUser) {
          const rejectionContext = {
            isRejection: true,
            rejectionReason: task.rejectionReason,
            rejectionNote: task.rejectionNote,
            rejectedBy: req.user
          };
          emailService.sendTaskAssignmentNotification(
            task,
            task.projectId,
            assignedUser,
            { name: 'System' },
            rejectionContext
          ).catch(err => console.error('Failed to send task notification email:', err));
        }
      } else if (isMarketerAssignment) {
        // Marketer final approval assignment email
        // Get the marketer - either from marketerId or from project team
        let marketerId = task.marketerId;

        // If marketerId is not set, get marketer from project team
        if (!marketerId) {
          const project = await Project.findOne({
            _id: task.projectId._id || task.projectId,
            organizationId: req.organizationId
          }).populate('assignedTeam.performanceMarketers', '_id name email')
            .populate('assignedTeam.performanceMarketer', '_id name email');

          const marketer = project?.assignedTeam?.performanceMarketers?.[0] ||
                          project?.assignedTeam?.performanceMarketer;
          if (marketer) {
            marketerId = marketer._id || marketer;
            task.assignedTo = marketerId;
            await task.save();
          }
        }

        if (marketerId) {
          const assignedUser = await User.findById(marketerId).select('name email');
          if (assignedUser) {
            emailService.sendTaskAssignmentNotification(
              task,
              task.projectId,
              assignedUser,
              { name: 'System' }
            ).catch(err => console.error('Failed to send marketer notification email:', err));
          }
        }
      }
    }

    // If content is finalized, find the paired design task and copy the approved content
    // Note: Content goes directly to designer after tester approval, NOT to marketer
    // Marketer will only be notified after design/video approval
    if (approved && newStatus === 'content_final_approved') {
      try {
        // Content is finalized - find the paired design task and copy the approved content
        console.log('\n========== CONTENT APPROVAL - COPYING TO DESIGN TASK ==========');
        console.log('Content task ID:', task._id);
        console.log('Content task type:', task.taskType);
        console.log('Content task creativeOutputType:', task.creativeOutputType);
        console.log('Content task adTypeKey:', task.adTypeKey);
        console.log('Content task creativeStrategyId:', task.creativeStrategyId);
        console.log('Content task projectId:', task.projectId?._id || task.projectId);

        // Log content fields from the content task
        console.log('\n--- Content Task Fields ---');
        console.log('contentLink:', task.contentLink || '(none)');
        console.log('contentFile:', task.contentFile ? JSON.stringify(task.contentFile) : '(none)');
        console.log('contentNotes:', task.contentNotes ? `"${task.contentNotes?.substring(0, 50) || ''}..."` : '(none)');
        console.log('contentOutput:', task.contentOutput ? JSON.stringify({
          headline: task.contentOutput.headline || '(none)',
          bodyText: task.contentOutput.bodyText ? '(present)' : '(none)',
          cta: task.contentOutput.cta || '(none)',
          script: task.contentOutput.script ? '(present)' : '(none)'
        }) : '(empty)');

        // Find the paired design task based on creativeStrategyId and adTypeKey/creativeOutputType
        const videoTypes = ['video_creative', 'ugc_content', 'testimonial_content', 'demo_video', 'reel'];
        const isVideoTask = task.creativeOutputType && videoTypes.includes(task.creativeOutputType);
        const designTaskType = isVideoTask ? 'video_editing' : 'graphic_design';

        console.log('\n--- Design Task Search ---');
        console.log('Is video task:', isVideoTask);
        console.log('Design task type to find:', designTaskType);

        const projectId = task.projectId._id || task.projectId;
        let designTask = null;

        // First, try to find design task by parentTaskId pointing to this content task
        // This is the primary way to link content task to design task
        console.log('\nStrategy 1: Search by parentTaskId...');
        designTask = await Task.findOne({
          projectId: projectId,
          taskType: designTaskType,
          parentTaskId: task._id
        });
        console.log('Result:', designTask ? `Found design task ${designTask._id}` : 'Not found');

        // If not found by parentTaskId, try to find by creativeStrategyId and adTypeKey
        // Remove status requirement - design task might be in any status
        if (!designTask && task.creativeStrategyId) {
          console.log('\nStrategy 2: Search by creativeStrategyId and adTypeKey...');
          const query = {
            projectId: projectId,
            taskType: designTaskType,
            creativeStrategyId: task.creativeStrategyId
          };
          if (task.adTypeKey) {
            query.adTypeKey = task.adTypeKey;
          }
          console.log('Query:', JSON.stringify(query));
          designTask = await Task.findOne(query);
          console.log('Result:', designTask ? `Found design task ${designTask._id}` : 'Not found');
        }

        // If still not found, try to find by matching creativeOutputType
        if (!designTask) {
          console.log('\nStrategy 3: Search by creativeOutputType...');
          const query = {
            projectId: projectId,
            taskType: designTaskType,
            creativeOutputType: task.creativeOutputType
          };
          console.log('Query:', JSON.stringify(query));
          designTask = await Task.findOne(query);
          console.log('Result:', designTask ? `Found design task ${designTask._id}` : 'Not found');
        }

        // Last resort: find by assetType match
        if (!designTask && task.assetType) {
          console.log('\nStrategy 4: Search by assetType...');
          const query = {
            projectId: projectId,
            taskType: designTaskType
          };
          if (isVideoTask) {
            query.assetType = { $in: ['video_creative', 'video_creative_content', 'ugc_content', 'testimonial_content', 'demo_video'] };
          } else {
            query.assetType = { $in: ['image_creative', 'carousel_creative', 'image_creative_content', 'carousel_creative_content'] };
          }
          console.log('Query:', JSON.stringify(query));
          designTask = await Task.findOne(query);
          console.log('Result:', designTask ? `Found design task ${designTask._id}` : 'Not found');
        }

        // Final fallback: just find any design task of the right type for this project
        if (!designTask) {
          console.log('\nStrategy 5: Final fallback - find any design task of this type...');
          const query = {
            projectId: projectId,
            taskType: designTaskType
          };
          console.log('Query:', JSON.stringify(query));
          designTask = await Task.findOne(query);
          console.log('Result:', designTask ? `Found design task ${designTask._id}` : 'Not found');
        }

        if (designTask) {
          // Copy the approved content to the design task
          console.log('\n--- Copying Content to Design Task ---');
          console.log('Design task ID:', designTask._id);
          console.log('Design task title:', designTask.taskTitle);
          console.log('Design task status:', designTask.status);
          console.log('Design task assignedTo:', designTask.assignedTo?._id || designTask.assignedTo || '(none)');

          // Log what we're about to copy
          console.log('Content to copy:');
          console.log('  - contentLink:', task.contentLink || '(empty)');
          console.log('  - contentFile:', task.contentFile ? JSON.stringify(task.contentFile) : '(empty)');
          console.log('  - contentNotes:', task.contentNotes ? `"${task.contentNotes?.substring(0, 100) || ''}..."` : '(empty)');
          console.log('  - contentOutput:', task.contentOutput ? JSON.stringify({
            headline: task.contentOutput.headline || '(none)',
            bodyText: task.contentOutput.bodyText ? '(present)' : '(none)',
            cta: task.contentOutput.cta || '(none)',
            script: task.contentOutput.script ? '(present)' : '(none)'
          }) : '(empty)');

          // Copy the content fields
          designTask.contentLink = task.contentLink || null;
          designTask.contentFile = task.contentFile || null;
          designTask.contentNotes = task.contentNotes || null;
          designTask.contentOutput = task.contentOutput || null;

          // Also copy strategy context for reference
          if (task.strategyContext) {
            designTask.strategyContext = {
              ...designTask.strategyContext,
              // Preserve design-specific context but add content info
              approvedContentLink: task.contentLink,
              approvedContentNotes: task.contentNotes
            };
          }

          // Determine which role should receive the design task based on creativeOutputType
          const videoTypes = ['video_creative', 'ugc_content', 'testimonial_content', 'demo_video', 'reel'];
          const isVideoTask = task.creativeOutputType && videoTypes.includes(task.creativeOutputType);

          // Set the assigned role
          if (isVideoTask) {
            designTask.assignedRole = 'video_editor';
          } else {
            designTask.assignedRole = 'graphic_designer';
          }

          // Find the assigned designer/video editor
          // First check if designerId was stored during task creation
          let assignedMember = null;
          if (designTask.designerId) {
            assignedMember = designTask.designerId;
            console.log('✓ Using stored designerId from task creation:', assignedMember);
          }

          // If no designerId, get from project team
          if (!assignedMember) {
            const project = await Project.findOne({
              _id: task.projectId._id || task.projectId,
              organizationId: req.organizationId
            })
              .populate('assignedTeam.graphicDesigners', '_id name')
              .populate('assignedTeam.videoEditors', '_id name')
              .populate('assignedTeam.graphicDesigner', '_id name')
              .populate('assignedTeam.videoEditor', '_id name');

            if (isVideoTask) {
              assignedMember = project?.assignedTeam?.videoEditors?.[0] || project?.assignedTeam?.videoEditor;
            } else {
              assignedMember = project?.assignedTeam?.graphicDesigners?.[0] || project?.assignedTeam?.graphicDesigner;
            }
            console.log('Getting designer from project team:', assignedMember?._id || assignedMember);
          }

          // Assign the designer to the design task
          if (assignedMember) {
            designTask.assignedTo = assignedMember._id || assignedMember;
            console.log('✓ Assigned designer/editor to design task:', assignedMember.name || assignedMember._id || assignedMember);
          } else {
            console.log('⚠ WARNING: No designer/video editor assigned to project');
          }

          // Update design task status to design_pending if it was waiting for content
          if (designTask.status === 'todo' || !designTask.status) {
            designTask.status = 'design_pending';
          }

          // Update description to reflect that content is now approved
          const creativeName = designTask.creativeName || task.creativeName || 'creative assets';
          if (isVideoTask) {
            designTask.description = `Create video content for ${creativeName} based on the approved content and creative brief.`;
          } else {
            designTask.description = `Design ${creativeName} based on the approved content and creative brief.`;
          }

          await designTask.save();
          console.log('✓ Successfully saved design task with copied content and assignment');

          // Verify the save worked
          const verifyTask = await Task.findById(designTask._id);
          console.log('Verification - design task contentLink:', verifyTask.contentLink || '(empty)');
          console.log('Verification - design task contentFile:', verifyTask.contentFile ? '(present)' : '(empty)');
          console.log('Verification - design task contentNotes:', verifyTask.contentNotes ? '(present)' : '(empty)');
          console.log('Verification - design task assignedTo:', verifyTask.assignedTo?._id || verifyTask.assignedTo || '(none)');

          // Notify the assigned designer/editor
          if (designTask.assignedTo) {
            await Notification.create({
              recipient: designTask.assignedTo._id || designTask.assignedTo,
              type: 'content_approved',
              title: 'Approved Content Ready',
              message: `The content for "${task.taskTitle}" has been approved and is ready for ${isVideoTask ? 'video editing' : 'design'}. You can now view the approved content.`,
              projectId: task.projectId._id || task.projectId,
              organizationId: req.organizationId
            });
            console.log('✓ Notification sent to assigned designer/editor');

            // Send email notification to graphic designer/video editor
            const assignedDesigner = await User.findById(designTask.assignedTo._id || designTask.assignedTo).select('name email');
            if (assignedDesigner) {
              emailService.sendTaskAssignmentNotification(
                designTask,
                task.projectId,
                assignedDesigner,
                { name: 'System' }
              ).catch(err => console.error('Failed to send designer/editor notification email:', err));
            }
          }
        } else {
          console.log('\n⚠ WARNING: No paired design task found for content task');
          console.log('This means the approved content will NOT be available to the designer/editor.');
          console.log('Content task:', task._id);
          console.log('creativeOutputType:', task.creativeOutputType);
          console.log('adTypeKey:', task.adTypeKey);
          console.log('projectId:', projectId);
          console.log('creativeStrategyId:', task.creativeStrategyId);

          // List all design tasks for this project for debugging
          const allDesignTasks = await Task.find({
            projectId: projectId,
            taskType: { $in: ['graphic_design', 'video_editing'] }
          }).select('_id taskType taskTitle status creativeOutputType adTypeKey creativeStrategyId parentTaskId');

          console.log('\nAll design tasks for this project:');
          allDesignTasks.forEach(dt => {
            console.log(`  - ${dt._id}: ${dt.taskType} "${dt.taskTitle}" status=${dt.status} creativeOutputType=${dt.creativeOutputType} adTypeKey=${dt.adTypeKey} parentTaskId=${dt.parentTaskId || '(none)'}`);
          });
        }
        console.log('========== END CONTENT APPROVAL ==========\n');
      } catch (contentCopyError) {
        console.error('❌ ERROR copying content to design task:', contentCopyError);
        // Don't throw - the approval should still succeed even if content copy fails
        // The migration script can fix this later
      }
    }

    // Note: Developer is NOT notified at Tester approval.
    // Developer will be notified when Performance Marketer does final approval.
    // This happens in marketerReview function for landing_page_design tasks.

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Performance Marketer review - approve or reject
// @route   PUT /api/tasks/:taskId/marketer-review
// @access  Private (Performance Marketer or Admin)
exports.marketerReview = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { approved, rejectionNote, rejectionReason } = req.body;

    // Verify user is a performance marketer or admin
    if (req.user.role !== 'performance_marketer' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only performance marketers or admins can perform this action'
      });
    }

    const task = await Task.findById(taskId)
      .populate('projectId', 'projectName businessName organizationId')
      .populate('assignedTo', 'name email');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Ensure organizationId is set (fix for tasks created before multi-tenant migration)
    if (!task.organizationId && task.projectId?.organizationId) {
      task.organizationId = task.projectId.organizationId;
    }

    // Check if task can be reviewed by marketer
    if (!task.canBeApprovedByMarketer()) {
      return res.status(400).json({
        success: false,
        message: 'This task must be approved by tester first before marketer review'
      });
    }

    let newStatus;
    let notificationType;
    let notificationMessage;

    if (approved) {
      // Determine next status based on current status and task type
      if (task.status === 'content_approved') {
        // Content approved by marketer - content is finalized, design can start
        // The content task is complete, and the paired design task should be activated
        newStatus = 'content_final_approved';
        // Keep content task assigned to content_writer for history
        notificationMessage = `Your content for "${task.taskTitle}" has been fully approved by the marketer and is ready for design.`;
        notificationType = 'content_final_approved';
      } else if (task.status === 'design_approved') {
        // Design approved - check task type for next step
        if (task.taskType === 'landing_page_design') {
          // Landing page design approved - move to development phase
          newStatus = 'development_pending';
          task.assignedRole = 'developer';
          notificationMessage = `Your design for "${task.taskTitle}" has been approved by the marketer. It's now ready for development.`;
          notificationType = 'design_approved_for_development';
        } else {
          // Creative design approved - task complete
          newStatus = 'final_approved';
          notificationMessage = `Your design for "${task.taskTitle}" has been fully approved and is ready for deployment.`;
          notificationType = 'task_approved_by_marketer';
        }
      } else if (task.status === 'development_approved') {
        // Landing page development approved - task complete
        newStatus = 'final_approved';
        notificationMessage = `Your development work for "${task.taskTitle}" has been fully approved and is ready for deployment.`;
        notificationType = 'task_approved_by_marketer';
      } else {
        // Legacy workflow - final approval
        newStatus = 'final_approved';
        notificationMessage = `Your task "${task.taskTitle}" has been fully approved and is ready for deployment.`;
        notificationType = 'task_approved_by_marketer';
      }
    } else {
      // Rejected - determine rejection status based on task type and status
      // Need to get project team to find the correct team member
      const project = await Project.findOne({
        _id: task.projectId._id || task.projectId,
        organizationId: req.organizationId
      })
        .populate('assignedTeam.contentWriters', '_id name')
        .populate('assignedTeam.graphicDesigners', '_id name')
        .populate('assignedTeam.videoEditors', '_id name')
        .populate('assignedTeam.uiUxDesigners', '_id name')
        .populate('assignedTeam.developers', '_id name')
        .populate('assignedTeam.contentWriter', '_id name')
        .populate('assignedTeam.graphicDesigner', '_id name')
        .populate('assignedTeam.videoEditor', '_id name')
        .populate('assignedTeam.uiUxDesigner', '_id name')
        .populate('assignedTeam.developer', '_id name');

      if (task.status === 'content_approved') {
        // Content rejected by marketer - assign back to the ORIGINAL content writer who submitted
        newStatus = 'content_rejected';
        task.assignedRole = 'content_writer';

        // IMPORTANT: Assign back to the original submitter, not a random team member
        if (task.originalAssignedTo) {
          task.assignedTo = task.originalAssignedTo;
        } else {
          // Fallback: Find the Content Planner from project team
          const contentWriter = project?.assignedTeam?.contentWriters?.[0] ||
                                project?.assignedTeam?.contentWriter;
          if (contentWriter) {
            task.assignedTo = contentWriter._id || contentWriter;
          }
        }

      } else if (task.status === 'design_approved') {
        // Design rejected by marketer - assign back to the ORIGINAL designer who submitted
        newStatus = 'design_rejected';

        // IMPORTANT: Assign back to the original submitter, not a random team member
        if (task.originalAssignedTo) {
          task.assignedTo = task.originalAssignedTo;
          // Set the correct role based on task type
          if (task.taskType === 'landing_page_design') {
            task.assignedRole = 'ui_ux_designer';
          } else {
            const videoTypes = ['video_creative', 'ugc_content', 'testimonial_content', 'demo_video', 'reel'];
            const isVideoTask = task.creativeOutputType && videoTypes.includes(task.creativeOutputType);
            task.assignedRole = (isVideoTask || task.taskType === 'video_editing') ? 'video_editor' : 'graphic_designer';
          }
        } else {
          // Fallback: Find appropriate designer from project team
          let designer = null;
          if (task.taskType === 'landing_page_design') {
            task.assignedRole = 'ui_ux_designer';
            designer = project?.assignedTeam?.uiUxDesigners?.[0] ||
                       project?.assignedTeam?.uiUxDesigner;
          } else {
            const videoTypes = ['video_creative', 'ugc_content', 'testimonial_content', 'demo_video', 'reel'];
            const isVideoTask = task.creativeOutputType && videoTypes.includes(task.creativeOutputType);

            if (isVideoTask || task.taskType === 'video_editing') {
              task.assignedRole = 'video_editor';
              designer = project?.assignedTeam?.videoEditors?.[0] ||
                         project?.assignedTeam?.videoEditor;
            } else {
              task.assignedRole = 'graphic_designer';
              designer = project?.assignedTeam?.graphicDesigners?.[0] ||
                         project?.assignedTeam?.graphicDesigner;
            }
          }

          if (designer) {
            task.assignedTo = designer._id || designer;
          }
        }

      } else if (task.status === 'development_approved') {
        // Development rejected by marketer - assign back to the ORIGINAL developer who submitted
        newStatus = 'development_pending';
        task.assignedRole = 'developer';

        // IMPORTANT: Assign back to the original submitter
        if (task.originalAssignedTo) {
          task.assignedTo = task.originalAssignedTo;
        } else {
          // Fallback: Use developerId if stored, otherwise get from project team
          let developer = task.developerId;
          if (!developer) {
            developer = project?.assignedTeam?.developers?.[0] ||
                        project?.assignedTeam?.developer;
          }
          if (developer) {
            task.assignedTo = developer._id || developer;
          }
        }

      } else {
        // Legacy rejection
        newStatus = 'rejected';
        task.assignedRole = Task.getRoleForTaskType(task.taskType);
        // Also assign back to original submitter for legacy tasks
        if (task.originalAssignedTo) {
          task.assignedTo = task.originalAssignedTo;
        }
      }

      notificationType = 'task_rejected';
      notificationMessage = `Your task "${task.taskTitle}" has been rejected by the performance marketer. Please review the feedback and resubmit.`;
    }

    task.status = newStatus;
    task.marketerApprovedBy = approved ? req.user._id : null;
    task.marketerApprovedAt = approved ? new Date() : null;

    if (!approved) {
      task.rejectionNote = rejectionNote;
      task.rejectionReason = rejectionReason;
    }

    task.addRevision(req.user._id, approved ? 'Approved by marketer' : `Rejected: ${rejectionNote}`, task.status, newStatus);

    // Add progress history entry for marketer review
    const marketerAction = approved ? 'completed' : 'rejected';
    const marketerNotes = approved
      ? `Final approval by performance marketer ${req.user.name || 'Marketer'}`
      : `Rejected by performance marketer: ${rejectionReason || 'No reason provided'} - ${rejectionNote || ''}`;
    addProgressEntry(task, req.user._id, req.user.role, marketerAction, marketerNotes);

    await task.save();

    // Create rejection record if rejected
    if (!approved && task.originalAssignedTo) {
      try {
        await RejectionService.createRejection({
          taskId: task._id,
          organizationId: task.organizationId || req.organizationId,
          projectId: task.projectId?._id || task.projectId,
          rejectedUserId: task.originalAssignedTo._id || task.originalAssignedTo,
          rejectedByUserId: req.user._id,
          rejectionReason: rejectionReason || 'other',
          rejectionNote: rejectionNote || '',
          rejectedByRole: 'performance_marketer'
        });
      } catch (rejectionError) {
        console.error('Failed to create rejection record:', rejectionError);
        // Don't fail the rejection if logging fails
      }
    }

    // If landing page development is approved, mark the landingPage stage as completed
    if (approved && newStatus === 'final_approved' && task.taskType === 'landing_page_development') {
      try {
        const project = await Project.findOne({
          _id: task.projectId._id || task.projectId,
          organizationId: req.organizationId
        });

        if (project && !project.stages.landingPage.isCompleted) {
          project.stages.landingPage.isCompleted = true;
          project.stages.landingPage.completedAt = new Date();
          await project.save();
          console.log(`Landing page stage marked complete for project ${project.projectName || project.businessName}`);
        }
      } catch (error) {
        console.error('Error marking landingPage stage as complete:', error);
        // Don't fail the approval if stage update fails
      }
    }

    // Notify assigned user
    if (task.assignedTo) {
      await Notification.create({
        recipient: task.assignedTo._id || task.assignedTo,
        type: notificationType,
        title: approved ? (task.status === 'content_final_approved' ? 'Content Approved - Ready for Design' : 'Task Fully Approved') : 'Task Rejected',
        message: notificationMessage,
        projectId: task.projectId?._id || task.projectId,
        organizationId: req.organizationId
      });

      // Send email notification for rejections
      if (!approved) {
        const assignedUser = await User.findById(task.assignedTo._id || task.assignedTo).select('name email');
        if (assignedUser) {
          const rejectionContext = {
            isRejection: true,
            rejectionReason: task.rejectionReason,
            rejectionNote: task.rejectionNote,
            rejectedBy: req.user
          };
          emailService.sendTaskAssignmentNotification(
            task,
            task.projectId,
            assignedUser,
            { name: 'System' },
            rejectionContext
          ).catch(err => console.error('Failed to send rejection notification email:', err));
        }
      }
    }

    // If content is approved, find paired design task and notify the correct designer/editor
    if (approved && newStatus === 'content_final_approved') {
      if (!task.projectId) {
        console.warn('Task missing projectId during content final approval');
      } else {
        const project = await Project.findOne({
          _id: task.projectId._id || task.projectId,
          organizationId: req.organizationId
        })
          .populate('assignedTeam.graphicDesigners', '_id name')
          .populate('assignedTeam.videoEditors', '_id name')
          .populate('assignedTeam.graphicDesigner', '_id name')
          .populate('assignedTeam.videoEditor', '_id name');

        // Determine which role should receive the design task based on creativeOutputType
        const videoTypes = ['video_creative', 'ugc_content', 'testimonial_content', 'demo_video', 'reel'];
        const isVideoTask = task.creativeOutputType && videoTypes.includes(task.creativeOutputType);
        const targetRole = isVideoTask ? 'video_editor' : 'graphic_designer';

        // Get team member from project (try array fields first, then legacy fields)
        let targetTeamMember = null;
        if (isVideoTask) {
          targetTeamMember = project?.assignedTeam?.videoEditors?.[0] || project?.assignedTeam?.videoEditor;
        } else {
          targetTeamMember = project?.assignedTeam?.graphicDesigners?.[0] || project?.assignedTeam?.graphicDesigner;
        }

        // Find the paired design task based on creativeId, adTypeKey, or task title matching
        let designTaskQuery = {
          projectId: task.projectId._id || task.projectId,
          taskType: isVideoTask ? 'video_editing' : 'graphic_design',
          status: 'design_pending'
        };

        // Try to find by creativeStrategyId and adTypeKey if available
        if (task.creativeStrategyId && task.adTypeKey) {
          designTaskQuery.creativeStrategyId = task.creativeStrategyId;
          designTaskQuery.adTypeKey = task.adTypeKey;
        } else if (task.creativeStrategyId) {
          designTaskQuery.creativeStrategyId = task.creativeStrategyId;
          // Find matching design task by creativeOutputType or asset type
          if (isVideoTask) {
            designTaskQuery.assetType = { $in: ['video_creative', 'ugc_content', 'testimonial_content', 'demo_video'] };
          } else {
            designTaskQuery.assetType = { $in: ['image_creative', 'carousel_creative', 'offer_creative'] };
          }
        }

        const designTask = await Task.findOne(designTaskQuery);

        if (designTask && targetTeamMember) {
          // Update design task status and assignment
          designTask.assignedTo = targetTeamMember._id || targetTeamMember;
          designTask.assignedRole = targetRole;
          await designTask.save();

          // Notify the designer/editor
          await Notification.create({
            recipient: targetTeamMember._id || targetTeamMember,
            type: 'task_assigned',
            title: 'New Design Task Ready',
            message: `Content for "${task.taskTitle}" is approved and ready for ${isVideoTask ? 'video editing' : 'design'}.`,
            projectId: task.projectId._id || task.projectId,
            organizationId: req.organizationId
          });

          // Send email notification (async, don't block)
          const designerUser = await User.findById(targetTeamMember._id || targetTeamMember).select('name email');
          if (designerUser) {
            emailService.sendTaskAssignmentNotification(
              designTask,
              task.projectId,
              designerUser,
              { name: 'System' }
            ).catch(err => console.error('Failed to send design task assignment email:', err));
          }
        } else if (targetTeamMember) {
          // No matching design task found, but still notify the designer
          await Notification.create({
            recipient: targetTeamMember._id || targetTeamMember,
            type: 'task_assigned',
            title: 'New Design Task',
            message: `Content for "${task.projectId?.projectName || task.projectId?.businessName || 'a project'}" is approved and ready for ${isVideoTask ? 'video editing' : 'design'}.`,
            projectId: task.projectId._id || task.projectId,
            organizationId: req.organizationId
          });

          // Send email notification (async, don't block)
          const designerUser = await User.findById(targetTeamMember._id || targetTeamMember).select('name email');
          if (designerUser) {
            emailService.sendTaskAssignmentNotification(
              { taskTitle: `${isVideoTask ? 'Video Editing' : 'Design'} Task`, taskType: isVideoTask ? 'video_editing' : 'graphic_design' },
              task.projectId,
              designerUser,
              { name: 'System' }
            ).catch(err => console.error('Failed to send design task assignment email:', err));
          }
        }
      }
    }

    // If landing page design is approved by marketer, notify ALL developers
    // FIX: Previously only ONE development task was found, but multiple developers may have tasks
    if (approved && newStatus === 'development_pending' && task.taskType === 'landing_page_design') {
      if (!task.projectId) {
        console.warn('Task missing projectId during landing page design approval');
      } else {
        const project = await Project.findOne({
          _id: task.projectId._id || task.projectId,
          organizationId: req.organizationId
        })
          .populate('assignedTeam.developers', '_id name')
          .populate('assignedTeam.developer', '_id name');

        // Find ALL development tasks for this landing page (one per assigned developer)
        const developmentTasks = await Task.find({
          projectId: task.projectId._id || task.projectId,
          landingPageId: task.landingPageId,
          taskType: 'landing_page_development'
        });

        console.log(`Found ${developmentTasks.length} development task(s) for landing page ${task.landingPageId}`);

        // Activate each development task and notify each developer
        for (const developmentTask of developmentTasks) {
          // Copy design details to development task
          developmentTask.designLink = task.designLink;
          developmentTask.designFile = task.designFile;
          developmentTask.designNotes = task.designNotes;

          // Copy designer's AI prompt and brand overrides for developer reference
          if (task.aiPrompt) {
            developmentTask.designerPrompt = task.aiPrompt;
          }
          if (task.designerBrandOverrides) {
            developmentTask.designerBrandOverrides = task.designerBrandOverrides;
          }

          // Update description to reflect that design is now approved
          developmentTask.description = `Develop the landing page for ${task.projectId?.projectName || task.projectId?.businessName || 'the project'} based on the approved design.`;

          // Get developer - first check developerId (stored during task creation), then project team
          let developerId = developmentTask.developerId;

          if (!developerId && project?.assignedTeam?.developers?.length > 0) {
            developerId = project.assignedTeam.developers[0]._id;
          } else if (!developerId && project?.assignedTeam?.developer) {
            developerId = project.assignedTeam.developer._id;
          }

          // Assign developer to the task now that design is approved
          if (developerId) {
            developmentTask.assignedTo = developerId;
            console.log(`Assigning developer ${developerId} to development task ${developmentTask._id}`);
          }

          await developmentTask.save();

          // Notify the developer that the task is ready
          if (developerId) {
            await Notification.create({
              recipient: developerId,
              type: 'task_assigned',
              title: 'Landing Page Ready for Development',
              message: `The design for "${task.projectId?.projectName || task.projectId?.businessName || 'a project'}" has been approved and is ready for development.`,
              projectId: task.projectId._id || task.projectId,
              organizationId: req.organizationId
            });

            // Send email notification (async, don't block)
            const developerUser = await User.findById(developerId).select('name email');
            if (developerUser) {
              emailService.sendTaskAssignmentNotification(
                developmentTask,
                task.projectId,
                developerUser,
                { name: 'System' }
              ).catch(err => console.error('Failed to send developer task assignment email:', err));
            }
          }
        }

        console.log(`Activated ${developmentTasks.length} development task(s) for landing page`);
      }
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign task to a user
// @route   PUT /api/tasks/:taskId/assign
// @access  Private (Admin or Performance Marketer)
exports.assignTask = async (req, res, next) => {
  console.log('=== assignTask called ===');
  console.log('taskId:', req.params.taskId);
  console.log('assignedTo:', req.body.assignedTo);

  try {
    const { taskId } = req.params;
    const { assignedTo, assignedRole } = req.body;

    // Only admin or performance marketer can assign tasks
    if (req.user.role !== 'admin' && req.user.role !== 'performance_marketer') {
      return res.status(403).json({
        success: false,
        message: 'Only admins or performance marketers can assign tasks'
      });
    }

    const task = await Task.findById(taskId).populate('projectId', '_id projectName businessName');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    console.log('Task found:', task.taskTitle);
    console.log('Project:', task.projectId?.projectName || task.projectId?.businessName);

    const oldAssignee = task.assignedTo;
    task.assignedTo = assignedTo || null;
    if (assignedRole) task.assignedRole = assignedRole;

    // Set originalAssignedTo if this is the first assignment (for Content Planners, designers, developers)
    // This ensures the original assignee can still see their tasks after submission
    if (!task.originalAssignedTo && assignedTo) {
      task.originalAssignedTo = assignedTo;
    }

    task.addRevision(req.user._id, 'Task reassigned', task.status, task.status);

    await task.save();

    // Notify new assignee
    console.log('Checking if assignedTo exists:', !!assignedTo);
    if (assignedTo) {
      console.log('Creating notification for user:', assignedTo);
      const projectDisplay = task.projectId.projectName || task.projectId.businessName;
      await Notification.create({
        recipient: assignedTo,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `You have been assigned to task: "${task.taskTitle}" for project "${projectDisplay}"`,
        projectId: task.projectId._id,
        organizationId: req.organizationId
      });
      console.log('Notification created');

      // Send email notification (async, don't block)
      console.log('Finding assigned user...');
      const assignedUser = await User.findById(assignedTo).select('name email');
      console.log('Assigned user found:', assignedUser?.name, assignedUser?.email);

      if (assignedUser) {
        console.log('Calling emailService.sendTaskAssignmentNotification...');
        emailService.sendTaskAssignmentNotification(
          task,
          task.projectId,
          assignedUser,
          req.user
        ).catch(err => console.error('Failed to send task assignment email:', err));
      } else {
        console.log('No assigned user found, skipping email');
      }
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('assignTask error:', error);
    next(error);
  }
};

// @desc    Upload files to task
// @route   POST /api/tasks/:taskId/files
// @access  Private (Assigned user only)
exports.uploadFiles = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId).populate('projectId', '_id organizationId');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Ensure organizationId is set (fix for tasks created before multi-tenant migration)
    if (!task.organizationId && task.projectId?.organizationId) {
      task.organizationId = task.projectId.organizationId;
    }

    // Check if user is assigned to this task or is the original assignee (for rejected tasks)
    const isAssignedUploader = task.assignedTo?.toString() === req.user._id.toString();
    const isOriginalAssignedUploader = task.originalAssignedTo?.toString() === req.user._id.toString();
    if (!isAssignedUploader && !isOriginalAssignedUploader && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned user can upload files'
      });
    }

    // Process uploaded files
    if (req.files && req.files.length > 0) {
      const newFiles = req.files.map(file => {
        // For Cloudinary, use the provided path and publicId
        // For local storage, convert absolute path to URL path
        let filePath = file.path;
        let publicId = file.filename || file.publicId;

        // If using local storage, convert absolute path to URL path
        if (file.path && file.path.includes('uploads')) {
          // Extract the relative path from absolute path
          const uploadsIndex = file.path.indexOf('uploads');
          if (uploadsIndex !== -1) {
            filePath = '/' + file.path.substring(uploadsIndex).replace(/\\/g, '/');
          }
        }

        return {
          name: file.originalname,
          path: filePath,
          publicId: publicId,
          uploadedAt: new Date()
        };
      });

      task.outputFiles = [...task.outputFiles, ...newFiles];
      await task.save();
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload custom logo for UI/UX designer task
// @route   POST /api/tasks/:taskId/custom-logo
// @access  Private (UI/UX Designer assigned to task)
exports.uploadCustomLogo = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const task = await Task.findById(taskId).populate('projectId', '_id organizationId');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Ensure organizationId is set
    if (!task.organizationId && task.projectId?.organizationId) {
      task.organizationId = task.projectId.organizationId;
    }

    // Check if user is assigned to this task
    const isAssignedUploader = task.assignedTo?.toString() === req.user._id.toString();
    const isOriginalAssignedUploader = task.originalAssignedTo?.toString() === req.user._id.toString();
    if (!isAssignedUploader && !isOriginalAssignedUploader && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned user can upload custom logo'
      });
    }

    // Only UI/UX designers can upload custom logo for landing page design tasks
    if (task.taskType !== 'landing_page_design') {
      return res.status(400).json({
        success: false,
        message: 'Custom logo can only be uploaded for landing page design tasks'
      });
    }

    // Delete old custom logo from Cloudinary if exists
    if (task.customLogo?.publicId) {
      const cloudinary = require('cloudinary').v2;
      try {
        await cloudinary.uploader.destroy(task.customLogo.publicId);
      } catch (err) {
        console.warn('Failed to delete old custom logo:', err.message);
      }
    }

    // Process uploaded file
    let filePath = req.file.path;
    let publicId = req.file.filename || req.file.publicId;

    // If using local storage, convert absolute path to URL path
    if (req.file.path && req.file.path.includes('uploads')) {
      const uploadsIndex = req.file.path.indexOf('uploads');
      if (uploadsIndex !== -1) {
        filePath = '/' + req.file.path.substring(uploadsIndex).replace(/\\/g, '/');
      }
    }

    task.customLogo = {
      name: req.file.originalname,
      path: filePath,
      publicId: publicId,
      uploadedAt: new Date(),
      uploadedBy: req.user._id
    };

    await task.save();

    res.status(200).json({
      success: true,
      data: task,
      message: 'Custom logo uploaded successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete custom logo from task
// @route   DELETE /api/tasks/:taskId/custom-logo
// @access  Private (UI/UX Designer assigned to task)
exports.deleteCustomLogo = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user is assigned to this task
    const isAssignedUploader = task.assignedTo?.toString() === req.user._id.toString();
    const isOriginalAssignedUploader = task.originalAssignedTo?.toString() === req.user._id.toString();
    if (!isAssignedUploader && !isOriginalAssignedUploader && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned user can delete custom logo'
      });
    }

    if (!task.customLogo?.path) {
      return res.status(404).json({
        success: false,
        message: 'No custom logo found'
      });
    }

    // Delete from Cloudinary if publicId exists
    if (task.customLogo.publicId) {
      const cloudinary = require('cloudinary').v2;
      try {
        await cloudinary.uploader.destroy(task.customLogo.publicId);
      } catch (err) {
        console.warn('Failed to delete custom logo from Cloudinary:', err.message);
      }
    }

    task.customLogo = undefined;
    await task.save();

    res.status(200).json({
      success: true,
      message: 'Custom logo deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save designer brand overrides (colors, typography, logo selection, brand manual reference)
// @route   PUT /api/tasks/:taskId/designer-brand
// @access  Private (UI/UX Designer assigned to task)
exports.saveDesignerBrandOverrides = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { colors, typography, selectedLogo, brandManualReference } = req.body;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user is assigned to this task (UI/UX designer)
    const isAssignedUser = task.assignedTo?.toString() === req.user._id.toString();
    const isOriginalAssigned = task.originalAssignedTo?.toString() === req.user._id.toString();
    if (!isAssignedUser && !isOriginalAssigned && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned designer can update brand settings'
      });
    }

    // Initialize designerBrandOverrides if not exists
    if (!task.designerBrandOverrides) {
      task.designerBrandOverrides = {};
    }

    // Update colors if provided
    if (colors) {
      task.designerBrandOverrides.colors = {
        primary: colors.primary || { hex: '', name: 'Primary' },
        secondary: colors.secondary || { hex: '', name: 'Secondary' },
        tertiary: colors.tertiary || { hex: '', name: 'Tertiary' }
      };
    }

    // Update typography if provided
    if (typography) {
      task.designerBrandOverrides.typography = {
        title: typography.title || { fontFamily: '' },
        subtitle: typography.subtitle || { fontFamily: '' },
        body: typography.body || { fontFamily: '' }
      };
    }

    // Update selected logo if provided
    if (selectedLogo) {
      task.designerBrandOverrides.selectedLogo = selectedLogo;
    }

    // Update brand manual reference if provided
    if (brandManualReference) {
      task.designerBrandOverrides.brandManualReference = {
        fileName: brandManualReference.fileName || '',
        filePath: brandManualReference.filePath || '',
        acknowledgedAt: brandManualReference.acknowledged ? new Date() : null,
        acknowledged: brandManualReference.acknowledged || false
      };
    }

    task.designerBrandOverrides.updatedAt = new Date();
    task.designerBrandOverrides.updatedBy = req.user._id;

    await task.save();

    res.status(200).json({
      success: true,
      data: task,
      message: 'Designer brand settings saved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tasks pending review (for testers)
// @route   GET /api/tasks/pending-review
// @access  Private (Tester or Admin)
exports.getPendingReviewTasks = async (req, res, next) => {
  try {
    // Only testers and admins can access
    if (req.user.role !== 'tester' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only testers or admins can view pending reviews'
      });
    }

    // Debug logging
    console.log('=== getPendingReviewTasks ===');
    console.log('User:', req.user._id, 'Role:', req.user.role);
    console.log('OrganizationId:', req.organizationId);

    // Build base query - always filter by organization
    const baseQuery = {
      organizationId: req.organizationId,
      status: { $in: SUBMITTED_STATUSES }
    };

    let query;

    if (req.user.role === 'admin') {
      // Admins can see all pending tasks within their organization
      query = baseQuery;
      console.log('Admin query - showing all org tasks');
    } else {
      // Get projects where this tester is assigned in the team
      const projectsWithTester = await Project.find({
        organizationId: req.organizationId,
        $or: [
          { 'assignedTeam.testers': req.user._id },
          { 'assignedTeam.tester': req.user._id }  // legacy field
        ]
      }).select('_id');

      const projectIds = projectsWithTester.map(p => p._id);
      console.log('Projects where tester is assigned:', projectIds.length);

      // Testers can see tasks where:
      // 1. testerId matches their ID, OR
      // 2. testerId is not set but the task belongs to a project they're assigned to
      query = {
        ...baseQuery,
        $or: [
          { testerId: req.user._id },
          {
            testerId: { $exists: false },
            projectId: { $in: projectIds }
          },
          {
            testerId: null,
            projectId: { $in: projectIds }
          }
        ]
      };
      console.log('Tester query - showing tasks assigned to tester or in their projects:', req.user._id);
    }

    console.log('Query:', JSON.stringify(query, null, 2));

    const tasks = await Task.find(query)
      .populate('projectId', 'projectName businessName industry')
      .populate('assignedTo', 'name email role')
      .populate('testerId', 'name email')
      .sort({ submittedAt: 1 });

    console.log('Found tasks:', tasks.length);
    tasks.forEach(t => {
      console.log(`Task ${t._id}: org=${t.organizationId}, testerId=${t.testerId?._id || t.testerId || 'null'}, status=${t.status}`);
    });

    // Filter out tasks where project was deleted
    const validTasks = tasks.filter(task => task.projectId !== null);

    res.status(200).json({
      success: true,
      count: validTasks.length,
      data: validTasks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tasks pending marketer approval
// @route   GET /api/tasks/pending-marketer-approval
// @access  Private (Performance Marketer or Admin)
exports.getPendingMarketerApproval = async (req, res, next) => {
  try {
    // Only performance marketers and admins can access
    if (req.user.role !== 'performance_marketer' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only performance marketers or admins can view pending approvals'
      });
    }

    // Get projects where user is assigned as performance marketer
    const projects = await Project.find({
      'assignedTeam.performanceMarketer': req.user._id
    }).select('_id');

    const projectIds = projects.map(p => p._id);

    // Use centralized APPROVED_STATUSES from constants
    const tasks = await Task.find({
      projectId: { $in: projectIds },
      status: { $in: APPROVED_STATUSES }
    })
      .populate('projectId', 'projectName businessName industry')
      .populate('assignedTo', 'name email role')
      .populate('testerReviewedBy', 'name email')
      .populate('progressHistory.actor', 'name email role')
      .sort({ testerReviewedAt: 1 });

    // Filter out tasks where project was deleted
    const validTasks = tasks.filter(task => task.projectId !== null);

    res.status(200).json({
      success: true,
      count: validTasks.length,
      data: validTasks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get approved assets (tasks approved by tester or marketer)
// @route   GET /api/tasks/approved-assets
// @access  Private (Tester, Admin, Performance Marketer)
exports.getApprovedAssets = async (req, res, next) => {
  try {
    console.log('\n========== getApprovedAssets CALLED ==========');
    console.log('User ID:', req.user._id);
    console.log('User Role:', req.user.role);
    console.log('Organization ID (req.organizationId):', req.organizationId);
    console.log('Organization (req.organization):', req.organization?._id);
    console.log('=============================================\n');

    // Get tasks that have been approved by tester or are fully approved
    // Use TESTER_APPROVED_STATUSES to include content_final_approved
    // Note: content_final_approved tasks don't go to marketer, but should show in approved assets
    const approvedStatuses = [...TESTER_APPROVED_STATUSES, ...FINAL_STATUSES];

    // SECURITY: Ensure organizationId is set
    if (!req.organizationId) {
      console.error('[getApprovedAssets] ERROR: No organizationId set for user:', req.user._id);
      return res.status(403).json({
        success: false,
        message: 'Organization context required'
      });
    }

    // Build base query - always filter by organization
    const baseQuery = {
      organizationId: req.organizationId,
      status: { $in: approvedStatuses }
    };

    let query;

    if (req.user.role === 'admin') {
      // Admins see all approved tasks within their organization
      query = baseQuery;
    } else if (req.user.role === 'tester') {
      // Testers see only tasks they reviewed
      query = {
        ...baseQuery,
        testerReviewedBy: req.user._id
      };
    } else if (req.user.role === 'performance_marketer') {
      // Performance marketers see only tasks assigned to them
      query = {
        ...baseQuery,
        marketerId: req.user._id
      };
    } else {
      // Other roles don't have access
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view approved assets'
      });
    }

    console.log('[getApprovedAssets] Query:', JSON.stringify(query, null, 2));

    const tasks = await Task.find(query)
      .populate('projectId', 'projectName businessName industry')
      .populate('assignedTo', 'name email role')
      .populate('assignedBy', 'name email')
      .populate('testerReviewedBy', 'name email')
      .populate('marketerApprovedBy', 'name email')
      .sort({ testerReviewedAt: -1, updatedAt: -1 });

    console.log('[getApprovedAssets] Found tasks:', tasks.length);

    // Filter out tasks where project was deleted
    const validTasks = tasks.filter(task => task.projectId !== null);

    res.status(200).json({
      success: true,
      count: validTasks.length,
      data: validTasks
    });
  } catch (error) {
    console.error('[getApprovedAssets] Error:', error);
    next(error);
  }
};

// @desc    Get completed assets for a specific project
// @route   GET /api/tasks/project/:projectId/completed
// @access  Private (requires project access)
exports.getProjectCompletedAssets = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // Check project access
    const project = await Project.findOne({
      _id: projectId,
      organizationId: req.organizationId
    });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Get completed/approved statuses using centralized constants
    const completedStatuses = [...APPROVED_STATUSES, ...FINAL_STATUSES];

    const tasks = await Task.find({
      projectId,
      status: { $in: completedStatuses }
    })
      .populate('assignedTo', 'name email role')
      .populate('assignedBy', 'name email')
      .populate('testerReviewedBy', 'name email')
      .populate('marketerApprovedBy', 'name email')
      .sort({ updatedAt: -1 });

    // Group tasks by type
    const groupedTasks = {
      creatives: tasks.filter(t => ['graphic_design', 'video_editing'].includes(t.taskType)),
      landingPages: tasks.filter(t => ['landing_page_design', 'landing_page_development'].includes(t.taskType)),
      content: tasks.filter(t => t.taskType === 'content_creation'),
      other: tasks.filter(t => !['graphic_design', 'video_editing', 'landing_page_design', 'landing_page_development', 'content_creation'].includes(t.taskType))
    };

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: {
        project: {
          _id: project._id,
          projectName: project.projectName,
          businessName: project.businessName,
          industry: project.industry
        },
        tasks,
        groupedTasks
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate tasks for a project (trigger manually)
// @route   POST /api/tasks/generate/:projectId
// @access  Private (Admin only)
exports.generateTasks = async (req, res, next) => {
  try {
    // Only admin can trigger manual task generation
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can manually generate tasks'
      });
    }

    const { projectId } = req.params;

    const project = await Project.findOne({
      _id: projectId,
      organizationId: req.organizationId
    });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if creative strategy is completed
    if (!project.stages.creativeStrategy.isCompleted) {
      return res.status(400).json({
        success: false,
        message: 'Creative strategy must be completed before generating tasks'
      });
    }

    // Get creative strategy
    const creativeStrategy = await CreativeStrategy.findOne({ projectId });

    if (!creativeStrategy) {
      return res.status(404).json({
        success: false,
        message: 'Creative strategy not found'
      });
    }

    // Generate tasks
    const tasks = await generateTasksFromStrategy(projectId, creativeStrategy, req.user._id);

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
      message: `Successfully generated ${tasks.length} tasks for the project`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all tasks (for PM/admin)
// @route   GET /api/tasks
// @access  Private (admin, performance_marketer)
exports.getAllTasks = async (req, res, next) => {
  try {
    const { status, taskType, projectId } = req.query;

    const query = { organizationId: req.organizationId };
    if (status) query.status = status;
    if (taskType) query.taskType = taskType;
    if (projectId) query.projectId = projectId;

    const tasks = await Task.find(query)
      .populate('projectId', 'projectName businessName industry')
      .populate('assignedTo', 'name email role')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });

    // Filter out tasks where project was deleted
    const validTasks = tasks.filter(task => task.projectId !== null);

    res.status(200).json({
      success: true,
      count: validTasks.length,
      data: validTasks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task content output
// @route   PUT /api/tasks/:taskId/content
// @access  Private (assigned user)
exports.updateTaskContent = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { headline, bodyText, cta, script, notes } = req.body;

    const task = await Task.findById(taskId).populate('projectId', '_id projectName businessName organizationId');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Ensure organizationId is set (fix for tasks created before multi-tenant migration)
    if (!task.organizationId && task.projectId?.organizationId) {
      task.organizationId = task.projectId.organizationId;
    }

    // Verify ownership - allow assigned user, original assignee (for rejected tasks), or admin
    const isAssignedOwner = task.assignedTo?.toString() === req.user._id.toString();
    const isOriginalAssignee = task.originalAssignedTo?.toString() === req.user._id.toString();
    if (!isAssignedOwner && !isOriginalAssignee && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this task'
      });
    }

    // Update content output
    task.contentOutput = {
      headline: headline || task.contentOutput?.headline,
      bodyText: bodyText || task.contentOutput?.bodyText,
      cta: cta || task.contentOutput?.cta,
      script: script || task.contentOutput?.script,
      notes: notes || task.contentOutput?.notes
    };

    await task.save();

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get available team members for assignment
// @route   GET /api/tasks/team-members
// @access  Private
exports.getTeamMembers = async (req, res, next) => {
  try {
    const { role } = req.query;

    const query = { isActive: true };
    if (role) query.role = role;

    const users = await User.find(query)
      .select('name email role specialization availability');

    // Group by role
    const grouped = {
      contentWriters: users.filter(u => u.role === 'content_writer'),
      graphicDesigners: users.filter(u => u.role === 'graphic_designer'),
      videoEditors: users.filter(u => u.role === 'video_editor'),
      uiUxDesigners: users.filter(u => u.role === 'ui_ux_designer'),
      developers: users.filter(u => u.role === 'developer'),
      testers: users.filter(u => u.role === 'tester'),
      performanceMarketers: users.filter(u => u.role === 'performance_marketer')
    };

    res.status(200).json({
      success: true,
      data: grouped
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tasks by role (for dashboard view)
// @route   GET /api/tasks/by-role/:role
// @access  Private
exports.getTasksByRole = async (req, res, next) => {
  try {
    const { role } = req.params;
    const { status, projectId } = req.query;
    const organizationId = req.organizationId;

    // Validate role
    const validRoles = [
      'content_writer', 'graphic_designer', 'video_editor',
      'ui_ux_designer', 'developer', 'tester', 'performance_marketer'
    ];

    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Valid roles are: ${validRoles.join(', ')}`
      });
    }

    // For testers, get tasks submitted for review
    // For performance marketers, get tasks pending their approval
    // For other roles, get tasks assigned to them

    let query = { organizationId }; // Always filter by organization

    // Role-specific status filters
    if (role === 'tester') {
      // Testers see tasks that are submitted for review AND assigned to them specifically
      query.status = { $in: ['content_submitted', 'design_submitted', 'development_submitted'] };
      // Filter by the specific tester assigned to this task
      query.testerId = req.user._id;
    } else if (role === 'performance_marketer') {
      // Performance marketers see tasks pending their approval AND assigned to them specifically
      // Note: Content goes from Tester → Designer, NOT to Marketer
      // Marketer only reviews design_approved and development_approved tasks
      query.status = { $in: ['design_approved', 'development_approved'] };
      // Filter by the specific marketer assigned to this task
      query.marketerId = req.user._id;
    } else {
      // Other roles see their assigned tasks
      query.assignedRole = role;
      query.assignedTo = req.user._id;
      if (status) query.status = status;
    }

    if (projectId) query.projectId = projectId;

    const tasks = await Task.find(query)
      .populate('projectId', 'projectName businessName industry')
      .populate('assignedTo', 'name email role')
      .populate('assignedBy', 'name email')
      .sort({ dueDate: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get tasks for current user's role
// @route   GET /api/tasks/my-role-tasks
// @access  Private
exports.getMyRoleTasks = async (req, res, next) => {
  try {
    const { status, projectId } = req.query;
    const userRole = req.user.role;
    const organizationId = req.organizationId;

    // Map user role to task assignedRole
    const roleMap = {
      'content_creator': 'content_writer',
      'content_writer': 'content_writer',
      'graphic_designer': 'graphic_designer',
      'video_editor': 'video_editor',
      'ui_ux_designer': 'ui_ux_designer',
      'developer': 'developer',
      'tester': 'tester',
      'performance_marketer': 'performance_marketer'
    };

    const assignedRole = roleMap[userRole];
    if (!assignedRole) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    let query = { organizationId }; // Always filter by organization

    // Role-specific status filters
    if (assignedRole === 'tester') {
      // Testers see:
      // 1. Tasks submitted for review and assigned to them
      // 2. Tasks they have reviewed (approved or rejected)
      const userId = req.user._id;
      query = {
        organizationId,
        $or: [
          // Currently pending review - assigned to this tester
          {
            status: { $in: ['content_submitted', 'design_submitted', 'development_submitted'] },
            testerId: userId
          },
          // Previously reviewed by this tester (approved or rejected)
          {
            testerReviewedBy: userId,
            status: { $in: ['approved_by_tester', 'content_final_approved', 'design_approved', 'development_approved', 'content_rejected', 'design_rejected'] }
          }
        ]
      };
    } else if (assignedRole === 'performance_marketer') {
      // Performance marketers see tasks pending their approval AND assigned to them specifically
      // Marketer reviews content_approved, design_approved, and development_approved tasks
      query.status = { $in: ['content_approved', 'design_approved', 'development_approved'] };
      query.marketerId = req.user._id;
      // organizationId already set above
    } else {
      // For creators, designers, developers - show their assigned tasks
      // Also include tasks where they were the original assignee (submitted tasks)
      const statuses = {
        content_writer: ['content_pending', 'content_submitted', 'content_final_approved', 'final_approved', 'content_rejected', 'content_approved', 'approved_by_tester'],
        graphic_designer: ['design_pending', 'design_submitted', 'design_approved', 'final_approved', 'design_rejected', 'approved_by_tester'],
        video_editor: ['design_pending', 'design_submitted', 'design_approved', 'final_approved', 'design_rejected', 'approved_by_tester'],
        ui_ux_designer: ['design_pending', 'design_submitted', 'design_approved', 'final_approved', 'design_rejected', 'approved_by_tester', 'development_pending'],
        developer: ['development_pending', 'development_submitted', 'development_approved', 'final_approved', 'approved_by_tester']
      };

      const roleStatuses = statuses[assignedRole] || [];
      const userId = req.user._id;

      // Build a query that finds tasks belonging to this user
      // A task belongs to a user if:
      // 1. It's currently assigned to them (pending status)
      // 2. They were the original assignee (submitted/completed status)
      // 3. They created it and it's in their role's status range
      const mongoose = require('mongoose');
      const userIdObjId = new mongoose.Types.ObjectId(userId);

      if (status) {
        // Specific status filter requested
        query = {
          organizationId,
          status: status,
          $or: [
            { assignedTo: userIdObjId },
            { originalAssignedTo: userIdObjId },
            { createdBy: userIdObjId }
          ]
        };
        console.log('Status filter query:', JSON.stringify(query, null, 2));
      } else if (roleStatuses.length > 0) {
        // Show tasks with role-specific statuses that belong to this user
        query = {
          organizationId,
          status: { $in: roleStatuses },
          $or: [
            { assignedTo: userIdObjId },
            { originalAssignedTo: userIdObjId },
            { createdBy: userIdObjId }
          ]
        };
      } else {
        // Fallback
        query = {
          organizationId,
          assignedRole: assignedRole,
          assignedTo: userIdObjId
        };
      }
    }

    if (projectId) query.projectId = projectId;

    console.log('Final query:', JSON.stringify(query, null, 2));

    const tasks = await Task.find(query)
      .populate('projectId', 'projectName businessName industry')
      .populate('assignedTo', 'name email role')
      .populate('assignedBy', 'name email')
      .sort({ dueDate: 1, createdAt: -1 });

    console.log('Tasks found:', tasks.length);
    if (tasks.length > 0) {
      console.log('Task statuses:', tasks.map(t => ({ id: t._id, status: t.status, assignedTo: t.assignedTo?._id, originalAssignedTo: t.originalAssignedTo })));
    }

    // Filter out tasks where project was deleted (projectId will be null after populate)
    const validTasks = tasks.filter(task => task.projectId !== null);

    res.status(200).json({
      success: true,
      count: validTasks.length,
      data: validTasks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get creative tasks for the current user from CreativeStrategy
// @route   GET /api/tasks/my-creative-tasks
// @access  Private
exports.getMyCreativeTasks = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    console.log('\n=== getMyCreativeTasks ===');
    console.log('User ID:', userId);
    console.log('User Role:', userRole);

    // Map user role to assignedRole in creativePlan
    const roleMap = {
      'content_creator': 'content_writer',
      'content_writer': 'content_writer',
      'graphic_designer': 'graphic_designer',
      'video_editor': 'video_editor'
    };

    const assignedRole = roleMap[userRole];
    if (!assignedRole) {
      console.log('Role not supported for creative tasks:', userRole);
      return res.status(200).json({
        success: true,
        count: 0,
        data: []
      });
    }

    // Find all CreativeStrategy documents
    const strategies = await CreativeStrategy.find()
      .populate('projectId', 'projectName businessName industry');

    console.log(`Found ${strategies.length} creative strategies`);

    const tasks = [];
    const mongoose = require('mongoose');
    const userObjectId = new mongoose.Types.ObjectId(userId);

    strategies.forEach(strategy => {
      // Skip if project was deleted
      if (!strategy.projectId) return;

      const creativePlan = strategy.creativePlan || [];

      creativePlan.forEach((creative, index) => {
        // Check if this creative is assigned to the current user
        const isAssignedToUser = creative.assignedTeamMembers?.some(memberId => {
          // Handle both ObjectId and string comparisons
          const memberIdStr = memberId?._id?.toString() || memberId?.toString();
          return memberIdStr === userId.toString();
        });

        // Also check if the role matches
        const roleMatches = creative.assignedRole === assignedRole;

        if (isAssignedToUser && roleMatches) {
          tasks.push({
            _id: `${strategy._id}_${creative._id || index}`,
            projectId: strategy.projectId,
            creativeStrategyId: strategy._id,
            creativeName: creative.name || `Creative ${index + 1}`,
            creativeType: creative.creativeType,
            subType: creative.subType,
            objective: creative.objective,
            platforms: creative.platforms || [],
            screenSizes: creative.screenSizes || [],
            assignedRole: creative.assignedRole,
            assignedTeamMembers: creative.assignedTeamMembers,
            notes: creative.notes,
            taskType: 'content_generation',
            status: 'pending'
          });
        }
      });
    });

    console.log(`Found ${tasks.length} creative tasks for user ${userId}`);

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    console.error('Error in getMyCreativeTasks:', error);
    next(error);
  }
};

// Note: getValidTransitions is imported from constants/taskStatuses.js

// @desc    Get projects with approved assets for Performance Marketer
// @route   GET /api/tasks/pm-projects-with-assets
// @access  Private (Performance Marketer or Admin)
exports.getPMProjectsWithAssets = async (req, res, next) => {
  try {
    // Only performance marketers and admins can access
    if (req.user.role !== 'performance_marketer' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only performance marketers or admins can view projects with assets'
      });
    }

    // Get projects where user is assigned as performance marketer (within their organization)
    const projectQuery = req.user.role === 'admin'
      ? { organizationId: req.organizationId }
      : {
          organizationId: req.organizationId,
          'assignedTeam.performanceMarketers': req.user._id
        };

    const projects = await Project.find(projectQuery)
      .select('_id projectName businessName industry status isActive')
      .sort({ updatedAt: -1 });

    // Status categories - use centralized constants
    const pendingStatuses = PENDING_STATUSES;
    const submittedStatuses = SUBMITTED_STATUSES;
    const approvedStatuses = APPROVED_STATUSES;
    const finalApprovedStatuses = FINAL_STATUSES;
    const rejectedStatuses = REJECTED_STATUSES;

    // Get assets for each project
    const projectsWithAssets = await Promise.all(
      projects.map(async (project) => {
        // Get ALL tasks for this project
        const allTasks = await Task.find({ projectId: project._id })
          .populate('assignedTo', 'name email')
          .populate('assignedRole')
          .sort({ createdAt: -1 });

        // Categorize by status
        const pendingTasks = allTasks.filter(t => pendingStatuses.includes(t.status));
        const submittedTasks = allTasks.filter(t => submittedStatuses.includes(t.status));
        const approvedTasks = allTasks.filter(t => approvedStatuses.includes(t.status));
        const finalApprovedTasks = allTasks.filter(t => finalApprovedStatuses.includes(t.status));
        const rejectedTasks = allTasks.filter(t => rejectedStatuses.includes(t.status));

        // Categorize assets by type
        const categorizeByType = (tasks) => {
          return {
            imageCreatives: tasks.filter(t =>
              t.taskType === 'graphic_design' &&
              (!t.creativeOutputType || ['image_creative', 'static_ad', 'carousel_creative'].includes(t.creativeOutputType))
            ),
            videoCreatives: tasks.filter(t =>
              t.taskType === 'video_editing' ||
              (t.taskType === 'graphic_design' && ['video_creative', 'reel', 'ugc_content', 'testimonial_content', 'demo_video'].includes(t.creativeOutputType))
            ),
            uiuxDesigns: tasks.filter(t => t.taskType === 'landing_page_design'),
            landingPages: tasks.filter(t => t.taskType === 'landing_page_development')
          };
        };

        return {
          _id: project._id,
          projectName: project.projectName,
          businessName: project.businessName,
          industry: project.industry,
          status: project.status,
          isActive: project.isActive,
          taskStats: {
            total: allTasks.length,
            pending: pendingTasks.length,
            submitted: submittedTasks.length,
            approved: approvedTasks.length,
            finalApproved: finalApprovedTasks.length,
            rejected: rejectedTasks.length
          },
          tasks: {
            all: allTasks,
            pending: pendingTasks,
            submitted: submittedTasks,
            approved: approvedTasks,
            finalApproved: finalApprovedTasks,
            rejected: rejectedTasks
          },
          tasksByType: {
            all: categorizeByType(allTasks),
            finalApproved: categorizeByType(finalApprovedTasks)
          }
        };
      })
    );

    // Filter out projects with deleted data
    const validProjects = projectsWithAssets.filter(p => p._id);

    res.status(200).json({
      success: true,
      count: validProjects.length,
      data: validProjects
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get assets for a specific project (Performance Marketer view)
// @route   GET /api/tasks/pm-project-assets/:projectId
// @access  Private (Performance Marketer or Admin)
exports.getPMProjectAssets = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // Only performance marketers and admins can access
    if (req.user.role !== 'performance_marketer' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only performance marketers or admins can view project assets'
      });
    }

    // Check project access
    const project = await Project.findOne({
      _id: projectId,
      organizationId: req.organizationId
    });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // For non-admin, verify assignment
    if (req.user.role !== 'admin') {
      const isAssigned = project.assignedTeam?.performanceMarketers?.some(
        pm => pm.toString() === req.user._id.toString()
      ) || project.assignedTeam?.performanceMarketer?.toString() === req.user._id.toString();

      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this project'
        });
      }
    }

    // Status categories - use centralized constants
    const pendingStatuses = PENDING_STATUSES;
    const submittedStatuses = SUBMITTED_STATUSES;
    const approvedStatuses = APPROVED_STATUSES;
    const finalApprovedStatuses = FINAL_STATUSES;
    const rejectedStatuses = REJECTED_STATUSES;

    // Get ALL tasks for this project
    const allTasks = await Task.find({ projectId })
      .populate('assignedTo', 'name email')
      .populate('testerReviewedBy', 'name email')
      .populate('marketerApprovedBy', 'name email')
      .sort({ createdAt: -1 });

    // Categorize by status
    const pendingTasks = allTasks.filter(t => pendingStatuses.includes(t.status));
    const submittedTasks = allTasks.filter(t => submittedStatuses.includes(t.status));
    const approvedTasks = allTasks.filter(t => approvedStatuses.includes(t.status));
    const finalApprovedTasks = allTasks.filter(t => finalApprovedStatuses.includes(t.status));
    const rejectedTasks = allTasks.filter(t => rejectedStatuses.includes(t.status));

    // Categorize by type
    const categorizeByType = (tasks) => {
      return {
        imageCreatives: tasks.filter(t =>
          t.taskType === 'graphic_design' &&
          (!t.creativeOutputType || ['image_creative', 'static_ad', 'carousel_creative'].includes(t.creativeOutputType))
        ),
        videoCreatives: tasks.filter(t =>
          t.taskType === 'video_editing' ||
          (t.taskType === 'graphic_design' && ['video_creative', 'reel', 'ugc_content', 'testimonial_content', 'demo_video'].includes(t.creativeOutputType))
        ),
        uiuxDesigns: tasks.filter(t => t.taskType === 'landing_page_design'),
        landingPages: tasks.filter(t => t.taskType === 'landing_page_development')
      };
    };

    res.status(200).json({
      success: true,
      data: {
        project: {
          _id: project._id,
          projectName: project.projectName,
          businessName: project.businessName,
          industry: project.industry
        },
        stats: {
          total: allTasks.length,
          pending: pendingTasks.length,
          submitted: submittedTasks.length,
          approved: approvedTasks.length,
          finalApproved: finalApprovedTasks.length,
          rejected: rejectedTasks.length,
          byType: {
            imageCreatives: categorizeByType(allTasks).imageCreatives.length,
            videoCreatives: categorizeByType(allTasks).videoCreatives.length,
            uiuxDesigns: categorizeByType(allTasks).uiuxDesigns.length,
            landingPages: categorizeByType(allTasks).landingPages.length
          }
        },
        tasks: {
          all: allTasks,
          pending: pendingTasks,
          submitted: submittedTasks,
          approved: approvedTasks,
          finalApproved: finalApprovedTasks,
          rejected: rejectedTasks
        },
        tasksByType: {
          all: categorizeByType(allTasks),
          finalApproved: categorizeByType(finalApprovedTasks)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to notify tester for review
async function notifyTesterForReview(task, organizationId) {
  // Use provided organizationId or fallback to task's organizationId
  const orgId = organizationId || task.organizationId;

  const query = { _id: task.projectId };
  if (orgId) {
    query.organizationId = orgId;
  }
  const project = await Project.findOne(query)
    // New array fields
    .populate('assignedTeam.testers', '_id name email')
    // Legacy single field
    .populate('assignedTeam.tester', '_id name email');

  if (!project) return;

  // Collect all testers (from both new array and legacy field)
  const testerIds = [];
  const testers = [];

  // First priority: testers assigned specifically to this task (from creative plan / landing page)
  if (task.testerIds && Array.isArray(task.testerIds) && task.testerIds.length > 0) {
    for (const testerId of task.testerIds) {
      const idStr = testerId._id?.toString() || testerId.toString();
      if (!testerIds.some(id => id.toString() === idStr)) {
        testerIds.push(idStr);
        const specificTester = await User.findById(idStr).select('_id name email');
        if (specificTester) {
          testers.push(specificTester);
        }
      }
    }
    console.log(`Task ${task._id}: Using task-specific testers from testerIds: ${testerIds.join(', ')}`);
  }
  // Legacy single testerId field
  else if (task.testerId) {
    const idStr = task.testerId._id?.toString() || task.testerId.toString();
    if (!testerIds.some(id => id.toString() === idStr)) {
      testerIds.push(idStr);
      const specificTester = await User.findById(idStr).select('_id name email');
      if (specificTester) {
        testers.push(specificTester);
      }
    }
    console.log(`Task ${task._id}: Using task-specific tester from testerId: ${idStr}`);
  }
  // Fall back to project-level testers
  else {
    // From new array field
    if (project.assignedTeam?.testers && Array.isArray(project.assignedTeam.testers)) {
      project.assignedTeam.testers.forEach(tester => {
        if (tester && tester._id) {
          const idStr = tester._id.toString();
          if (!testerIds.some(id => id.toString() === idStr)) {
            testerIds.push(idStr);
            testers.push(tester);
          }
        }
      });
    }

    // From legacy single field (for backward compatibility)
    if (project.assignedTeam?.tester && project.assignedTeam.tester._id) {
      const idStr = project.assignedTeam.tester._id.toString();
      // Only add if not already in the list
      if (!testerIds.some(id => id.toString() === idStr)) {
        testerIds.push(idStr);
        testers.push(project.assignedTeam.tester);
      }
    }
    console.log(`Task ${task._id}: Using project-level testers: ${testerIds.join(', ')}`);
  }

  // Notify all testers
  for (const testerId of testerIds) {
    await Notification.create({
      recipient: testerId,
      type: 'task_submitted',
      title: 'Task Ready for Review',
      message: `A task "${task.taskTitle}" has been submitted and is ready for your review.`,
      projectId: task.projectId,
      organizationId: orgId || project.organizationId
    });
  }

  // Send email notifications to testers (async, don't block)
  for (const tester of testers) {
    if (tester && tester.email) {
      emailService.sendTaskAssignmentNotification(
        task,
        project,
        tester,
        { name: 'System' }
      ).catch(err => console.error('Failed to send tester notification email:', err));
    }
  }
}

// @desc    Get task statistics for dashboard
// @route   GET /api/tasks/stats/:role
// @access  Private
exports.getTaskStats = async (req, res, next) => {
  try {
    const { role } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;
    const organizationId = req.organizationId;

    // Validate role parameter
    const validRoles = ['content_writer', 'graphic_designer', 'developer', 'tester', 'performance_marketer', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    // Non-admin users can only view their own role stats
    if (userRole !== 'admin' && role !== userRole) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these statistics'
      });
    }

    // Build query based on role - ALWAYS filter by organization
    let query = { organizationId };

    // Map frontend role names to database assignedRole values
    const roleMap = {
      'content_creator': 'content_writer',
      'content_writer': 'content_writer',
      'graphic_designer': 'graphic_designer',
      'developer': 'developer',
      'tester': 'tester',
      'performance_marketer': 'performance_marketer'
    };

    if (role === 'admin') {
      // Admin sees all tasks within organization (already filtered above)
      // query already has organizationId
    } else if (role === 'tester') {
      // Tester sees tasks in submitted status for review within organization
      query.status = { $in: SUBMITTED_STATUSES };
    } else {
      // Other roles see tasks assigned to them within organization
      query.assignedTo = userId;
    }

    // Get all relevant tasks
    const tasks = await Task.find(query)
      .populate('projectId', 'projectName businessName status')
      .sort({ updatedAt: -1 });

    // Calculate statistics based on role
    let stats = {
      total: tasks.length,
      pending: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
      byStatus: {},
      byType: {},
      recentTasks: []
    };

    if (role === 'content_writer') {
      // Content Planner statistics
      stats.pending = tasks.filter(t =>
        ['todo', 'in_progress', 'content_pending'].includes(t.status)
      ).length;
      stats.submitted = tasks.filter(t =>
        t.status === 'content_submitted'
      ).length;
      stats.approved = tasks.filter(t =>
        ['content_final_approved', 'final_approved'].includes(t.status)
      ).length;
      stats.rejected = tasks.filter(t =>
        t.status === 'content_rejected'
      ).length;

    } else if (role === 'graphic_designer') {
      // Graphic designer statistics
      stats.pending = tasks.filter(t =>
        ['todo', 'in_progress', 'design_pending'].includes(t.status)
      ).length;
      stats.submitted = tasks.filter(t =>
        t.status === 'design_submitted'
      ).length;
      stats.approved = tasks.filter(t =>
        ['design_approved', 'final_approved'].includes(t.status)
      ).length;
      stats.rejected = tasks.filter(t =>
        ['design_rejected', 'rejected'].includes(t.status)
      ).length;

    } else if (role === 'developer') {
      // Developer statistics
      stats.pending = tasks.filter(t =>
        ['todo', 'in_progress', 'development_pending'].includes(t.status)
      ).length;
      stats.submitted = tasks.filter(t =>
        t.status === 'development_submitted'
      ).length;
      stats.approved = tasks.filter(t =>
        ['development_approved', 'final_approved'].includes(t.status)
      ).length;
      stats.rejected = tasks.filter(t =>
        t.status === 'rejected'
      ).length;

    } else if (role === 'tester') {
      // Tester statistics - tasks pending review
      stats.pendingReview = tasks.filter(t =>
        SUBMITTED_STATUSES.includes(t.status)
      ).length;

      // Get approved/rejected counts from recently reviewed (within organization)
      const recentlyReviewed = await Task.find({
        organizationId,
        testerReviewedBy: userId,
        updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      });

      stats.approved = recentlyReviewed.filter(t =>
        APPROVED_STATUSES.includes(t.status)
      ).length;
      stats.rejected = recentlyReviewed.filter(t =>
        REJECTED_STATUSES.includes(t.status)
      ).length;
      stats.total = stats.pendingReview + stats.approved + stats.rejected;

    } else if (role === 'performance_marketer') {
      // Performance marketer statistics
      stats.pendingApproval = tasks.filter(t =>
        APPROVED_STATUSES.includes(t.status) && !FINAL_STATUSES.includes(t.status)
      ).length;
      stats.approved = tasks.filter(t =>
        FINAL_STATUSES.includes(t.status)
      ).length;
      stats.total = tasks.length;
    }

    // Group by status for chart data
    tasks.forEach(task => {
      const status = task.status;
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
    });

    // Group by task type
    tasks.forEach(task => {
      const type = task.taskType || 'other';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    // Get recent tasks (last 5)
    stats.recentTasks = tasks.slice(0, 5).map(task => ({
      _id: task._id,
      taskTitle: task.taskTitle,
      taskType: task.taskType,
      status: task.status,
      creativeName: task.creativeName,
      project: task.projectId,
      updatedAt: task.updatedAt
    }));

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};