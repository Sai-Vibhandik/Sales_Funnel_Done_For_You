const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const Notification = require('../models/Notification');
const MarketResearch = require('../models/MarketResearch');
const Offer = require('../models/Offer');
const TrafficStrategy = require('../models/TrafficStrategy');
const CreativeStrategy = require('../models/Creative');
const Membership = require('../models/Membership');
const emailService = require('./emailService');

// SOP References for different task types
const SOP_REFERENCES = {
  graphic_design: '/docs/sop/graphic-design-guide.pdf',
  video_editing: '/docs/sop/video-editing-guide.pdf',
  landing_page_design: '/docs/sop/landing-page-design-guide.pdf',
  landing_page_development: '/docs/sop/landing-page-development-guide.pdf',
  content_writing: '/docs/sop/content-writing-guide.pdf'
};

// Task type to asset type mapping
const TASK_ASSET_MAPPING = {
  image_creative: 'graphic_design',
  video_creative: 'video_editing',
  carousel_creative: 'graphic_design',
  reel: 'video_editing',
  static_ad: 'graphic_design',
  landing_page_design: 'landing_page_design',
  landing_page_page: 'landing_page_development'
};

/**
 * Verify that a user belongs to the specified organization
 * @param {string} userId - User ID to verify
 * @param {string} organizationId - Organization ID to check against
 * @returns {Promise<boolean>}
 */
async function verifyUserBelongsToOrg(userId, organizationId) {
  if (!userId || !organizationId) return false;

  const membership = await Membership.findOne({
    userId,
    organizationId,
    status: 'active'
  });

  return !!membership;
}

/**
 * Generate tasks automatically when a creative strategy is completed
 * @param {string} projectId - The project ID
 * @param {object} creativeStrategy - The creative strategy document
 * @param {string} completedBy - User ID who completed the strategy
 */
async function generateTasksFromStrategy(projectId, creativeStrategy, completedBy) {
  try {
    console.log('\n========================================');
    console.log('=== TASK GENERATION STARTED ===');
    console.log('========================================');
    console.log(`Project ID: ${projectId}`);
    console.log(`Completed by: ${completedBy}`);
    console.log(`Creative Strategy ID: ${creativeStrategy?._id}`);

    // Get project with team assignments - populate both new array fields and legacy fields
    const project = await Project.findById(projectId)
      .populate('assignedTeam.performanceMarketers', 'name email')
      .populate('assignedTeam.contentWriters', 'name email')
      .populate('assignedTeam.uiUxDesigners', 'name email')
      .populate('assignedTeam.graphicDesigners', 'name email')
      .populate('assignedTeam.videoEditors', 'name email')
      .populate('assignedTeam.developers', 'name email')
      .populate('assignedTeam.testers', 'name email')
      // Legacy fields for backward compatibility
      .populate('assignedTeam.performanceMarketer', 'name email')
      .populate('assignedTeam.contentCreator', 'name email')
      .populate('assignedTeam.contentWriter', 'name email')
      .populate('assignedTeam.uiUxDesigner', 'name email')
      .populate('assignedTeam.graphicDesigner', 'name email')
      .populate('assignedTeam.videoEditor', 'name email')
      .populate('assignedTeam.developer', 'name email')
      .populate('assignedTeam.tester', 'name email');

    if (!project) {
      console.error('ERROR: Project not found');
      throw new Error('Project not found');
    }

    console.log(`\n=== Project Info ===`);
    console.log(`Business Name: ${project.businessName}`);
    console.log(`Project Name: ${project.projectName}`);

    // Get strategy context from all stages
    // Landing pages are embedded in the Project document, not in a separate collection
    const [marketResearch, offer, trafficStrategy] = await Promise.all([
      MarketResearch.findOne({ projectId }),
      Offer.findOne({ projectId }),
      TrafficStrategy.findOne({ projectId })
    ]);

    // Landing pages are embedded in the Project document
    const landingPages = project.landingPages || [];

    // Build strategy context for AI prompts
    const strategyContext = buildStrategyContext(marketResearch, offer, trafficStrategy, creativeStrategy, project);

    // Generate context links for team members
    const contextLink = `/projects/${projectId}/strategy-summary`;
    const contextPdfUrl = `/api/projects/${projectId}/strategy-summary/text`;

    // Generate tasks from creative strategy ad types (if creative strategy exists)
    const tasks = [];
    const adTypes = creativeStrategy?.adTypes || [];
    const creativePlan = creativeStrategy?.creativePlan || [];

    console.log(`\n=== Creative Strategy Data ===`);
    console.log(`- Ad types: ${adTypes.length}`);
    console.log(`- Creative plan items: ${creativePlan.length}`);
    console.log(`- Landing pages: ${landingPages.length}`);

    if (creativePlan.length > 0) {
      console.log(`\n=== Creative Plan Items ===`);
      creativePlan.forEach((item, idx) => {
        console.log(`Item ${idx + 1}:`, {
          name: item.name,
          creativeType: item.creativeType,
          subType: item.subType,
          objective: item.objective,
          assignedRole: item.assignedRole,
          assignedTeamMembers: item.assignedTeamMembers,
          notes: item.notes
        });
      });
    }

    console.log(`\n=== Team Assignments ===`);
    console.log(`contentWriters:`, project.assignedTeam?.contentWriters?.map(m => ({ _id: m?._id, name: m?.name })) || 'none');
    console.log(`graphicDesigners:`, project.assignedTeam?.graphicDesigners?.map(m => ({ _id: m?._id, name: m?.name })) || 'none');
    console.log(`videoEditors:`, project.assignedTeam?.videoEditors?.map(m => ({ _id: m?._id, name: m?.name })) || 'none');
    // Legacy fields
    console.log(`contentWriter (legacy):`, project.assignedTeam?.contentWriter?._id || 'none');
    console.log(`graphicDesigner (legacy):`, project.assignedTeam?.graphicDesigner?._id || 'none');
    console.log(`videoEditor (legacy):`, project.assignedTeam?.videoEditor?._id || 'none');

    // Check for existing tasks to prevent duplicates
    const existingTasks = await Task.find({
      projectId,
      taskType: { $in: ['content_creation', 'graphic_design', 'video_editing', 'landing_page_design', 'landing_page_development'] }
    }).select('taskType creativeStrategyId adTypeKey landingPageId');

    // Build sets for quick duplicate checking
    const existingAdTypeKeys = new Set(
      existingTasks
        .filter(t => t.adTypeKey)
        .map(t => t.adTypeKey)
    );
    const existingCreativeStrategyTasks = existingTasks.filter(t => t.creativeStrategyId).length;
    const existingLandingPageIds = new Set(
      existingTasks
        .filter(t => t.landingPageId)
        .map(t => t.landingPageId.toString())
    );

    console.log(`Found ${existingTasks.length} existing tasks for project (${existingAdTypeKeys.size} ad types, ${existingCreativeStrategyTasks} creative strategy, ${existingLandingPageIds.size} landing pages)`);

    // Generate tasks from legacy ad types
    for (const adType of adTypes) {
      // Skip if tasks for this ad type already exist
      if (existingAdTypeKeys.has(adType.typeKey)) {
        console.log(`Skipping ad type ${adType.typeName} (${adType.typeKey}) - tasks already exist`);
        continue;
      }

      const adTypeTasks = generateAdTypeTasks(adType, projectId, creativeStrategy?._id || null, strategyContext, project, completedBy, contextLink, contextPdfUrl);
      tasks.push(...adTypeTasks);
    }

    // Generate tasks from new creative plan
    if (creativePlan.length > 0) {
      // Check which creative plan items already have tasks by creativePlanItemId
      // This allows us to update existing tasks when name/role/framework changes
      const existingCreativePlanTasks = await Task.find({
        projectId,
        creativeStrategyId: creativeStrategy?._id,
        taskType: { $in: ['content_creation', 'graphic_design', 'video_editing'] }
      }).select('taskTitle taskType creativePlanItemId status');

      // Build a map of existing tasks by creativePlanItemId
      // Key: creativePlanItemId, Value: { contentTask, designTask }
      const existingTasksByItemId = new Map();

      // Also build a map by task title + type as a fallback for duplicate detection
      // This prevents creating duplicate tasks when creativePlanItemId changes
      const existingTasksByTitleAndType = new Map();

      for (const task of existingCreativePlanTasks) {
        // Index by creativePlanItemId
        if (task.creativePlanItemId) {
          if (!existingTasksByItemId.has(task.creativePlanItemId.toString())) {
            existingTasksByItemId.set(task.creativePlanItemId.toString(), {});
          }
          const itemTasks = existingTasksByItemId.get(task.creativePlanItemId.toString());
          if (task.taskType === 'content_creation') {
            itemTasks.contentTask = task;
          } else if (task.taskType === 'graphic_design' || task.taskType === 'video_editing') {
            itemTasks.designTask = task;
          }
        }

        // Also index by title + type for duplicate detection
        const titleKey = `${task.taskTitle}_${task.taskType}`;
        if (!existingTasksByTitleAndType.has(titleKey)) {
          existingTasksByTitleAndType.set(titleKey, task);
        }
      }

      console.log(`Found ${existingTasksByItemId.size} creative plan items with existing tasks (by ID)`);
      console.log(`Found ${existingTasksByTitleAndType.size} existing tasks (by title+type)`);

      // Separate items into: new items (need task creation) and existing items (need task update)
      const newCreativePlanItems = [];
      const existingCreativePlanItems = [];

      for (const item of creativePlan) {
        const itemId = item._id?.toString();
        const itemTitle = item.name || item.subType || item.adType || `Creative ${creativePlan.indexOf(item) + 1}`;

        // Check if tasks exist by ID
        if (itemId && existingTasksByItemId.has(itemId)) {
          existingCreativePlanItems.push(item);
          continue;
        }

        // Also check by title + type to prevent duplicates
        const contentTitleKey = `Content: ${itemTitle}_content_creation`;
        const designTitleKey = `${itemTitle}_${item.creativeType === 'VIDEO' ? 'video_editing' : 'graphic_design'}`;

        if (existingTasksByTitleAndType.has(contentTitleKey) || existingTasksByTitleAndType.has(designTitleKey)) {
          console.log(`Found existing task for "${itemTitle}" by title, treating as existing item`);
          existingCreativePlanItems.push(item);
          continue;
        }

        // This is a new item
        newCreativePlanItems.push(item);
      }

      console.log(`New creative plan items: ${newCreativePlanItems.length}, Existing items to update: ${existingCreativePlanItems.length}`);

      // Update existing tasks with new data (name, role, aiFramework, etc.)
      if (existingCreativePlanItems.length > 0) {
        console.log('Updating existing tasks with new creative plan data...');
        await updateExistingCreativePlanTasks(existingCreativePlanItems, existingTasksByItemId, project, creativeStrategy?._id);
      }

      // Generate tasks for new creative plan items
      if (newCreativePlanItems.length > 0) {
        console.log(`Generating tasks for ${newCreativePlanItems.length} new creative plan items (out of ${creativePlan.length} total)`);
        const creativePlanTasks = await generateCreativePlanTasks(newCreativePlanItems, projectId, creativeStrategy?._id || null, strategyContext, project, completedBy, contextLink, contextPdfUrl);
        tasks.push(...creativePlanTasks);
      } else {
        console.log(`All ${creativePlan.length} creative plan items already have tasks - updated existing tasks instead of creating duplicates`);
      }
    }

    // Generate landing page tasks for EACH landing page that doesn't already have tasks
    // Landing pages are embedded in the Project document
    for (const landingPage of landingPages) {
      // Skip if tasks already exist for this landing page
      if (existingLandingPageIds.has(landingPage._id.toString())) {
        console.log(`Skipping landing page ${landingPage.name || landingPage._id} - tasks already exist`);
        continue;
      }
      const landingPageTasks = generateLandingPageTasks(landingPage, projectId, creativeStrategy?._id || null, strategyContext, project, completedBy, contextLink, contextPdfUrl);
      tasks.push(...landingPageTasks);
    }

    // Only save if there are tasks to create
    if (tasks.length === 0) {
      console.log(`No tasks generated for project ${project.businessName} - no ad types, creative plan, or landing pages with assigned team members`);
      return [];
    }

    // Save all tasks
    const savedTasks = await Task.insertMany(tasks);

    // Link design/video tasks to their parent content tasks
    // This is crucial for passing approved content from content task to design task
    await linkContentToDesignTasks(savedTasks, projectId);

    // Send notifications to assigned users
    await sendTaskAssignmentNotifications(savedTasks, project);

    console.log(`Generated ${savedTasks.length} tasks for project ${project.businessName}`);
    return savedTasks;
  } catch (error) {
    console.error('Error generating tasks from strategy:', error);
    throw error;
  }
}

