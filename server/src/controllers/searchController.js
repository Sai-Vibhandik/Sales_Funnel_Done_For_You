const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const Membership = require('../models/Membership');

// Helper function to escape regex special characters
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Helper function to create search regex with word boundary matching
const createSearchRegex = (query) => {
  const escaped = escapeRegex(query.trim());
  // Match words that start with or contain the query
  return new RegExp(escaped, 'i');
};

// Helper function to calculate relevance score
const calculateRelevance = (item, query, field) => {
  const value = item[field] || '';
  const lowerValue = value.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // Exact match gets highest score
  if (lowerValue === lowerQuery) return 100;
  // Starts with query gets high score
  if (lowerValue.startsWith(lowerQuery)) return 80;
  // Contains query as word gets medium score
  if (lowerValue.includes(' ' + lowerQuery + ' ')) return 60;
  // Contains query gets lower score
  if (lowerValue.includes(lowerQuery)) return 40;
  return 0;
};

// @desc    Global search across projects, tasks, and team members
// @route   GET /api/search
// @access  Private
exports.globalSearch = async (req, res, next) => {
  try {
    const { q, type } = req.query;

    // Allow single character searches for better UX
    if (!q || q.trim().length < 1) {
      return res.status(200).json({
        success: true,
        data: {
          projects: [],
          tasks: [],
          teamMembers: []
        }
      });
    }

    const searchRegex = createSearchRegex(q);
    const results = {
      projects: [],
      tasks: [],
      teamMembers: []
    };

    // Get user's organization
    const organizationId = req.user.currentOrganization;

    // Search Projects - expanded to include more fields
    if (!type || type === 'all' || type === 'projects') {
      const projects = await Project.find({
        organizationId,
        $or: [
          { projectName: searchRegex },
          { customerName: searchRegex },
          { businessName: searchRegex },
          { email: searchRegex },
          { description: searchRegex },
          { industry: searchRegex },
          { status: searchRegex },
          { 'address.city': searchRegex },
          { 'address.state': searchRegex },
          { 'address.country': searchRegex }
        ]
      })
      .select('projectName customerName businessName email description status currentStage industry createdAt')
      .sort({ createdAt: -1 })
      .limit(15);

      results.projects = projects.map(p => {
        // Calculate relevance score based on match quality
        let score = 0;
        score = Math.max(score, calculateRelevance(p, q, 'projectName'));
        score = Math.max(score, calculateRelevance(p, q, 'customerName'));
        score = Math.max(score, calculateRelevance(p, q, 'businessName'));

        return {
          _id: p._id,
          name: p.projectName,
          customerName: p.customerName,
          businessName: p.businessName,
          description: p.description,
          status: p.status,
          currentStage: p.currentStage,
          industry: p.industry,
          createdAt: p.createdAt,
          type: 'project',
          score
        };
      }).sort((a, b) => b.score - a.score);
    }

    // Search Tasks - expanded to include more fields
    if (!type || type === 'all' || type === 'tasks') {
      const tasks = await Task.find({
        organizationId,
        $or: [
          { taskTitle: searchRegex },
          { description: searchRegex },
          { status: searchRegex },
          { taskType: searchRegex },
          { assetType: searchRegex },
          { 'strategyContext.hook': searchRegex },
          { 'strategyContext.creativeAngle': searchRegex },
          { 'strategyContext.platform': searchRegex }
        ]
      })
      .populate('projectId', 'projectName customerName')
      .select('taskTitle description status taskType assetType projectId assignedTo createdAt')
      .sort({ createdAt: -1 })
      .limit(15);

      results.tasks = tasks.map(t => {
        let score = calculateRelevance(t, q, 'taskTitle');
        score = Math.max(score, calculateRelevance(t, q, 'status'));

        return {
          _id: t._id,
          title: t.taskTitle,
          description: t.description,
          status: t.status,
          taskType: t.taskType,
          assetType: t.assetType,
          project: t.projectId,
          assignedTo: t.assignedTo,
          createdAt: t.createdAt,
          type: 'task',
          score
        };
      }).sort((a, b) => b.score - a.score);
    }

    // Search Team Members - expanded to include more fields
    // Accept both 'members' and 'teamMembers' for flexibility
    if (!type || type === 'all' || type === 'members' || type === 'teamMembers') {
      // Get user IDs from memberships in the same organization
      const memberships = await Membership.find({
        organizationId,
        status: 'active'
      }).select('userId');

      const userIds = memberships.map(m => m.userId);

      const teamMembers = await User.find({
        _id: { $in: userIds },
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { role: searchRegex },
          { specialization: searchRegex }
        ]
      })
      .select('name email role specialization isActive')
      .sort({ name: 1 })
      .limit(15);

      results.teamMembers = teamMembers.map(m => {
        let score = calculateRelevance(m, q, 'name');
        score = Math.max(score, calculateRelevance(m, q, 'email'));
        score = Math.max(score, calculateRelevance(m, q, 'role'));

        return {
          _id: m._id,
          name: m.name,
          email: m.email,
          role: m.role,
          specialization: m.specialization,
          isActive: m.isActive,
          type: 'member',
          score
        };
      }).sort((a, b) => b.score - a.score);
    }

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
};