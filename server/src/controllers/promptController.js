const Prompt = require('../models/Prompt');
const FrameworkCategory = require('../models/FrameworkCategory');
const { generateFinalPrompt, checkOllamaHealth } = require('../services/ollamaService');
const { checkAIHealth, AI_PROVIDER } = require('../services/aiService');
const { getFrameworkTemplate, getFrameworkTypes, replaceTemplatePlaceholders } = require('../utils/frameworkTemplates');

// @desc    Get all prompts (with filters)
// @route   GET /api/prompts
// @access  Private (Admin, Performance Marketer, Content Writer, etc.)
exports.getPrompts = async (req, res, next) => {
  try {
    const { role, category, platform, funnelStage, creativeType, isActive, frameworkType, subCategory } = req.query;

    const query = {};

    // Filter by role (for team members to get their prompts)
    if (role) {
      query.role = role;
    }

    // Filter by framework type (for content_writer)
    if (frameworkType) {
      query.frameworkType = frameworkType;
    }

    // Filter by subCategory (optional)
    if (subCategory) {
      query.subCategory = subCategory;
    }

    // Filter by category (not used for content_writer)
    if (category && role !== 'content_writer') {
      query.category = category;
    }

    // Filter by platform (not used for content_writer)
    if (platform && role !== 'content_writer') {
      query.platform = { $in: [platform, 'all'] };
    }

    // Filter by funnel stage
    if (funnelStage) {
      query.funnelStage = { $in: [funnelStage, 'all'] };
    }

    // Filter by creative type
    if (creativeType) {
      query.creativeType = { $in: [creativeType, 'all'] };
    }

    // Filter by active status (admin can see all, others only active)
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    } else if (req.user.role !== 'admin') {
      query.isActive = true;
    }

    const prompts = await Prompt.find(query)
      .populate('createdBy', 'name email')
      .sort({ usageCount: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: prompts.length,
      data: prompts
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single prompt
// @route   GET /api/prompts/:id
// @access  Private
exports.getPrompt = async (req, res, next) => {
  try {
    const prompt = await Prompt.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!prompt) {
      return res.status(404).json({
        success: false,
        message: 'Prompt not found'
      });
    }

    res.status(200).json({
      success: true,
      data: prompt
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new prompt
// @route   POST /api/prompts
// @access  Private (Platform Admin only)
exports.createPrompt = async (req, res, next) => {
  try {
    // Only platform admin can create prompts
    if (req.user.role !== 'platform_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only platform admins can create prompts'
      });
    }

    let {
      title,
      role,
      frameworkType,
      subCategory,
      content,
      category,
      platform,
      funnelStage,
      creativeType,
      description,
      tags
    } = req.body;

    // Validate and normalize frameworkType - must be a string, not an array
    if (frameworkType !== undefined && frameworkType !== null) {
      if (Array.isArray(frameworkType)) {
        return res.status(400).json({
          success: false,
          message: 'Framework type must be a single value, not an array. Please select only one framework.'
        });
      }
      // Ensure it's a string
      frameworkType = String(frameworkType).trim();
    }

    // Validate frameworkType for content_writer role
    if (role === 'content_writer' && !frameworkType) {
      return res.status(400).json({
        success: false,
        message: 'Framework type is required for Content Planner role'
      });
    }

    // Validate subCategory if provided
    if (subCategory && frameworkType) {
      const categoryExists = await FrameworkCategory.exists(frameworkType, subCategory);
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: `SubCategory '${subCategory}' does not exist for framework '${frameworkType}'. Please create it first or use an existing subcategory.`
        });
      }
    }

    // If frameworkType is provided, get the template content
    let promptContent = content;
    if (role === 'content_writer' && frameworkType && !content) {
      promptContent = getFrameworkTemplate(frameworkType);
    }

    const prompt = await Prompt.create({
      title,
      role,
      frameworkType: role === 'content_writer' ? frameworkType : undefined,
      subCategory: subCategory || null,
      content: promptContent,
      // Only include category and platform for non-content_writer roles
      category: role === 'content_writer' ? undefined : (category || 'general'),
      platform: role === 'content_writer' ? undefined : (platform || 'all'),
      funnelStage: funnelStage || 'all',
      creativeType: creativeType || 'all',
      description,
      tags: tags || [],
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      data: prompt,
      message: 'Prompt created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update prompt
// @route   PUT /api/prompts/:id
// @access  Private (Platform Admin only)
exports.updatePrompt = async (req, res, next) => {
  try {
    // Only platform admin can update prompts
    if (req.user.role !== 'platform_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only platform admins can update prompts'
      });
    }

    const prompt = await Prompt.findById(req.params.id);

    if (!prompt) {
      return res.status(404).json({
        success: false,
        message: 'Prompt not found'
      });
    }

    // Simply update all provided fields
    const updates = req.body;

    // Apply updates
    if (updates.title !== undefined) prompt.title = updates.title;
    if (updates.role !== undefined) prompt.role = updates.role;
    if (updates.frameworkType !== undefined) prompt.frameworkType = updates.frameworkType || undefined;
    if (updates.subCategory !== undefined) prompt.subCategory = updates.subCategory || undefined;
    if (updates.content !== undefined) prompt.content = updates.content;
    if (updates.category !== undefined) prompt.category = updates.category;
    if (updates.platform !== undefined) prompt.platform = updates.platform;
    if (updates.funnelStage !== undefined) prompt.funnelStage = updates.funnelStage;
    if (updates.creativeType !== undefined) prompt.creativeType = updates.creativeType;
    if (updates.description !== undefined) prompt.description = updates.description;
    if (updates.tags !== undefined) prompt.tags = updates.tags;
    if (updates.isActive !== undefined) prompt.isActive = updates.isActive;

    await prompt.save();

    res.status(200).json({
      success: true,
      data: prompt,
      message: 'Prompt updated successfully'
    });
  } catch (error) {
    console.error('Error updating prompt:', error);
    next(error);
  }
};

// @desc    Delete prompt
// @route   DELETE /api/prompts/:id
// @access  Private (Platform Admin only)
exports.deletePrompt = async (req, res, next) => {
  try {
    // Only platform admin can delete prompts
    if (req.user.role !== 'platform_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only platform admins can delete prompts'
      });
    }

    const prompt = await Prompt.findById(req.params.id);

    if (!prompt) {
      return res.status(404).json({
        success: false,
        message: 'Prompt not found'
      });
    }

    await prompt.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Prompt deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle prompt active status
// @route   PUT /api/prompts/:id/toggle-active
// @access  Private (Platform Admin only)
exports.togglePromptActive = async (req, res, next) => {
  try {
    // Only platform admin can toggle active status
    if (req.user.role !== 'platform_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only platform admins can toggle prompt status'
      });
    }

    const prompt = await Prompt.findById(req.params.id);

    if (!prompt) {
      return res.status(404).json({
        success: false,
        message: 'Prompt not found'
      });
    }

    prompt.isActive = !prompt.isActive;
    await prompt.save();

    res.status(200).json({
      success: true,
      data: prompt,
      message: `Prompt ${prompt.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get prompts by role (for team members)
// @route   GET /api/prompts/by-role/:role
// @access  Private
exports.getPromptsByRole = async (req, res, next) => {
  try {
    const { role } = req.params;

    // Validate role
    const validRoles = ['content_writer', 'graphic_designer', 'video_editor', 'ui_ux_designer', 'developer', 'tester'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    // Only allow users to see prompts for their role (or admin can see all)
    if (req.user.role !== 'admin' && req.user.role !== role) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access these prompts'
      });
    }

    const prompts = await Prompt.find({
      role,
      isActive: true
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: prompts.length,
      data: prompts
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate AI prompt using Ollama
// @route   POST /api/prompts/generate
// @access  Private
//
// Request body:
// - basePromptId: (optional) ID of specific prompt to use
// - frameworkType: (optional) Framework type to use
// - subCategory: (optional) Subcategory within framework
// - context: Object with replacement variables
//
// Priority for prompt selection:
// 1. If basePromptId is provided → use that specific prompt
// 2. If subCategory is provided → find prompts matching framework + subCategory
// 3. If no subCategory matches → fallback to framework-only prompts (subCategory = null)
// 4. If only frameworkType → use framework-only prompts
//
// Within matching prompts, selection priority:
// 1. Lowest usageCount (less used = fresher)
// 2. Most recent createdAt
exports.generatePrompt = async (req, res, next) => {
  try {
    const { basePromptId, frameworkType, subCategory, context } = req.body;

    // Validate input
    if (!basePromptId && !context?.basePrompt && !frameworkType) {
      return res.status(400).json({
        success: false,
        message: 'Either basePromptId, frameworkType, or basePrompt in context is required'
      });
    }

    let basePrompt = context?.basePrompt;
    let promptRecord = null;
    let isFallback = false;

    // If basePromptId is provided, use it directly (highest priority)
    if (basePromptId) {
      const prompt = await Prompt.findById(basePromptId);

      if (!prompt) {
        return res.status(404).json({
          success: false,
          message: 'Base prompt not found'
        });
      }

      if (!prompt.isActive) {
        return res.status(400).json({
          success: false,
          message: 'This prompt is not active'
        });
      }

      basePrompt = prompt.content;
      promptRecord = prompt;

      // Increment usage count
      await prompt.incrementUsage();
    }
    // If frameworkType is provided (with or without subCategory)
    else if (frameworkType) {
      // If subCategory is provided, try to find matching prompts
      if (subCategory) {
        // Find prompts matching framework + subCategory
        const matchingPrompts = await Prompt.find({
          frameworkType,
          subCategory,
          isActive: true
        }).sort({ usageCount: 1, createdAt: -1 });

        if (matchingPrompts.length > 0) {
          // Select prompt with lowest usage count
          const selectedPrompt = selectBestPrompt(matchingPrompts);
          basePrompt = selectedPrompt.content;
          promptRecord = selectedPrompt;
          await selectedPrompt.incrementUsage();
        } else {
          // Fallback to framework-only prompts (subCategory = null or undefined)
          const fallbackPrompts = await Prompt.find({
            frameworkType,
            $or: [
              { subCategory: null },
              { subCategory: { $exists: false } }
            ],
            isActive: true
          }).sort({ usageCount: 1, createdAt: -1 });

          if (fallbackPrompts.length > 0) {
            const selectedPrompt = selectBestPrompt(fallbackPrompts);
            basePrompt = selectedPrompt.content;
            promptRecord = selectedPrompt;
            isFallback = true;
            await selectedPrompt.incrementUsage();
          } else {
            // No prompts found, use framework template
            basePrompt = getFrameworkTemplate(frameworkType);
            if (!basePrompt) {
              return res.status(400).json({
                success: false,
                message: 'Invalid framework type and no prompts found'
              });
            }
          }
        }
      } else {
        // No subCategory, find framework-only prompts
        const frameworkPrompts = await Prompt.find({
          frameworkType,
          $or: [
            { subCategory: null },
            { subCategory: { $exists: false } }
          ],
          isActive: true
        }).sort({ usageCount: 1, createdAt: -1 });

        if (frameworkPrompts.length > 0) {
          const selectedPrompt = selectBestPrompt(frameworkPrompts);
          basePrompt = selectedPrompt.content;
          promptRecord = selectedPrompt;
          await selectedPrompt.incrementUsage();
        } else {
          // No prompts found, use framework template
          basePrompt = getFrameworkTemplate(frameworkType);
          if (!basePrompt) {
            return res.status(400).json({
              success: false,
              message: 'Invalid framework type and no prompts found'
            });
          }
        }
      }
    }

    // Replace placeholders in framework template
    if (frameworkType || basePromptId || subCategory) {
      basePrompt = replaceTemplatePlaceholders(basePrompt, {
        problem: context?.problem || '',
        audience: context?.audience || '',
        platform: context?.platform || '',
        funnelStage: context?.funnelStage || '',
        brandName: context?.brandName || '',
        industry: context?.industry || '',
        painPoints: context?.painPoints || [],
        desires: context?.desires || [],
        offer: context?.offer || '',
        hook: context?.hook || '',
        headline: context?.headline || '',
        cta: context?.cta || ''
      });
    }

    // Generate the final prompt using Ollama
    const finalPrompt = await generateFinalPrompt({
      basePrompt,
      context: {
        problem: context?.problem || '',
        audience: context?.audience || '',
        platform: context?.platform || '',
        funnelStage: context?.funnelStage || '',
        goal: context?.goal || '',
        offer: context?.offer || '',
        creativeType: context?.creativeType || '',
        hook: context?.hook || '',
        headline: context?.headline || '',
        cta: context?.cta || '',
        brandName: context?.brandName || '',
        industry: context?.industry || '',
        painPoints: context?.painPoints || [],
        desires: context?.desires || []
      }
    });

    const response = {
      success: true,
      data: {
        finalPrompt
      }
    };

    // Include metadata about prompt selection if a prompt was used
    if (promptRecord) {
      response.data.promptId = promptRecord._id;
      response.data.promptTitle = promptRecord.title;
      response.data.frameworkType = promptRecord.frameworkType;
      response.data.subCategory = promptRecord.subCategory;
      response.data.isFallback = isFallback;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Error generating prompt:', error);

    // Handle Ollama-specific errors
    if (error.message.includes('Ollama')) {
      return res.status(503).json({
        success: false,
        message: 'AI service is unavailable. Please make sure Ollama is running.',
        error: error.message
      });
    }

    next(error);
  }
};

/**
 * Helper function to select the best prompt from a list
 * Priority: lowest usageCount (less used = fresher) > most recent
 */
function selectBestPrompt(prompts) {
  if (prompts.length === 0) return null;
  if (prompts.length === 1) return prompts[0];

  // Sort by usageCount (asc), then createdAt (desc)
  const sorted = [...prompts].sort((a, b) => {
    // Lower usage count first
    const usageDiff = (a.usageCount || 0) - (b.usageCount || 0);
    if (usageDiff !== 0) return usageDiff;

    // Most recent first (createdAt desc)
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  // Return the lowest usage, most recent prompt
  return sorted[0];
}

// @desc    Get available framework types
// @route   GET /api/prompts/frameworks
// @access  Private
exports.getFrameworkTypes = async (req, res, next) => {
  try {
    const frameworks = getFrameworkTypes();

    res.status(200).json({
      success: true,
      data: frameworks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check Ollama health status
// @route   GET /api/prompts/ollama-status
// @access  Private (Platform Admin only)
exports.getOllamaStatus = async (req, res, next) => {
  try {
    // Only platform admin can check AI status
    if (req.user.role !== 'platform_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only platform admins can check AI status'
      });
    }

    // Use unified AI health check
    const status = await checkAIHealth();

    // Add current provider info
    status.currentProvider = AI_PROVIDER;

    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
};