/**
 * Build strategy context for AI prompt generation
 */
function buildStrategyContext(marketResearch, offer, trafficStrategy, creativeStrategy, project) {
  const context = {
    // Business info
    businessName: project.businessName,
    industry: project.industry,
    customerName: project.customerName,

    // Market research
    targetAudience: {},
    painPoints: [],
    desires: [],

    // Offer
    offer: {},
    valueProposition: '',

    // Traffic strategy
    channels: [],
    hooks: [],

    // Creative strategy
    creativeTypes: [],
    platforms: []
  };

  // Extract market research data
  if (marketResearch) {
    context.targetAudience = {
      ageRange: marketResearch.avatar?.ageRange || '',
      location: marketResearch.avatar?.location || '',
      income: marketResearch.avatar?.income || '',
      profession: marketResearch.avatar?.profession || '',
      interests: marketResearch.avatar?.interests || []
    };
    context.painPoints = marketResearch.painPoints || [];
    context.desires = marketResearch.desires || [];
  }

  // Extract offer data
  if (offer) {
    context.offer = {
      functionalValue: offer.functionalValue,
      emotionalValue: offer.emotionalValue,
      bonuses: offer.bonuses,
      guarantees: offer.guarantees,
      pricing: offer.pricing
    };
    context.valueProposition = `${offer.functionalValue || ''} ${offer.emotionalValue || ''}`.trim();
  }

  // Extract traffic strategy data
  if (trafficStrategy) {
    context.channels = (trafficStrategy.channels || [])
      .filter(c => c.isSelected)
      .map(c => c.name);
    context.hooks = (trafficStrategy.hooks || []).map(h => h.content);
  }

  // Extract creative strategy data (handle null creativeStrategy)
  if (creativeStrategy && creativeStrategy.adTypes) {
    context.creativeTypes = (creativeStrategy.adTypes || []).map(at => ({
      typeKey: at.typeKey,
      typeName: at.typeName,
      platforms: at.creatives?.platforms || [],
      hook: at.creatives?.hook,
      headline: at.creatives?.headline,
      cta: at.creatives?.cta,
      messagingAngle: at.creatives?.messagingAngle
    }));
    context.platforms = (creativeStrategy.adTypes || [])
      .flatMap(at => at.creatives?.platforms || [])
      .filter((v, i, a) => a.indexOf(v) === i); // unique
  }

  return context;
}

/**
 * Generate tasks for a specific ad type
 */
function generateAdTypeTasks(adType, projectId, creativeStrategyId, strategyContext, project, completedBy, contextLink, contextPdfUrl) {
  const tasks = [];
  const creatives = adType.creatives || {};

  // Helper function to get first team member for a role
  const getFirstMember = (role) => {
    const roleFieldMap = {
      'content_writer': { arrayField: 'contentWriters', legacyField: 'contentWriter' },
      'graphic_designer': { arrayField: 'graphicDesigners', legacyField: 'graphicDesigner' },
      'video_editor': { arrayField: 'videoEditors', legacyField: 'videoEditor' },
      'ui_ux_designer': { arrayField: 'uiUxDesigners', legacyField: 'uiUxDesigner' },
      'developer': { arrayField: 'developers', legacyField: 'developer' },
      'tester': { arrayField: 'testers', legacyField: 'tester' }
    };

    const fieldConfig = roleFieldMap[role];
    if (!fieldConfig) return null;

    // Check new array field first
    const arrayMembers = project.assignedTeam?.[fieldConfig.arrayField];
    if (arrayMembers && Array.isArray(arrayMembers) && arrayMembers.length > 0) {
      return arrayMembers[0]._id || arrayMembers[0];
    }

    // Fall back to legacy field
    const legacyMember = project.assignedTeam?.[fieldConfig.legacyField];
    if (legacyMember) {
      return legacyMember._id || legacyMember;
    }

    return null;
  };

  // Helper function to get all team members for a role (for multiple testers support)
  const getAllMembers = (role) => {
    const roleFieldMap = {
      'content_writer': { arrayField: 'contentWriters', legacyField: 'contentWriter' },
      'graphic_designer': { arrayField: 'graphicDesigners', legacyField: 'graphicDesigner' },
      'video_editor': { arrayField: 'videoEditors', legacyField: 'videoEditor' },
      'ui_ux_designer': { arrayField: 'uiUxDesigners', legacyField: 'uiUxDesigner' },
      'developer': { arrayField: 'developers', legacyField: 'developer' },
      'tester': { arrayField: 'testers', legacyField: 'tester' }
    };

    const fieldConfig = roleFieldMap[role];
    if (!fieldConfig) return [];

    const members = [];

    // Check new array field first
    const arrayMembers = project.assignedTeam?.[fieldConfig.arrayField];
    if (arrayMembers && Array.isArray(arrayMembers) && arrayMembers.length > 0) {
      arrayMembers.forEach(member => {
        members.push(member._id || member);
      });
    }

    // Fall back to legacy field
    const legacyMember = project.assignedTeam?.[fieldConfig.legacyField];
    if (legacyMember && members.length === 0) {
      members.push(legacyMember._id || legacyMember);
    }

    return members;
  };

  // Get assigned team members
  const contentWriter = getFirstMember('content_writer');
  const graphicDesigner = getFirstMember('graphic_designer');
  const videoEditor = getFirstMember('video_editor');
  const testers = getAllMembers('tester'); // Support multiple testers

  // Get platforms array
  const platforms = creatives.platforms || [];

  // Generate image creative tasks
  if (creatives.imageCreatives > 0) {
    for (let i = 0; i < creatives.imageCreatives; i++) {
      const platform = platforms[i % platforms.length] || 'general';

      // Content writing task (first in workflow)
      if (contentWriter) {
        const contentTask = createTask({
          projectId,
          organizationId: project.organizationId,
          creativeStrategyId,
          adTypeKey: adType.typeKey,
          adTypeName: adType.typeName,
          taskType: 'content_creation',
          assetType: 'image_creative_content',
          creativeOutputType: 'image_creative',
          taskTitle: `${adType.typeName} - Content for Image ${i + 1}`,
          assignedRole: 'content_writer',
          assignedTo: contentWriter,
          strategyContext,
          contextLink,
          contextPdfUrl,
          platform,
          platforms,
          hook: creatives.hook,
          headline: creatives.headline,
          cta: creatives.cta,
          messagingAngle: creatives.messagingAngle,
          notes: creatives.notes,
          completedBy
        });
        contentTask.status = 'content_pending';
        tasks.push(contentTask);
      }

      // Design task (after content approved)
      const designTask = createTask({
        projectId,
        organizationId: project.organizationId,
        creativeStrategyId,
        adTypeKey: adType.typeKey,
        adTypeName: adType.typeName,
        taskType: 'graphic_design',
        assetType: 'image_creative',
        creativeOutputType: 'image_creative',
        taskTitle: `${adType.typeName} - Image Creative ${i + 1}`,
        assignedRole: 'graphic_designer',
        assignedTo: graphicDesigner,
        strategyContext,
        contextLink,
        contextPdfUrl,
        platform,
        platforms,
        hook: creatives.hook,
        headline: creatives.headline,
        cta: creatives.cta,
        messagingAngle: creatives.messagingAngle,
        notes: creatives.notes,
        completedBy
      });
      // Set initial status based on Content Planner presence
      designTask.status = contentWriter ? 'design_pending' : 'todo';
      if (contentWriter) {
        designTask.description = 'This task will become active after content is approved.';
      }
      tasks.push(designTask);
    }
  }

  // Generate video creative tasks
  if (creatives.videoCreatives > 0) {
    for (let i = 0; i < creatives.videoCreatives; i++) {
      const platform = platforms[i % platforms.length] || 'general';

      // Content writing task
      if (contentWriter) {
        const contentTask = createTask({
          projectId,
          organizationId: project.organizationId,
          creativeStrategyId,
          adTypeKey: adType.typeKey,
          adTypeName: adType.typeName,
          taskType: 'content_creation',
          assetType: 'video_creative_content',
          creativeOutputType: 'video_creative',
          taskTitle: `${adType.typeName} - Script for Video ${i + 1}`,
          assignedRole: 'content_writer',
          assignedTo: contentWriter,
          strategyContext,
          contextLink,
          contextPdfUrl,
          platform,
          platforms,
          hook: creatives.hook,
          headline: creatives.headline,
          cta: creatives.cta,
          messagingAngle: creatives.messagingAngle,
          notes: creatives.notes,
          completedBy
        });
        contentTask.status = 'content_pending';
        tasks.push(contentTask);
      }

      // Video editing task
      const videoTask = createTask({
        projectId,
        organizationId: project.organizationId,
        creativeStrategyId,
        adTypeKey: adType.typeKey,
        adTypeName: adType.typeName,
        taskType: 'video_editing',
        assetType: 'video_creative',
        creativeOutputType: 'video_creative',
        taskTitle: `${adType.typeName} - Video Creative ${i + 1}`,
        assignedRole: 'video_editor',
        assignedTo: videoEditor,
        strategyContext,
        contextLink,
        contextPdfUrl,
        platform,
        platforms,
        hook: creatives.hook,
        headline: creatives.headline,
        cta: creatives.cta,
        messagingAngle: creatives.messagingAngle,
        notes: creatives.notes,
        completedBy
      });
      videoTask.status = contentWriter ? 'design_pending' : 'todo';
      if (contentWriter) {
        videoTask.description = 'This task will become active after content is approved.';
      }
      tasks.push(videoTask);
    }
  }

  // Generate carousel creative tasks
  if (creatives.carouselCreatives > 0) {
    for (let i = 0; i < creatives.carouselCreatives; i++) {
      const platform = platforms[i % platforms.length] || 'general';

      // Content writing task
      if (contentWriter) {
        const contentTask = createTask({
          projectId,
          organizationId: project.organizationId,
          creativeStrategyId,
          adTypeKey: adType.typeKey,
          adTypeName: adType.typeName,
          taskType: 'content_creation',
          assetType: 'carousel_creative_content',
          creativeOutputType: 'carousel_creative',
          taskTitle: `${adType.typeName} - Content for Carousel ${i + 1}`,
          assignedRole: 'content_writer',
          assignedTo: contentWriter,
          strategyContext,
          contextLink,
          contextPdfUrl,
          platform,
          platforms,
          hook: creatives.hook,
          headline: creatives.headline,
          cta: creatives.cta,
          messagingAngle: creatives.messagingAngle,
          notes: creatives.notes,
          completedBy
        });
        contentTask.status = 'content_pending';
        tasks.push(contentTask);
      }

      // Design task
      const carouselTask = createTask({
        projectId,
        organizationId: project.organizationId,
        creativeStrategyId,
        adTypeKey: adType.typeKey,
        adTypeName: adType.typeName,
        taskType: 'graphic_design',
        assetType: 'carousel_creative',
        creativeOutputType: 'carousel_creative',
        taskTitle: `${adType.typeName} - Carousel Creative ${i + 1}`,
        assignedRole: 'graphic_designer',
        assignedTo: graphicDesigner,
        strategyContext,
        contextLink,
        contextPdfUrl,
        platform,
        platforms,
        hook: creatives.hook,
        headline: creatives.headline,
        cta: creatives.cta,
        messagingAngle: creatives.messagingAngle,
        notes: creatives.notes,
        completedBy,
        testerId: tester,
        marketerId: marketer
      });
      carouselTask.status = contentWriter ? 'design_pending' : 'todo';
      if (contentWriter) {
        carouselTask.description = 'This task will become active after content is approved by tester and marketer.';
      }
      tasks.push(carouselTask);
    }
  }

  return tasks;
}

/**
 * Generate tasks for landing page
 * Landing Page Workflow:
 * UI_UX_DESIGNER (design_pending) → TESTER reviews (design_submitted) → PERFORMANCE_MARKETER approves (design_approved)
 * → DEVELOPER (development_pending) → TESTER reviews (development_submitted) → PERFORMANCE_MARKETER approves (development_approved)
 * → Final approval (final_approved)
 */
function generateLandingPageTasks(landingPage, projectId, creativeStrategyId, strategyContext, project, completedBy, contextLink, contextPdfUrl) {
  const tasks = [];

  // Helper function to get first team member for a role (supports both array and legacy fields)
  const getFirstMember = (role) => {
    const roleFieldMap = {
      'ui_ux_designer': { arrayField: 'uiUxDesigners', legacyField: 'uiUxDesigner' },
      'developer': { arrayField: 'developers', legacyField: 'developer' },
      'tester': { arrayField: 'testers', legacyField: 'tester' },
      'performance_marketer': { arrayField: 'performanceMarketers', legacyField: 'performanceMarketer' }
    };

    const fieldConfig = roleFieldMap[role];
    if (!fieldConfig) return null;

    // Check new array field first
    const arrayMembers = project.assignedTeam?.[fieldConfig.arrayField];
    if (arrayMembers && Array.isArray(arrayMembers) && arrayMembers.length > 0) {
      return arrayMembers[0]._id || arrayMembers[0];
    }

    // Fall back to legacy field
    const legacyMember = project.assignedTeam?.[fieldConfig.legacyField];
    if (legacyMember) {
      return legacyMember._id || legacyMember;
    }

    return null;
  };

  // Helper function to get all team members for a role (supports multiple testers)
  const getAllMembers = (role) => {
    const roleFieldMap = {
      'ui_ux_designer': { arrayField: 'uiUxDesigners', legacyField: 'uiUxDesigner' },
      'developer': { arrayField: 'developers', legacyField: 'developer' },
      'tester': { arrayField: 'testers', legacyField: 'tester' },
      'performance_marketer': { arrayField: 'performanceMarketers', legacyField: 'performanceMarketer' }
    };

    const fieldConfig = roleFieldMap[role];
    if (!fieldConfig) return [];

    const members = [];

    // Check new array field first
    const arrayMembers = project.assignedTeam?.[fieldConfig.arrayField];
    if (arrayMembers && Array.isArray(arrayMembers) && arrayMembers.length > 0) {
      arrayMembers.forEach(member => {
        members.push(member._id || member);
      });
    }

    // Fall back to legacy field
    const legacyMember = project.assignedTeam?.[fieldConfig.legacyField];
    if (legacyMember && members.length === 0) {
      members.push(legacyMember._id || legacyMember);
    }

    return members;
  };

  // Get tester(s) and marketer from project team
  // Support landing-page-specific assignedTesters, otherwise use project-level testers
  let testerIds = [];
  if (landingPage.assignedTesters && Array.isArray(landingPage.assignedTesters) && landingPage.assignedTesters.length > 0) {
    // Use landing-page-specific testers
    testerIds = landingPage.assignedTesters.map(t => t._id || t);
  } else {
    // Fall back to project-level testers
    testerIds = getAllMembers('tester');
  }
  const marketerId = getFirstMember('performance_marketer');

  // Get UI/UX Designers - support both new array field and legacy single field
  let designerIds = [];
  if (landingPage.assignedDesigners && Array.isArray(landingPage.assignedDesigners) && landingPage.assignedDesigners.length > 0) {
    designerIds = landingPage.assignedDesigners.map(d => d._id || d);
  } else if (landingPage.assignedDesigner) {
    // Legacy single field
    designerIds = [landingPage.assignedDesigner._id || landingPage.assignedDesigner];
  } else {
    // Fall back to project-level designers
    designerIds = getAllMembers('ui_ux_designer');
  }

  // Get Developers - support both new array field and legacy single field
  let developerIds = [];
  if (landingPage.assignedDevelopers && Array.isArray(landingPage.assignedDevelopers) && landingPage.assignedDevelopers.length > 0) {
    developerIds = landingPage.assignedDevelopers.map(d => d._id || d);
  } else if (landingPage.assignedDeveloper) {
    // Legacy single field
    developerIds = [landingPage.assignedDeveloper._id || landingPage.assignedDeveloper];
  } else {
    // Fall back to project-level developers
    developerIds = getAllMembers('developer');
  }

  // Get Content Writers - from landing page or project
  let contentWriterIds = [];
  if (landingPage.assignedContentWriters && Array.isArray(landingPage.assignedContentWriters) && landingPage.assignedContentWriters.length > 0) {
    contentWriterIds = landingPage.assignedContentWriters.map(w => w._id || w);
  } else {
    contentWriterIds = getAllMembers('content_writer');
  }

  // Get Graphic Designers - from landing page or project
  let graphicDesignerIds = [];
  if (landingPage.assignedGraphicDesigners && Array.isArray(landingPage.assignedGraphicDesigners) && landingPage.assignedGraphicDesigners.length > 0) {
    graphicDesignerIds = landingPage.assignedGraphicDesigners.map(d => d._id || d);
  } else {
    graphicDesignerIds = getAllMembers('graphic_designer');
  }

  // Get Video Editors - from landing page or project
  let videoEditorIds = [];
  if (landingPage.assignedVideoEditors && Array.isArray(landingPage.assignedVideoEditors) && landingPage.assignedVideoEditors.length > 0) {
    videoEditorIds = landingPage.assignedVideoEditors.map(e => e._id || e);
  } else {
    videoEditorIds = getAllMembers('video_editor');
  }

  console.log(`\n=== Landing Page: ${landingPage.name || 'Unnamed'} ===`);
  console.log(`Assigned Designers: ${designerIds.length > 0 ? designerIds.join(', ') : 'Not assigned'}`);
  console.log(`Assigned Developers: ${developerIds.length > 0 ? developerIds.join(', ') : 'Not assigned'}`);
  console.log(`Content Writers: ${contentWriterIds.length > 0 ? contentWriterIds.join(', ') : 'Not assigned'}`);
  console.log(`Graphic Designers: ${graphicDesignerIds.length > 0 ? graphicDesignerIds.join(', ') : 'Not assigned'}`);
  console.log(`Video Editors: ${videoEditorIds.length > 0 ? videoEditorIds.join(', ') : 'Not assigned'}`);
  console.log(`Testers: ${testerIds.length > 0 ? testerIds.join(', ') : 'Not assigned'}`);
  console.log(`Marketer: ${marketerId || 'Not assigned'}`);

  const lpType = landingPage.type || landingPage.funnelType || 'video_sales_letter';
  const leadCaptureMethod = landingPage.leadCaptureMethod || landingPage.leadCapture?.method || 'form';

  // Create design tasks for each assigned designer
  // Flow: design_pending → design_submitted → (Tester reviews) → design_approved → (Marketer reviews) → development_pending
  for (const designerId of designerIds) {
    const designTask = createTask({
      projectId,
      organizationId: project.organizationId,
      landingPageId: landingPage._id,
      creativeStrategyId,
      taskType: 'landing_page_design',
      assetType: 'landing_page_design',
      taskTitle: `Design: ${landingPage.name || 'Landing Page'}`,
      assignedRole: 'ui_ux_designer',
      assignedTo: designerId,
      strategyContext: {
        ...strategyContext,
        funnelStage: lpType, // Landing page type (video_sales_letter, lead_generation, etc.)
        creativeType: 'landing_page_design',
        landingPageType: lpType,
        leadCapture: landingPage.leadCapture || null,
        leadCaptureMethod: leadCaptureMethod
      },
      contextLink,
      contextPdfUrl,
      landingPageType: lpType, // 'type' in LandingPage model
      leadCapture: landingPage.leadCapture, // Lead capture object
      headline: landingPage.headline,
      subheadline: landingPage.subheadline,
      cta: landingPage.ctaText, // 'ctaText' in LandingPage model
      hook: landingPage.hook,
      messagingAngle: landingPage.angle,
      platform: landingPage.platform,
      completedBy,
      testerIds: testerIds, // Testers for design review (array)
      marketerId: marketerId // Marketer for design approval
    });
    designTask.status = 'design_pending'; // Ready for UI/UX Designer to start
    tasks.push(designTask);
    console.log(`Created design task for designer: ${designerId}`);
  }

  // If no designers assigned, create an unassigned design task
  if (designerIds.length === 0) {
    const designTask = createTask({
      projectId,
      organizationId: project.organizationId,
      landingPageId: landingPage._id,
      creativeStrategyId,
      taskType: 'landing_page_design',
      assetType: 'landing_page_design',
      taskTitle: `Design: ${landingPage.name || 'Landing Page'}`,
      assignedRole: 'ui_ux_designer',
      assignedTo: null,
      strategyContext: {
        ...strategyContext,
        funnelStage: lpType,
        creativeType: 'landing_page_design',
        landingPageType: lpType,
        leadCapture: landingPage.leadCapture || null,
        leadCaptureMethod: leadCaptureMethod
      },
      contextLink,
      contextPdfUrl,
      landingPageType: lpType,
      leadCapture: landingPage.leadCapture,
      headline: landingPage.headline,
      subheadline: landingPage.subheadline,
      cta: landingPage.ctaText,
      hook: landingPage.hook,
      messagingAngle: landingPage.angle,
      platform: landingPage.platform,
      completedBy,
      testerIds: testerIds,
      marketerId: marketerId
    });
    designTask.status = 'design_pending';
    tasks.push(designTask);
    console.log('Created unassigned design task (no designers assigned)');
  }

  // Create development tasks for each assigned developer
  // Flow: development_pending → development_submitted → (Tester reviews) → development_approved → (Marketer approves) → final_approved
  // IMPORTANT: Developer is NOT assigned here. They will be assigned when design is approved.
  for (const developerId of developerIds) {
    const devTask = createTask({
      projectId,
      organizationId: project.organizationId,
      landingPageId: landingPage._id,
      creativeStrategyId,
      taskType: 'landing_page_development',
      assetType: 'landing_page_page',
      taskTitle: `Develop: ${landingPage.name || 'Landing Page'}`,
      assignedRole: 'developer',
      assignedTo: null, // Developer will be assigned when design is approved
      strategyContext: {
        ...strategyContext,
        funnelStage: lpType, // Landing page type (video_sales_letter, lead_generation, etc.)
        creativeType: 'landing_page_development',
        landingPageType: lpType,
        leadCapture: landingPage.leadCapture || null,
        leadCaptureMethod: leadCaptureMethod
      },
      contextLink,
      contextPdfUrl,
      landingPageType: lpType, // 'type' in LandingPage model
      leadCapture: landingPage.leadCapture, // Lead capture object
      completedBy,
      testerIds: testerIds, // Testers for development review (array)
      marketerId: marketerId, // Marketer for final approval
      parentTaskId: null // Will be linked to design task after saving
    });
    devTask.status = 'development_pending'; // Waiting for design to be approved
    devTask.description = 'This task will become active after the design is approved by the tester and marketer.';
    // Store developer ID for later assignment when design is approved
    devTask.developerId = developerId;
    tasks.push(devTask);
    console.log(`Created development task for developer: ${developerId}`);
  }

  // If no developers assigned, create an unassigned development task
  if (developerIds.length === 0) {
    const devTask = createTask({
      projectId,
      organizationId: project.organizationId,
      landingPageId: landingPage._id,
      creativeStrategyId,
      taskType: 'landing_page_development',
      assetType: 'landing_page_page',
      taskTitle: `Develop: ${landingPage.name || 'Landing Page'}`,
      assignedRole: 'developer',
      assignedTo: null,
      strategyContext: {
        ...strategyContext,
        funnelStage: lpType,
        creativeType: 'landing_page_development',
        landingPageType: lpType,
        leadCapture: landingPage.leadCapture || null,
        leadCaptureMethod: leadCaptureMethod
      },
      contextLink,
      contextPdfUrl,
      landingPageType: lpType,
      leadCapture: landingPage.leadCapture,
      completedBy,
      testerIds: testerIds,
      marketerId: marketerId,
      parentTaskId: null
    });
    devTask.status = 'development_pending';
    devTask.description = 'This task will become active after the design is approved by the tester and marketer.';
    tasks.push(devTask);
    console.log('Created unassigned development task (no developers assigned)');
  }

  return tasks;
}

/**
 * Update existing tasks when creative plan items are modified
 * This prevents duplicate tasks when name, role, or aiFramework changes
 */
async function updateExistingCreativePlanTasks(creativePlanItems, existingTasksByItemId, project, creativeStrategyId) {
  try {
    console.log('\n=== UPDATING EXISTING CREATIVE PLAN TASKS ===');

    // Helper function to get team member(s) for a role
    const getTeamMembersForRole = (role) => {
      const roleFieldMap = {
        'content_writer': { arrayField: 'contentWriters', legacyField: 'contentWriter' },
        'graphic_designer': { arrayField: 'graphicDesigners', legacyField: 'graphicDesigner' },
        'video_editor': { arrayField: 'videoEditors', legacyField: 'videoEditor' },
        'ui_ux_designer': { arrayField: 'uiUxDesigners', legacyField: 'uiUxDesigner' },
        'developer': { arrayField: 'developers', legacyField: 'developer' },
        'tester': { arrayField: 'testers', legacyField: 'tester' },
        'performance_marketer': { arrayField: 'performanceMarketers', legacyField: 'performanceMarketer' }
      };

      const fieldConfig = roleFieldMap[role];
      if (!fieldConfig) return null;

      // Check new array field first (preferred)
      const arrayMembers = project.assignedTeam?.[fieldConfig.arrayField];
      if (arrayMembers && Array.isArray(arrayMembers) && arrayMembers.length > 0) {
        return arrayMembers;
      }

      // Fall back to legacy field
      const legacyMember = project.assignedTeam?.[fieldConfig.legacyField];
      if (legacyMember) {
        return [legacyMember];
      }

      return null;
    };

    // Get default team members
    const defaultContentWriters = getTeamMembersForRole('content_writer');
    const defaultTesters = getTeamMembersForRole('tester');
    const defaultMarketer = getTeamMembersForRole('performance_marketer');

    // Get tester IDs (support multiple testers)
    let testerIds = [];
    if (defaultTesters && defaultTesters.length > 0) {
      testerIds = defaultTesters.map(t => t._id || t);
    }
    let marketerId = null;
    if (defaultMarketer && defaultMarketer.length > 0) {
      marketerId = defaultMarketer[0]._id || defaultMarketer[0];
    }

    let updatedCount = 0;

    for (const item of creativePlanItems) {
      const itemId = item._id.toString();
      const itemTasks = existingTasksByItemId.get(itemId);

      if (!itemTasks) continue;

      // Build updated task title
      const taskTitle = item.name || item.subType || item.adType || 'Creative';
      const creativeType = item.creativeType || item.category || 'IMAGE';

      // Determine design role based on creative type
      const designRoleForTask = creativeType === 'VIDEO' ? 'video_editor' : 'graphic_designer';

      // Get assigned team members from plan item
      let assignedTeamMemberIds = item.assignedTeamMembers || [];
      if (assignedTeamMemberIds && !Array.isArray(assignedTeamMemberIds)) {
        assignedTeamMemberIds = [assignedTeamMemberIds];
      }
      assignedTeamMemberIds = assignedTeamMemberIds
        .filter(id => id != null)
        .map(id => {
          if (typeof id === 'object' && id._id) return id._id.toString();
          return id.toString ? id.toString() : String(id);
        });

      // Resolve designer assignment
      const assignedRole = item.assignedRole || designRoleForTask;
      let designAssignedTo = null;
      let contentAssignedTo = null;

      // Get designer assignment
      if (assignedRole === 'graphic_designer') {
        const roleMembers = getTeamMembersForRole('graphic_designer');
        if (assignedTeamMemberIds.length > 0) {
          designAssignedTo = assignedTeamMemberIds[0];
        } else if (roleMembers && roleMembers.length > 0) {
          designAssignedTo = roleMembers[0]._id || roleMembers[0];
        }
      } else if (assignedRole === 'video_editor') {
        const roleMembers = getTeamMembersForRole('video_editor');
        if (assignedTeamMemberIds.length > 0) {
          designAssignedTo = assignedTeamMemberIds[0];
        } else if (roleMembers && roleMembers.length > 0) {
          designAssignedTo = roleMembers[0]._id || roleMembers[0];
        }
      }

      // Get content writer assignment - support both new array field and legacy single field
      let contentWriterIds = [];

      // First check for new array field
      if (item.contentWriters && Array.isArray(item.contentWriters) && item.contentWriters.length > 0) {
        contentWriterIds = item.contentWriters.map(w => {
          if (typeof w === 'object' && w._id) {
            return w._id.toString();
          }
          return w.toString ? w.toString() : String(w);
        });
        console.log(`Update: Using creative-specific contentWriters: ${contentWriterIds.join(', ')}`);
      } else if (item.contentWriter) {
        // Fall back to legacy single field
        const legacyWriter = item.contentWriter;
        const writerId = typeof legacyWriter === 'object' && legacyWriter._id
          ? legacyWriter._id.toString()
          : legacyWriter.toString ? legacyWriter.toString() : String(legacyWriter);
        contentWriterIds = [writerId];
        console.log(`Update: Using legacy contentWriter: ${writerId}`);
      } else if (defaultContentWriters && defaultContentWriters.length > 0) {
        // Fall back to project-level Content Planners
        contentWriterIds = defaultContentWriters.map(w => {
          if (typeof w === 'object' && w._id) {
            return w._id.toString();
          }
          return w.toString ? w.toString() : String(w);
        });
        console.log(`Update: Using project-level contentWriters: ${contentWriterIds.join(', ')}`);
      }

      // For backward compatibility with single content task, use first writer
      if (contentWriterIds.length > 0) {
        contentAssignedTo = contentWriterIds[0];
      }

      // Handle assignedTesters from creative plan - use creative-specific testers if available
      let creativeTesters = [];
      if (item.assignedTesters && Array.isArray(item.assignedTesters) && item.assignedTesters.length > 0) {
        // Use creative-specific testers
        creativeTesters = item.assignedTesters.map(t => {
          if (typeof t === 'object' && t._id) {
            return t._id.toString();
          }
          return t.toString ? t.toString() : String(t);
        });
        console.log(`Update: Using creative-specific testers: ${creativeTesters.join(', ')}`);
      } else {
        // Fall back to project-level testers
        creativeTesters = testerIds;
        console.log(`Update: Using project-level testers: ${creativeTesters.join(', ')}`);
      }

      const platformStr = (item.platforms || []).join(', ');
      const screenSizesStr = (item.screenSizes || []).join(', ');

      // Update content task if exists
      if (itemTasks.contentTask) {
        const contentTask = await Task.findById(itemTasks.contentTask._id);
        if (contentTask) {
          // Update fields that may have changed
          contentTask.taskTitle = `Content: ${taskTitle}`;
          contentTask.strategyContext = {
            ...contentTask.strategyContext,
            creativeType: item.subType || item.adType || taskTitle,
            creativeCategory: creativeType,
            platforms: item.platforms || [],
            notes: item.notes || ''
          };
          contentTask.contentFramework = item.aiFramework || '';
          contentTask.contentSubCategory = item.aiSubCategory || '';
          contentTask.aiFramework = item.aiFramework || '';
          contentTask.platform = platformStr;
          contentTask.notes = item.notes || '';
          contentTask.objective = item.objective || '';

          // Update assignment if changed
          if (contentAssignedTo && contentTask.assignedTo?.toString() !== contentAssignedTo) {
            console.log(`Updating content task assignment from ${contentTask.assignedTo} to ${contentAssignedTo}`);
            contentTask.assignedTo = contentAssignedTo;
          }

          // Update testers/marketer if changed - use creative-specific testers
          if (creativeTesters.length > 0) {
            contentTask.testerIds = creativeTesters;
            console.log(`Updated content task testers to: ${creativeTesters.join(', ')}`);
          }
          if (marketerId) contentTask.marketerId = marketerId;

          await contentTask.save();
          updatedCount++;
          console.log(`Updated content task for "${taskTitle}"`);
        }
      }

      // Update design task if exists
      if (itemTasks.designTask) {
        const designTask = await Task.findById(itemTasks.designTask._id);
        if (designTask) {
          // Update fields that may have changed
          designTask.taskTitle = taskTitle;
          designTask.strategyContext = {
            ...designTask.strategyContext,
            creativeType: item.subType || item.adType || taskTitle,
            creativeCategory: creativeType,
            platforms: item.platforms || [],
            notes: item.notes || ''
          };
          designTask.aiFramework = item.aiFramework || '';
          designTask.platform = platformStr;
          designTask.notes = item.notes || '';
          designTask.objective = item.objective || '';

          // Update designer assignment (stored in designerId field, assigned when content is approved)
          if (designAssignedTo) {
            designTask.designerId = designAssignedTo;
          }

          // Update testers/marketer if changed - use creative-specific testers
          if (creativeTesters.length > 0) {
            designTask.testerIds = creativeTesters;
            console.log(`Updated design task testers to: ${creativeTesters.join(', ')}`);
          }
          if (marketerId) designTask.marketerId = marketerId;

          await designTask.save();
          updatedCount++;
          console.log(`Updated design task for "${taskTitle}"`);
        }
      }
    }

    console.log(`=== Updated ${updatedCount} existing tasks ===\n`);
    return updatedCount;
  } catch (error) {
    console.error('Error updating existing creative plan tasks:', error);
    return 0;
  }
}

/**
 * Generate tasks from the new creative plan structure
 * Each creative plan item creates a content task and a design/edit task
 */
async function generateCreativePlanTasks(creativePlan, projectId, creativeStrategyId, strategyContext, project, completedBy, contextLink, contextPdfUrl) {
  const tasks = [];

  // Helper function to get team member(s) for a role
  // Supports both new array fields and legacy single fields
  const getTeamMembersForRole = (role) => {
    const roleFieldMap = {
      'content_writer': { arrayField: 'contentWriters', legacyField: 'contentWriter' },
      'graphic_designer': { arrayField: 'graphicDesigners', legacyField: 'graphicDesigner' },
      'video_editor': { arrayField: 'videoEditors', legacyField: 'videoEditor' },
      'ui_ux_designer': { arrayField: 'uiUxDesigners', legacyField: 'uiUxDesigner' },
      'developer': { arrayField: 'developers', legacyField: 'developer' },
      'tester': { arrayField: 'testers', legacyField: 'tester' },
      'performance_marketer': { arrayField: 'performanceMarketers', legacyField: 'performanceMarketer' }
    };

    const fieldConfig = roleFieldMap[role];
    if (!fieldConfig) return null;

    // Check new array field first (preferred)
    const arrayMembers = project.assignedTeam?.[fieldConfig.arrayField];
    if (arrayMembers && Array.isArray(arrayMembers) && arrayMembers.length > 0) {
      return arrayMembers; // Return array of user objects
    }

    // Fall back to legacy field
    const legacyMember = project.assignedTeam?.[fieldConfig.legacyField];
    if (legacyMember) {
      return [legacyMember]; // Return as array for consistency
    }

    return null;
  };

  // Get default team members from project assignment
  const defaultContentWriters = getTeamMembersForRole('content_writer');
  const defaultGraphicDesigners = getTeamMembersForRole('graphic_designer');
  const defaultVideoEditors = getTeamMembersForRole('video_editor');
  const defaultTesters = getTeamMembersForRole('tester');
  const defaultMarketer = getTeamMembersForRole('performance_marketer');

  // Get tester IDs (support multiple testers) - with organization validation
  let testerIds = [];
  if (defaultTesters && defaultTesters.length > 0) {
    for (const tester of defaultTesters) {
      const potentialTesterId = tester._id || tester;
      // Verify tester belongs to the project's organization
      const isValidTester = await verifyUserBelongsToOrg(potentialTesterId, project.organizationId);
      if (isValidTester) {
        testerIds.push(potentialTesterId);
      } else {
        console.warn(`WARNING: Tester ${potentialTesterId} does not belong to organization ${project.organizationId}. Skipping tester assignment.`);
      }
    }
  }

  // Get performance marketer ID (single marketer per project) - with organization validation
  let marketerId = null;
  if (defaultMarketer && defaultMarketer.length > 0) {
    const potentialMarketerId = defaultMarketer[0]._id || defaultMarketer[0];
    // Verify marketer belongs to the project's organization
    const isValidMarketer = await verifyUserBelongsToOrg(potentialMarketerId, project.organizationId);
    if (isValidMarketer) {
      marketerId = potentialMarketerId;
    } else {
      console.warn(`WARNING: Marketer ${potentialMarketerId} does not belong to organization ${project.organizationId}. Skipping marketer assignment.`);
    }
  }

  console.log('Team assignments for task generation:', {
    contentWriters: defaultContentWriters?.map(m => m?._id || m),
    graphicDesigners: defaultGraphicDesigners?.map(m => m?._id || m),
    videoEditors: defaultVideoEditors?.map(m => m?._id || m),
    testers: testerIds,
    marketer: marketerId,
    organizationId: project.organizationId
  });

  // Creative type to task type mapping - determines which design role receives the task
  const creativeTypeTaskMap = {
    'IMAGE': { contentTask: 'content_creation', designTask: 'graphic_design', assetType: 'image_creative', creativeOutputType: 'image_creative' },
    'VIDEO': { contentTask: 'content_creation', designTask: 'video_editing', assetType: 'video_creative', creativeOutputType: 'video_creative' },
    'CAROUSEL': { contentTask: 'content_creation', designTask: 'graphic_design', assetType: 'carousel_creative', creativeOutputType: 'carousel_creative' }
  };

  // Legacy category to task type mapping (for backward compatibility)
  const categoryTaskTypeMap = {
    'IMAGE': { contentTask: 'content_creation', designTask: 'graphic_design', assetType: 'image_creative', creativeOutputType: 'image_creative' },
    'VIDEO': { contentTask: 'content_creation', designTask: 'video_editing', assetType: 'video_creative', creativeOutputType: 'video_creative' },
    'CAROUSEL': { contentTask: 'content_creation', designTask: 'graphic_design', assetType: 'carousel_creative', creativeOutputType: 'carousel_creative' },
    'UGC': { contentTask: 'content_creation', designTask: 'video_editing', assetType: 'ugc_content', creativeOutputType: 'ugc_content' },
    'TESTIMONIAL': { contentTask: 'content_creation', designTask: 'video_editing', assetType: 'testimonial_content', creativeOutputType: 'testimonial_content' },
    'DEMO_EXPLAINER': { contentTask: 'content_creation', designTask: 'video_editing', assetType: 'demo_video', creativeOutputType: 'demo_video' },
    'OFFER_SALES': { contentTask: 'content_creation', designTask: 'graphic_design', assetType: 'offer_creative', creativeOutputType: 'offer_creative' }
  };

  for (let i = 0; i < creativePlan.length; i++) {
    const planItem = creativePlan[i];

    console.log(`\n=== Processing creative plan item ${i + 1} ===`);
    console.log(`Name: ${planItem.name}`);
    console.log(`Creative Type: ${planItem.creativeType}`);
    console.log(`Sub Type: ${planItem.subType}`);
    console.log(`Objective: ${planItem.objective}`);
    console.log(`Assigned Role: ${planItem.assignedRole}`);
    console.log(`Assigned Team Members (raw): ${JSON.stringify(planItem.assignedTeamMembers)}`);
    console.log(`Notes: ${planItem.notes}`);

    // Determine creative type from new field or legacy category
    const creativeType = planItem.creativeType || planItem.category || 'IMAGE';

    // Get task configuration - use new creativeType mapping first, fall back to legacy category mapping
    let taskConfig = creativeTypeTaskMap[creativeType];
    if (!taskConfig) {
      taskConfig = categoryTaskTypeMap[creativeType] || categoryTaskTypeMap['IMAGE'];
    }

    const platformStr = (planItem.platforms || []).join(', ');
    const screenSizesStr = (planItem.screenSizes || []).join(', ');

    // Build task title from name or subType
    const taskTitle = planItem.name || planItem.subType || planItem.adType || `Creative ${i + 1}`;

    // Get assigned role and team members from the plan item
    // These were set by the Performance Marketer using the Admin's assignment
    const assignedRole = planItem.assignedRole || (creativeType === 'VIDEO' ? 'video_editor' : 'graphic_designer');

    // Handle assignedTeamMembers - could be array of ObjectIds, strings, or populated user objects
    let assignedTeamMemberIds = planItem.assignedTeamMembers || [];

    // Normalize to array of string IDs
    if (assignedTeamMemberIds && !Array.isArray(assignedTeamMemberIds)) {
      assignedTeamMemberIds = [assignedTeamMemberIds];
    }
    assignedTeamMemberIds = assignedTeamMemberIds
      .filter(id => id != null)
      .map(id => {
        // Handle ObjectId, string, or populated user object
        if (typeof id === 'object' && id._id) {
          return id._id.toString();
        }
        return id.toString ? id.toString() : String(id);
      });

    console.log(`Assigned Role: ${assignedRole}`);
    console.log(`Assigned Team Member IDs (normalized): ${JSON.stringify(assignedTeamMemberIds)}`);

    // Resolve team member IDs to actual user objects
    // The assignedTeamMembers contains user IDs that were set from project.assignedTeam
    let designAssignedTo = null;
    let contentAssignedTo = null;

    // For design/edit task - use the assigned role's team members
    if (assignedRole === 'content_writer') {
      const roleMembers = getTeamMembersForRole('content_writer');
      console.log(`Role members for content_writer:`, roleMembers?.map(m => m?._id || m));
      if (assignedTeamMemberIds.length > 0) {
        // Use the assigned team member IDs directly (they're already user IDs)
        designAssignedTo = assignedTeamMemberIds[0];
        console.log(`Using assignedTeamMember for content_writer: ${designAssignedTo}`);
      } else if (roleMembers && roleMembers.length > 0) {
        designAssignedTo = roleMembers[0]._id || roleMembers[0];
        console.log(`Using default content_writer: ${designAssignedTo}`);
      } else {
        console.log(`No content_writer available for assignment`);
      }
    } else if (assignedRole === 'graphic_designer') {
      const roleMembers = getTeamMembersForRole('graphic_designer');
      console.log(`Role members for graphic_designer:`, roleMembers?.map(m => m?._id || m));
      if (assignedTeamMemberIds.length > 0) {
        designAssignedTo = assignedTeamMemberIds[0];
        console.log(`Using assignedTeamMember for graphic_designer: ${designAssignedTo}`);
      } else if (roleMembers && roleMembers.length > 0) {
        designAssignedTo = roleMembers[0]._id || roleMembers[0];
        console.log(`Using default graphic_designer: ${designAssignedTo}`);
      } else {
        console.log(`No graphic_designer available for assignment`);
      }
    } else if (assignedRole === 'video_editor') {
      const roleMembers = getTeamMembersForRole('video_editor');
      console.log(`Role members for video_editor:`, roleMembers?.map(m => m?._id || m));
      if (assignedTeamMemberIds.length > 0) {
        designAssignedTo = assignedTeamMemberIds[0];
        console.log(`Using assignedTeamMember for video_editor: ${designAssignedTo}`);
      } else if (roleMembers && roleMembers.length > 0) {
        designAssignedTo = roleMembers[0]._id || roleMembers[0];
        console.log(`Using default video_editor: ${designAssignedTo}`);
      } else {
        console.log(`No video_editor available for assignment`);
      }
    }

    // For content task - use contentWriters array from creative plan if specified, otherwise use project-level Content Planners
    // Support both new array field (contentWriters) and legacy single field (contentWriter)
    let contentWriterIds = [];

    // First check for new array field
    if (planItem.contentWriters && Array.isArray(planItem.contentWriters) && planItem.contentWriters.length > 0) {
      contentWriterIds = planItem.contentWriters.map(w => {
        if (typeof w === 'object' && w._id) {
          return w._id.toString();
        }
        return w.toString ? w.toString() : String(w);
      });
      console.log(`Creative-specific contentWriters: ${contentWriterIds.join(', ')}`);
    } else if (planItem.contentWriter) {
      // Fall back to legacy single field
      const legacyWriter = planItem.contentWriter;
      const writerId = typeof legacyWriter === 'object' && legacyWriter._id
        ? legacyWriter._id.toString()
        : legacyWriter.toString ? legacyWriter.toString() : String(legacyWriter);
      contentWriterIds = [writerId];
      console.log(`Using legacy contentWriter: ${writerId}`);
    } else if (defaultContentWriters && defaultContentWriters.length > 0) {
      // Fall back to project-level Content Planners
      contentWriterIds = defaultContentWriters.map(w => {
        if (typeof w === 'object' && w._id) {
          return w._id.toString();
        }
        return w.toString ? w.toString() : String(w);
      });
      console.log(`Using project-level contentWriters: ${contentWriterIds.join(', ')}`);
    } else {
      console.log(`No content_writer available`);
    }

    // Handle assignedTesters from creative plan - support multiple testers per creative
    let creativeTesters = [];
    if (planItem.assignedTesters && Array.isArray(planItem.assignedTesters) && planItem.assignedTesters.length > 0) {
      // Use creative-specific testers
      creativeTesters = planItem.assignedTesters.map(t => {
        if (typeof t === 'object' && t._id) {
          return t._id.toString();
        }
        return t.toString ? t.toString() : String(t);
      });
      console.log(`Creative-specific testers: ${creativeTesters.join(', ')}`);
    } else {
      // Fall back to project-level testers
      creativeTesters = testerIds;
    }

    // Content writing task (first in workflow) - assigned to content_writer(s)
    // Flow: content_pending → content_submitted → (Tester reviews) → content_final_approved → Designer gets assigned
    // Create a content task for EACH content writer in the array
    for (const writerId of contentWriterIds) {
      const contentTask = createTask({
        projectId,
        organizationId: project.organizationId,
        creativeStrategyId,
        creativePlanItemId: planItem._id, // Link to creative plan item for updates
        taskType: taskConfig.contentTask,
        assetType: `${taskConfig.assetType}_content`,
        creativeOutputType: taskConfig.creativeOutputType,
        taskTitle: `Content: ${taskTitle}`,
        assignedRole: 'content_writer',
        assignedTo: writerId,
        strategyContext,
        contextLink,
        contextPdfUrl,
        platform: platformStr,
        platforms: planItem.platforms || [],
        screenSizes: screenSizesStr,
        notes: planItem.notes || '',
        creativeType: planItem.subType || planItem.adType || taskTitle,
        creativeCategory: creativeType,
        objective: planItem.objective || '',
        completedBy,
        testerIds: creativeTesters, // Testers for content review (array)
        marketerId: marketerId, // Marketer for content approval
        contentFramework: planItem.aiFramework || '', // Framework for content planner
        contentSubCategory: planItem.aiSubCategory || '', // Subcategory for content planner
        aiFramework: planItem.aiFramework || '' // AI Framework for all roles
      });
      contentTask.status = 'content_pending';
      tasks.push(contentTask);
      console.log(`Created content task assigned to: ${writerId}, testers: ${creativeTesters.join(', ')}, marketer: ${marketerId}`);
    }

    // Design/Edit task - assigned based on creative type or specified role
    // For VIDEO: video_editor, For IMAGE/CAROUSEL: graphic_designer
    // IMPORTANT: Designer is NOT assigned yet. Will be assigned when content is approved.
    // Flow: design_pending → (wait for content_final_approved) → designer assigned → design_submitted → (Tester reviews) → design_approved → (Marketer approves) → final_approved
    const designRoleForTask = creativeType === 'VIDEO' ? 'video_editor' : 'graphic_designer';

    // Get the content task to link as parent (design depends on content being approved)
    const lastContentTask = tasks.length > 0 && tasks[tasks.length - 1].taskType === 'content_creation'
      ? tasks[tasks.length - 1]
      : null;

    const designTask = createTask({
      projectId,
      organizationId: project.organizationId,
      creativeStrategyId,
      creativePlanItemId: planItem._id, // Link to creative plan item for updates
      taskType: taskConfig.designTask,
      assetType: taskConfig.assetType,
      creativeOutputType: taskConfig.creativeOutputType,
      taskTitle: taskTitle,
      assignedRole: designRoleForTask,
      assignedTo: null, // Designer will be assigned when content is approved by tester
      strategyContext,
      contextLink,
      contextPdfUrl,
      platform: platformStr,
      platforms: planItem.platforms || [],
      screenSizes: screenSizesStr,
      notes: planItem.notes || '',
      creativeType: planItem.subType || planItem.adType || taskTitle,
      creativeCategory: creativeType,
      objective: planItem.objective || '',
      completedBy,
      testerIds: creativeTesters, // Testers for design/video review (array)
      marketerId: marketerId, // Marketer for final approval
      aiFramework: planItem.aiFramework || '' // AI Framework for designers/editors
    });
    designTask.status = 'design_pending';
    designTask.description = 'This task will become active after content is approved by the tester.';

    // Store the intended designer for later assignment when content is approved
    if (designAssignedTo) {
      designTask.designerId = designAssignedTo;
    }

    // Note: parentTaskId will be set after tasks are saved, to link design to content
    tasks.push(designTask);

    console.log(`Created design task (designer will be assigned after content approval). Intended designer: ${designAssignedTo}, testers: ${creativeTesters.join(', ')}, marketer: ${marketerId}`);
  }

  console.log(`Generated ${tasks.length} tasks from creative plan with ${creativePlan.length} items`);
  return tasks;
}

/**
 * Create a task object
 */
function createTask({
  projectId,
  organizationId,
  creativeStrategyId = null,
  creativePlanItemId = null,
  landingPageId = null,
  adTypeKey = null,
  adTypeName = null,
  taskType,
  assetType,
  creativeOutputType = null,
  taskTitle,
  assignedRole,
  assignedTo,
  strategyContext,
  contextLink = '',
  contextPdfUrl = '',
  platform = '',
  platforms = [],
  screenSizes = '',
  hook = '',
  headline = '',
  cta = '',
  messagingAngle = '',
  notes = '',
  creativeType = '',
  creativeCategory = '',
  objective = '',
  landingPageType = '',
  leadCapture = null,
  completedBy,
  testerIds = [],
  marketerId = null,
  parentTaskId = null,
  contentFramework = '',
  contentSubCategory = '',
  aiFramework = ''
}) {
  // Generate AI prompt based on strategy context
  const aiPrompt = generateAIPrompt(taskType, assetType, {
    strategyContext,
    platforms,
    hook,
    headline,
    cta,
    messagingAngle,
    notes,
    landingPageType,
    leadCapture
  });

  const task = {
    projectId,
    organizationId,
    taskType,
    assetType,
    creativeOutputType,
    taskTitle,
    assignedRole,
    assignedTo: assignedTo || null,
    assignedBy: completedBy,
    createdBy: completedBy,
    status: Task.getInitialStatus(taskType),
    description: generateTaskDescription(taskType, assetType, strategyContext),
    aiPrompt,
    sopReference: SOP_REFERENCES[taskType] || '',
    contextLink,
    contextPdfUrl,
    strategyContext: {
      // Business context
      businessName: strategyContext.businessName,
      industry: strategyContext.industry,

      // Creative identification
      funnelStage: adTypeKey || objective, // awareness, consideration, conversion, etc. OR campaign objective
      creativeType: assetType, // image_creative, video_creative, etc.
      platform: platform, // Primary platform for this task
      platforms: platforms, // All applicable platforms
      screenSizes: screenSizes, // Screen sizes for this creative

      // Creative brief content
      hook: hook || '',
      creativeAngle: messagingAngle || '',
      messaging: messagingAngle || '',
      headline: headline || '',
      cta: cta || '',

      // Target audience
      targetAudience: `${strategyContext.targetAudience?.ageRange || ''} ${strategyContext.targetAudience?.profession || ''}`.trim(),
      painPoints: strategyContext.painPoints || [],
      desires: strategyContext.desires || [],

      // Offer information
      offer: strategyContext.valueProposition || '',

      // Landing page specific
      landingPageType: landingPageType || '',
      leadCapture: leadCapture || null,
      leadCaptureMethod: leadCapture?.method || '',

      // Additional context
      notes: notes || '',
      adTypeKey: adTypeKey,
      adTypeName: adTypeName,

      // Creative plan fields
      creativeType: creativeType || adTypeName || '',
      creativeCategory: creativeCategory || ''
    },
    dueDate: calculateDueDate(taskType)
  };

  if (creativeStrategyId) {
    task.creativeStrategyId = creativeStrategyId;
    task.adTypeKey = adTypeKey;
  }

  if (creativePlanItemId) {
    task.creativePlanItemId = creativePlanItemId;
  }

  if (landingPageId) {
    task.landingPageId = landingPageId;
  }

  if (creativeOutputType) {
    task.creativeOutputType = creativeOutputType;
  }

  // Assign testers for review workflow (support multiple testers)
  if (testerIds && testerIds.length > 0) {
    task.testerIds = testerIds;
  }

  // Assign performance marketer for final approval
  if (marketerId) {
    task.marketerId = marketerId;
  }

  // Set content framework and subcategory for content writer tasks
  if (contentFramework) {
    task.contentFramework = contentFramework;
  }
  if (contentSubCategory) {
    task.contentSubCategory = contentSubCategory;
  }

  // Set AI framework for all task types (content_writer, graphic_designer, video_editor)
  if (aiFramework) {
    task.aiFramework = aiFramework;
  }

  // Set parent task dependency
  if (parentTaskId) {
    task.parentTaskId = parentTaskId;
  }

  return task;
}

/**
 * Generate AI prompt for creative brief
 */
function generateAIPrompt(taskType, assetType, context) {
  const { strategyContext, platforms, hook, headline, cta, messagingAngle, notes, landingPageType, leadCapture } = context;

  if (taskType === 'landing_page_design') {
    return `Create a landing page design for ${strategyContext.businessName || 'a business'} in the ${strategyContext.industry || 'specified'} industry.

TARGET AUDIENCE:
${strategyContext.targetAudience?.ageRange ? `Age Range: ${strategyContext.targetAudience.ageRange}` : ''}
${strategyContext.targetAudience?.profession ? `Profession: ${strategyContext.targetAudience.profession}` : ''}
${strategyContext.targetAudience?.interests?.length ? `Interests: ${strategyContext.targetAudience.interests.join(', ')}` : ''}

PAIN POINTS TO ADDRESS:
${strategyContext.painPoints?.length ? strategyContext.painPoints.map(p => `- ${p}`).join('\n') : 'Address customer challenges'}

DESIRES & GOALS:
${strategyContext.desires?.length ? strategyContext.desires.map(d => `- ${d}`).join('\n') : 'Help customers achieve their goals'}

OFFER & VALUE PROPOSITION:
${strategyContext.offer || 'Create compelling value'}

LANDING PAGE TYPE: ${landingPageType || 'video_sales_letter'}
${leadCapture?.method ? `LEAD CAPTURE METHOD: ${leadCapture.method}` : ''}
${headline ? `HEADLINE: ${headline}` : ''}
${cta ? `CALL-TO-ACTION: ${cta}` : ''}

${messagingAngle ? `MESSAGING ANGLE: ${messagingAngle}` : ''}

Design a landing page that converts. Focus on clear hierarchy, compelling visuals, and a strong call-to-action.`;
  }

  if (taskType === 'landing_page_development') {
    return `Develop a landing page for ${strategyContext.businessName || 'a business'}.

LANDING PAGE TYPE: ${landingPageType || 'video_sales_letter'}
${leadCapture?.method ? `LEAD CAPTURE INTEGRATION: ${leadCapture.method}` : ''}

Ensure responsive design, fast loading times, and proper integration with:
- Lead capture forms
- Email marketing tools
- Analytics tracking

Focus on conversion optimization and user experience.`;
  }

  // Default for creative tasks
  return `Create a ${assetType?.replace(/_/g, ' ') || 'creative asset'} for ${strategyContext.businessName || 'a business'} in the ${strategyContext.industry || 'specified'} industry.

TARGET AUDIENCE:
${strategyContext.targetAudience?.ageRange ? `Age Range: ${strategyContext.targetAudience.ageRange}` : ''}
${strategyContext.targetAudience?.profession ? `Profession: ${strategyContext.targetAudience.profession}` : ''}

KEY PAIN POINTS:
${strategyContext.painPoints?.slice(0, 3).map(p => `- ${p}`).join('\n') || 'Understand customer challenges'}

CUSTOMER DESIRES:
${strategyContext.desires?.slice(0, 3).map(d => `- ${d}`).join('\n') || 'Help customers achieve their goals'}

VALUE PROPOSITION:
${strategyContext.offer || 'Create compelling value'}

${messagingAngle ? `MESSAGING ANGLE: ${messagingAngle}` : ''}
${hook ? `HOOK: ${hook}` : ''}
${headline ? `HEADLINE: ${headline}` : ''}
${cta ? `CALL-TO-ACTION: ${cta}` : ''}

${platforms?.length ? `PLATFORMS: ${platforms.join(', ')}` : ''}

${notes ? `ADDITIONAL NOTES: ${notes}` : ''}

Create engaging, on-brand creative that drives action while maintaining brand consistency.`;
}

/**
 * Generate task description
 */
function generateTaskDescription(taskType, assetType, strategyContext) {
  const businessName = strategyContext.businessName || 'the project';
  const industry = strategyContext.industry ? ` in the ${strategyContext.industry} industry` : '';

  switch (taskType) {
    case 'graphic_design':
      return `Design ${assetType?.replace(/_/g, ' ')} assets for ${businessName}${industry}. Follow the brand guidelines and creative brief provided.`;
    case 'video_editing':
      return `Create video content for ${businessName}${industry}. Focus on engagement and conversions while maintaining brand consistency.`;
    case 'landing_page_design':
      return `Design the landing page for ${businessName}${industry}. Focus on conversion optimization and user experience.`;
    case 'landing_page_development':
      return `Develop the landing page for ${businessName}${industry}. Ensure responsive design and integration with marketing tools.`;
    case 'content_writing':
      return `Write compelling content for ${businessName}${industry}. Follow the messaging strategy and brand voice.`;
    default:
      return `Complete the ${taskType?.replace(/_/g, ' ')} task for ${businessName}.`;
  }
}

/**
 * Calculate due date based on task type
 */
function calculateDueDate(taskType) {
  const daysToAdd = {
    graphic_design: 3,
    video_editing: 5,
    landing_page_design: 5,
    landing_page_development: 7,
    content_writing: 2
  };

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (daysToAdd[taskType] || 3));
  return dueDate;
}

/**
 * Send task assignment notifications (in-app + email)
 */
async function sendTaskAssignmentNotifications(tasks, project) {
  console.log('=== sendTaskAssignmentNotifications called ===');
  console.log('Tasks count:', tasks.length);
  console.log('Project:', project.projectName || project.businessName);

  const tasksByUser = {};

  // Group tasks by assigned user
  for (const task of tasks) {
    if (task.assignedTo) {
      if (!tasksByUser[task.assignedTo]) {
        tasksByUser[task.assignedTo] = [];
      }
      tasksByUser[task.assignedTo].push(task);
    }
  }

  console.log('Users with assigned tasks:', Object.keys(tasksByUser).length);

  // Send notifications and emails
  for (const [userId, userTasks] of Object.entries(tasksByUser)) {
    const taskCount = userTasks.length;
    const projectDisplay = project.projectName || project.businessName;

    // Create in-app notification
    await Notification.create({
      recipient: userId,
      type: 'task_assigned',
      title: 'New Tasks Assigned',
      message: `You have been assigned ${taskCount} new task${taskCount > 1 ? 's' : ''} for project "${projectDisplay}".`,
      projectId: project._id,
      organizationId: project.organizationId
    });

    // Send email notification for each task
    try {
      const assignedUser = await User.findById(userId).select('name email');
      if (assignedUser && assignedUser.email) {
        console.log(`Sending task assignment email to ${assignedUser.email} for ${taskCount} task(s)`);

        // Send email for each task
        for (const task of userTasks) {
          // Get user who completed the creative strategy (for "assignedBy")
          const completedByUser = task.assignedBy ? await User.findById(task.assignedBy).select('name email') : null;

          await emailService.sendTaskAssignmentNotification(
            task,
            project,
            assignedUser,
            completedByUser || { name: 'System' }
          ).catch(err => console.error(`Failed to send task email to ${assignedUser.email}:`, err.message));
        }
      }
    } catch (emailError) {
      console.error('Error sending task assignment email:', emailError.message);
      // Don't throw - email failures should not block the operation
    }
  }

  console.log('=== sendTaskAssignmentNotifications completed ===');
}

/**
 * Get all tasks for a project
 */
async function getTasksByProject(projectId, filters = {}) {
  const query = { projectId };

  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.taskType) {
    query.taskType = filters.taskType;
  }
  if (filters.assignedTo) {
    query.assignedTo = filters.assignedTo;
  }
  if (filters.assignedRole) {
    query.assignedRole = filters.assignedRole;
  }

  const tasks = await Task.find(query)
    .populate('assignedTo', 'name email role')
    .populate('assignedBy', 'name email')
    .populate('reviewedBy', 'name email')
    .populate('testerReviewedBy', 'name email')
    .populate('marketerApprovedBy', 'name email')
    .populate('testerId', 'name email role')
    .populate('marketerId', 'name email role')
    .populate('parentTaskId', 'taskTitle status')
    .sort({ createdAt: -1 });

  return tasks;
}

/**
 * Get tasks for a user by role
 */
async function getTasksByUser(userId, role, filters = {}) {
  const query = { assignedTo: userId };

  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.taskType) {
    query.taskType = filters.taskType;
  }

  const tasks = await Task.find(query)
    .populate('projectId', 'projectName businessName')
    .populate('assignedBy', 'name email')
    .sort({ priority: -1, dueDate: 1 });

  return tasks;
}

/**
 * Update task status and handle workflow transitions
 */
async function updateTaskStatus(taskId, newStatus, userId, notes = '') {
  const task = await Task.findById(taskId);

  if (!task) {
    throw new Error('Task not found');
  }

  const oldStatus = task.status;
  task.status = newStatus;
  task.addRevision(userId, notes, oldStatus, newStatus);

  // Update timestamps based on status
  if (newStatus === 'in_progress' && !task.startedAt) {
    task.startedAt = new Date();
  }
  if (newStatus === 'submitted' || newStatus === 'design_submitted' || newStatus === 'development_submitted') {
    task.submittedAt = new Date();
  }
  if (newStatus === 'final_approved') {
    task.completedAt = new Date();
  }
  if (newStatus === 'rejected') {
    task.rejectionNote = notes;
    task.reviewedAt = new Date();
  }

  await task.save();
  return task;
}

/**
 * Link design/video tasks to their parent content tasks
 * This ensures approved content can be passed from content task to design task
 */
async function linkContentToDesignTasks(savedTasks, projectId) {
  try {
    // Find all content creation tasks
    const contentTasks = savedTasks.filter(t => t.taskType === 'content_creation');

    if (contentTasks.length === 0) {
      console.log('No content tasks to link');
      return;
    }

    console.log(`Linking ${contentTasks.length} content tasks to design/video tasks...`);

    // Find all design/video tasks
    const designTasks = savedTasks.filter(t => t.taskType === 'graphic_design' || t.taskType === 'video_editing');
    console.log(`Found ${designTasks.length} design/video tasks to potentially link`);

    // Track which design tasks have been linked to prevent duplicate linking
    const linkedDesignTaskIds = new Set();

    // For each content task, find the corresponding design/video task
    for (const contentTask of contentTasks) {
      // Determine the design task type based on content task's creativeOutputType
      const videoTypes = ['video_creative', 'ugc_content', 'testimonial_content', 'demo_video', 'reel'];
      const isVideoContent = contentTask.creativeOutputType && videoTypes.includes(contentTask.creativeOutputType);
      const designTaskType = isVideoContent ? 'video_editing' : 'graphic_design';

      console.log(`\nLooking for ${designTaskType} task for content task ${contentTask._id}`);
      console.log(`  Content task: creativeOutputType=${contentTask.creativeOutputType}, adTypeKey=${contentTask.adTypeKey}, creativeStrategyId=${contentTask.creativeStrategyId}`);

      let designTask = null;

      // Strategy 1: Match by adTypeKey (legacy ad types) - only find unlinked tasks
      if (contentTask.adTypeKey) {
        designTask = designTasks.find(t =>
          t.taskType === designTaskType &&
          t.adTypeKey === contentTask.adTypeKey &&
          t.creativeStrategyId?.toString() === contentTask.creativeStrategyId?.toString() &&
          !linkedDesignTaskIds.has(t._id.toString())
        );
        if (designTask) {
          console.log(`  Found by adTypeKey: ${designTask._id}`);
        }
      }

      // Strategy 2: Match by creativeType (most unique identifier in creative plan)
      // Both tasks have creativeType set from planItem.subType or planItem.adType
      if (!designTask && contentTask.strategyContext?.creativeType) {
        designTask = designTasks.find(t =>
          t.taskType === designTaskType &&
          t.strategyContext?.creativeType === contentTask.strategyContext?.creativeType &&
          t.creativeStrategyId?.toString() === contentTask.creativeStrategyId?.toString() &&
          !linkedDesignTaskIds.has(t._id.toString())
        );
        if (designTask) {
          console.log(`  Found by creativeType: ${designTask._id}`);
        }
      }

      // Strategy 3: Match by creativeOutputType and creativeStrategyId - only find unlinked tasks
      if (!designTask && contentTask.creativeOutputType) {
        designTask = designTasks.find(t =>
          t.taskType === designTaskType &&
          t.creativeOutputType === contentTask.creativeOutputType &&
          t.creativeStrategyId?.toString() === contentTask.creativeStrategyId?.toString() &&
          !linkedDesignTaskIds.has(t._id.toString())
        );
        if (designTask) {
          console.log(`  Found by creativeOutputType: ${designTask._id}`);
        }
      }

      // Strategy 4: Match by order in same creative type group (fallback for legacy ad types with multiple creatives)
      // This handles cases where multiple image creatives exist with same adTypeKey
      if (!designTask && contentTask.creativeOutputType) {
        // Get all unlinked design tasks of the same type
        const unlinkedDesignTasks = designTasks.filter(t =>
          t.taskType === designTaskType &&
          t.creativeOutputType === contentTask.creativeOutputType &&
          t.creativeStrategyId?.toString() === contentTask.creativeStrategyId?.toString() &&
          !linkedDesignTaskIds.has(t._id.toString())
        );

        // Get all content tasks of the same type (for counting)
        const sameTypeContentTasks = contentTasks.filter(t =>
          t.creativeOutputType === contentTask.creativeOutputType &&
          t.creativeStrategyId?.toString() === contentTask.creativeStrategyId?.toString()
        );

        // Find the index of this content task among same-type content tasks
        const contentIndex = sameTypeContentTasks.findIndex(t => t._id.toString() === contentTask._id.toString());

        // Pick the design task at the same index
        if (contentIndex >= 0 && contentIndex < unlinkedDesignTasks.length) {
          designTask = unlinkedDesignTasks[contentIndex];
          console.log(`  Found by order matching: ${designTask._id} (content index ${contentIndex})`);
        }
      }

      // Strategy 5: For landing page tasks, match by landingPageId
      if (!designTask && contentTask.landingPageId) {
        designTask = designTasks.find(t =>
          t.taskType === designTaskType &&
          t.landingPageId?.toString() === contentTask.landingPageId?.toString() &&
          !linkedDesignTaskIds.has(t._id.toString())
        );
        if (designTask) {
          console.log(`  Found by landingPageId: ${designTask._id}`);
        }
      }

      if (designTask) {
        // Update the design task to link to the content task
        designTask.parentTaskId = contentTask._id;
        await designTask.save();
        linkedDesignTaskIds.add(designTask._id.toString());
        console.log(`  ✓ Linked ${designTaskType} task ${designTask._id} to content task ${contentTask._id}`);
      } else {
        console.log(`  ⚠ No matching ${designTaskType} task found for content task ${contentTask._id}`);
        console.log(`  Available unlinked design tasks:`, designTasks.filter(t => t.taskType === designTaskType && !linkedDesignTaskIds.has(t._id.toString())).map(t => ({
          _id: t._id,
          taskType: t.taskType,
          creativeOutputType: t.creativeOutputType,
          adTypeKey: t.adTypeKey,
          creativeType: t.strategyContext?.creativeType,
          creativeStrategyId: t.creativeStrategyId,
          parentTaskId: t.parentTaskId
        })));
        console.log(`  Content task details:`, {
          _id: contentTask._id,
          taskType: contentTask.taskType,
          creativeOutputType: contentTask.creativeOutputType,
          adTypeKey: contentTask.adTypeKey,
          creativeType: contentTask.strategyContext?.creativeType,
          creativeStrategyId: contentTask.creativeStrategyId
        });
      }
    }

    console.log('Finished linking content to design tasks');
    console.log(`Summary: ${linkedDesignTaskIds.size} design tasks linked to content tasks`);
  } catch (error) {
    console.error('Error linking content to design tasks:', error);
    // Don't throw - this is not critical, tasks can still work
  }
}

/**
 * Update existing task assignments when creative plan contentWriter changes
 * This ensures tasks get reassigned when the content planner is changed in the creative strategy
 */
async function updateCreativePlanTaskAssignments(projectId, creativeStrategy, project) {
  try {
    console.log('\n========================================');
    console.log('=== UPDATING CREATIVE PLAN TASK ASSIGNMENTS ===');
    console.log('========================================');

    const creativePlan = creativeStrategy.creativePlan || [];
    if (creativePlan.length === 0) {
      console.log('No creative plan items to update');
      return;
    }

    // Get project-level content writers for fallback
    const defaultContentWriters = project.assignedTeam?.contentWriters ||
      (project.assignedTeam?.contentWriter ? [project.assignedTeam.contentWriter] : []);

    console.log('=== DEFAULT CONTENT WRITERS (FALLBACK) ===');
    console.log('contentWriters from project:', project.assignedTeam?.contentWriters?.map(w => ({ _id: w?._id, name: w?.name })) || 'none');
    console.log('contentWriter (legacy) from project:', project.assignedTeam?.contentWriter?._id || project.assignedTeam?.contentWriter || 'none');
    console.log('defaultContentWriters array:', defaultContentWriters.map(w => ({ _id: w?._id, name: w?.name })) || 'empty');

    // Find all content tasks for this project's creative strategy
    const existingContentTasks = await Task.find({
      projectId,
      creativeStrategyId: creativeStrategy._id,
      taskType: 'content_creation'
    });

    console.log(`Found ${existingContentTasks.length} existing content tasks`);

    if (existingContentTasks.length === 0) {
      console.log('No existing content tasks to update');
      return;
    }

    // Build a map of creative plan items by name for quick lookup
    const planItemMap = new Map();
    for (const item of creativePlan) {
      const key = item.name || item.subType || item.adType || `Creative ${creativePlan.indexOf(item) + 1}`;
      planItemMap.set(key, item);
      // Log both new array field and legacy single field
      const writers = item.contentWriters?.map(w => w?._id || w).join(', ') || 'none';
      const legacyWriter = item.contentWriter?._id || item.contentWriter || 'none';
      console.log(`Plan item: "${key}" -> contentWriters: [${writers}], contentWriter (legacy): ${legacyWriter}`);
    }

    let updatedCount = 0;

    for (const task of existingContentTasks) {
      // Extract the creative name from task title (format: "Content: {creativeName}")
      const creativeName = task.taskTitle.replace('Content: ', '').trim();
      const planItem = planItemMap.get(creativeName);

      if (!planItem) {
        // Try fuzzy matching - find the closest match
        const matchingKey = [...planItemMap.keys()].find(key =>
          key.toLowerCase().includes(creativeName.toLowerCase()) ||
          creativeName.toLowerCase().includes(key.toLowerCase())
        );

        if (matchingKey) {
          console.log(`Task "${task.taskTitle}" matched to plan item "${matchingKey}" via fuzzy match`);
          const planItem = planItemMap.get(matchingKey);

          // Determine the content writer to assign - support both new array and legacy single field
          let newContentWriterId = null;

          // First check for new array field (contentWriters)
          if (planItem.contentWriters && Array.isArray(planItem.contentWriters) && planItem.contentWriters.length > 0) {
            // Use the first content writer from the array (for single task compatibility)
            const firstWriter = planItem.contentWriters[0];
            newContentWriterId = typeof firstWriter === 'object' && firstWriter._id
              ? firstWriter._id.toString()
              : firstWriter.toString ? firstWriter.toString() : String(firstWriter);
          } else if (planItem.contentWriter) {
            // Fall back to legacy single field
            newContentWriterId = typeof planItem.contentWriter === 'object'
              ? planItem.contentWriter._id?.toString() || planItem.contentWriter.toString()
              : planItem.contentWriter.toString();
          } else if (defaultContentWriters.length > 0) {
            // Fall back to project-level content writers
            newContentWriterId = defaultContentWriters[0]._id?.toString() || defaultContentWriters[0].toString();
          }

          if (!newContentWriterId) {
            console.log(`No content writer available for task "${task.taskTitle}"`);
            continue;
          }

          // Convert to string for comparison
          const currentAssigneeStr = task.assignedTo?.toString();

          // Check if assignment needs to be updated
          if (currentAssigneeStr !== newContentWriterId) {
            console.log(`Updating task "${task.taskTitle}" assignment from ${currentAssigneeStr || 'unassigned'} to ${newContentWriterId}`);
            task.assignedTo = newContentWriterId;
            await task.save();
            updatedCount++;
          } else {
            console.log(`Task "${task.taskTitle}" already assigned correctly`);
          }
        } else {
          console.log(`No matching plan item for task "${task.taskTitle}" (creativeName: "${creativeName}")`);
        }
        continue;
      }

      // Determine the content writer to assign - support both new array and legacy single field
      let newContentWriterId = null;

      // First check for new array field (contentWriters)
      if (planItem.contentWriters && Array.isArray(planItem.contentWriters) && planItem.contentWriters.length > 0) {
        // Use the first content writer from the array (for single task compatibility)
        const firstWriter = planItem.contentWriters[0];
        newContentWriterId = typeof firstWriter === 'object' && firstWriter._id
          ? firstWriter._id.toString()
          : firstWriter.toString ? firstWriter.toString() : String(firstWriter);
      } else if (planItem.contentWriter) {
        // Fall back to legacy single field
        newContentWriterId = typeof planItem.contentWriter === 'object'
          ? planItem.contentWriter._id?.toString() || planItem.contentWriter.toString()
          : planItem.contentWriter.toString();
      } else if (defaultContentWriters.length > 0) {
        // Fall back to project-level content writers
        newContentWriterId = defaultContentWriters[0]._id?.toString() || defaultContentWriters[0].toString();
      }

      if (!newContentWriterId) {
        console.log(`No content writer available for task "${task.taskTitle}"`);
        continue;
      }

      // Convert to string for comparison
      const currentAssigneeStr = task.assignedTo?.toString();

      // Check if assignment needs to be updated
      if (currentAssigneeStr !== newContentWriterId) {
        console.log(`Updating task "${task.taskTitle}" assignment from ${currentAssigneeStr || 'unassigned'} to ${newContentWriterId}`);
        task.assignedTo = newContentWriterId;
        await task.save();
        updatedCount++;
      } else {
        console.log(`Task "${task.taskTitle}" already assigned correctly`);
      }

      // Update testerIds if assignedTesters changed on the creative plan item
      if (planItem.assignedTesters && Array.isArray(planItem.assignedTesters) && planItem.assignedTesters.length > 0) {
        const newTesterIds = planItem.assignedTesters.map(t => {
          if (typeof t === 'object' && t._id) return t._id.toString();
          return t.toString ? t.toString() : String(t);
        });
        const currentTesterIds = (task.testerIds || []).map(id => id.toString());
        const testersChanged = newTesterIds.length !== currentTesterIds.length ||
          !newTesterIds.every(id => currentTesterIds.includes(id));
        if (testersChanged) {
          console.log(`Updating task "${task.taskTitle}" testers from [${currentTesterIds.join(', ')}] to [${newTesterIds.join(', ')}]`);
          task.testerIds = newTesterIds;
          await task.save();
        }
      }
    }

    // Also update testerIds on design tasks for this creative strategy
    const existingDesignTasks = await Task.find({
      projectId,
      creativeStrategyId: creativeStrategy._id,
      taskType: { $in: ['graphic_design', 'video_editing'] }
    });

    for (const designTask of existingDesignTasks) {
      const creativeName = designTask.taskTitle.replace('Design: ', '').replace('Edit: ', '').trim();
      const planItem = planItemMap.get(creativeName);

      if (planItem && planItem.assignedTesters && Array.isArray(planItem.assignedTesters) && planItem.assignedTesters.length > 0) {
        const newTesterIds = planItem.assignedTesters.map(t => {
          if (typeof t === 'object' && t._id) return t._id.toString();
          return t.toString ? t.toString() : String(t);
        });
        const currentTesterIds = (designTask.testerIds || []).map(id => id.toString());
        const testersChanged = newTesterIds.length !== currentTesterIds.length ||
          !newTesterIds.every(id => currentTesterIds.includes(id));
        if (testersChanged) {
          console.log(`Updating design task "${designTask.taskTitle}" testers from [${currentTesterIds.join(', ')}] to [${newTesterIds.join(', ')}]`);
          designTask.testerIds = newTesterIds;
          await designTask.save();
        }
      }
    }

    console.log(`\n=== TASK ASSIGNMENT UPDATE COMPLETE ===`);
    console.log(`Updated ${updatedCount} task assignments`);
    console.log('========================================\n');
  } catch (error) {
    console.error('Error updating creative plan task assignments:', error);
    // Don't throw - this is not critical, tasks can still work
  }
}

module.exports = {
  generateTasksFromStrategy,
  getTasksByProject,
  getTasksByUser,
  updateTaskStatus,
  buildStrategyContext,
  generateAIPrompt,
  SOP_REFERENCES,
  updateCreativePlanTaskAssignments
};