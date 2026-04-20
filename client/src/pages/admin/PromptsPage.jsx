import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { promptService, frameworkCategoryService } from '@/services/api';
import { Card, CardBody, Button, Input, Modal } from '@/components/ui';
import { PenTool, Plus, Edit2, Trash2, X, Search, Power, Eye, Cpu, Sparkles, ChevronDown, ChevronRight, BookOpen, Tag } from 'lucide-react';

const promptSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  role: z.string().min(1, 'Role is required'),
  frameworkType: z.string().optional(),
  content: z.string().min(10, 'Prompt content must be at least 10 characters'),
  category: z.string().optional(),
  platform: z.string().optional(),
  funnelStage: z.string().optional(),
  creativeType: z.string().optional(),
  description: z.string().optional(),
  tags: z.string().optional(),
}).refine((data) => {
  if (data.role === 'content_writer' && !data.frameworkType) {
    return false;
  }
  return true;
}, {
  message: 'Framework type is required for Content Planner role',
  path: ['frameworkType'],
});

const roleOptions = [
  { value: 'content_writer', label: 'Content Planner' },
  { value: 'graphic_designer', label: 'Graphic Designer' },
  { value: 'video_editor', label: 'Video Editor' },
  { value: 'ui_ux_designer', label: 'UI/UX Designer' },
  { value: 'developer', label: 'Developer' },
  { value: 'tester', label: 'Tester' },
];

const frameworkOptions = [
  { value: 'PAS', label: 'PAS - Problem-Agitate-Solution', description: 'Identify problem, amplify pain, present solution' },
  { value: 'AIDA', label: 'AIDA - Attention-Interest-Desire-Action', description: 'Classic marketing framework for conversions' },
  { value: 'BAB', label: 'BAB - Before-After-Bridge', description: 'Show transformation from pain to pleasure' },
  { value: '4C', label: '4C - Clear-Concise-Compelling-Credible', description: 'Clear communication framework' },
  { value: 'STORY', label: 'STORY - Storytelling Framework', description: 'Hook-Relate-Educate-Stimulate-Transition' },
  { value: 'DIRECT_RESPONSE', label: 'Direct Response', description: 'Headline-Offer-CTA focused copy' },
  { value: 'HOOKS', label: 'Hook Generator', description: 'Generate multiple scroll-stopping hooks' },
  { value: 'OBJECTION', label: 'Objection Handling', description: 'Acknowledge-Isolate-Reframe-Prove-Overcome' },
  { value: 'PASTOR', label: 'PASTOR - Problem-Amplify-Story-Testimony-Offer-Response', description: 'Complete persuasion framework' },
  { value: 'QUEST', label: 'QUEST - Qualify-Understand-Educate-Stimulate-Transition', description: 'Nurturing content framework' },
  { value: 'ACCA', label: 'ACCA - Awareness-Comparison-Consideration-Action', description: 'Consideration stage framework' },
  { value: 'FAB', label: 'FAB - Features-Advantages-Benefits', description: 'Transform features into emotional benefits' },
  { value: '5A', label: '5A - Aware-Appeal-Ask-Act-Assess', description: 'Engagement-focused framework' },
  { value: 'SLAP', label: 'SLAP - Stop-Look-Act-Purchase', description: 'Quick-conversion framework' },
  { value: 'HOOK_STORY_OFFER', label: 'Hook-Story-Offer', description: 'Social media content formula' },
  { value: '4P', label: '4P - Picture-Promise-Prove-Push', description: 'Persuasive copy framework' },
  { value: 'UI_DESIGN', label: 'UI/UX Design Brief', description: 'Landing page design brief for UI/UX designers' },
  { value: 'LANDING_PAGE_DEV', label: 'Landing Page Development Brief', description: 'Development brief for implementing landing pages' },
  { value: 'MASTER', label: 'MASTER - Multi-Framework', description: 'Intelligent combination of frameworks' },
];

const categoryOptions = [
  { value: 'general', label: 'General' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'landing_page', label: 'Landing Page' },
  { value: 'email', label: 'Email' },
  { value: 'video', label: 'Video' },
];

const platformOptions = [
  { value: 'all', label: 'All Platforms' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'landing_page', label: 'Landing Page' },
  { value: 'email', label: 'Email' },
  { value: 'video', label: 'Video' },
];

const funnelStageOptions = [
  { value: 'all', label: 'All Stages' },
  { value: 'awareness', label: 'Awareness' },
  { value: 'consideration', label: 'Consideration' },
  { value: 'conversion', label: 'Conversion' },
];

const creativeTypeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'image', label: 'Image' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'video', label: 'Video' },
  { value: 'story', label: 'Story' },
  { value: 'reel', label: 'Reel' },
  { value: 'copy', label: 'Copy' },
  { value: 'script', label: 'Script' },
  { value: 'landing_page', label: 'Landing Page' },
  { value: 'email', label: 'Email' },
];

// Framework templates - abbreviated versions for preview
const frameworkTemplates = {
  PAS: `You are an expert direct-response copywriter specializing in high-converting ad copy.

Create highly emotional and conversion-focused content using the PAS (Problem-Agitate-Solution) framework.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Funnel Stage: {{funnelStage}}
- Brand: {{brandName}}
- Industry: {{industry}}
- Pain Points: {{painPoints}}
- Desires: {{desires}}
- Offer: {{offer}}

TASK:
Using the PAS framework:
1. PROBLEM - Identify and articulate the core problem
2. AGITATE - Intensify the emotional impact
3. SOLUTION - Present your offer as the clear answer

OUTPUT REQUIREMENTS:
- Match tone and style to platform
- Include emotional hooks that stop the scroll
- End with clear CTA`,

  AIDA: `You are an expert marketing copywriter trained in the AIDA framework.

Create compelling content that guides prospects through the buying journey.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Funnel Stage: {{funnelStage}}
- Brand: {{brandName}}
- Offer: {{offer}}
- Hook: {{hook}}
- CTA: {{cta}}

TASK:
Using AIDA framework:
1. ATTENTION - Grab immediate attention
2. INTEREST - Build genuine interest
3. DESIRE - Create strong desire
4. ACTION - Drive clear action

Generate the complete content now:`,

  BAB: `You are an expert copywriter specializing in transformation stories.

Create compelling content using BAB (Before-After-Bridge) framework.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Brand: {{brandName}}
- Pain Points: {{painPoints}}
- Desires: {{desires}}
- Offer: {{offer}}

TASK:
1. BEFORE - Paint the "current reality" picture
2. AFTER - Show the "desired future" state
3. BRIDGE - Present your solution as the path

Generate the complete content now:`,

  '4C': `You are an expert copywriter trained in the 4C framework.

Create content that is Clear, Concise, Compelling, and Credible.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Brand: {{brandName}}
- Offer: {{offer}}

TASK:
1. CLEAR - Make it instantly understandable
2. CONCISE - Respect their time
3. COMPELLING - Create irresistible pull
4. CREDIBLE - Build trust and belief

Generate the complete content now:`,

  STORY: `You are an expert storyteller and marketing copywriter.

Create compelling narrative content using the HRESTA framework.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Brand: {{brandName}}
- Offer: {{offer}}

TASK:
1. HOOK - Open with attention-grabbing moment
2. RELATE - Connect to the audience
3. EDUCATE - Share the transformation
4. STIMULATE - Build desire
5. TRANSITION - Natural call to action
6. ACTION - Clear CTA

Generate the complete story-based content now:`,

  DIRECT_RESPONSE: `You are a direct-response copywriting expert.

Create high-converting direct response content.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Brand: {{brandName}}
- Offer: {{offer}}
- Headline: {{headline}}
- CTA: {{cta}}

TASK:
Create content with these elements:
1. KILLER HEADLINE
2. SUBHEADLINE/HOOK
3. PROBLEM IDENTIFICATION
4. SOLUTION PREVIEW
5. BENEFITS STACK
6. PROOF ELEMENTS
7. OFFER PRESENTATION
8. URGENCY/SCARCITY
9. CALL TO ACTION

Generate the complete direct response content now:`,

  HOOKS: `You are an expert at creating scroll-stopping hooks.

Generate 5-10 powerful hooks using various formulas.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Brand: {{brandName}}
- Pain Points: {{painPoints}}
- Desires: {{desires}}

HOOK FORMULAS:
1. CURIOSITY HOOKS
2. PROBLEM HOOKS
3. TRANSFORMATION HOOKS
4. NUMBER HOOKS
5. STORY HOOKS
6. CONTRARIAN HOOKS
7. RESULT HOOKS
8. QUESTION HOOKS

Generate multiple hooks now:`,

  OBJECTION: `You are an expert at handling objections.

Create content that preemptively handles objections.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Brand: {{brandName}}
- Offer: {{offer}}

TASK:
Using the objection handling framework:
1. ACKNOWLEDGE THE OBJECTION
2. ISOLATE THE OBJECTION
3. REFRAME THE PERSPECTIVE
4. PROVIDE EVIDENCE
5. OVERCOME WITH CLARITY

Handle common objections:
- "It's too expensive"
- "I don't have time"
- "I've tried something similar"
- "I need to think about it"

Generate the objection-handling content now:`,

  PASTOR: `You are an expert copywriter trained in PASTOR framework.

Create deep, persuasive content using PASTOR.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Brand: {{brandName}}
- Pain Points: {{painPoints}}
- Desires: {{desires}}
- Offer: {{offer}}

TASK:
P - PROBLEM: State the problem clearly
A - AMPLIFY: Magnify the consequences
S - STORY: Share transformation narrative
T - TESTIMONY: Provide social proof
O - OFFER: Present your solution
R - RESPONSE: Call for action

Generate the complete PASTOR content now:`,

  QUEST: `You are an expert copywriter using QUEST framework.

Create relationship-building content using QUEST.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Brand: {{brandName}}
- Offer: {{offer}}

TASK:
Q - QUALIFY: Identify the right audience
U - UNDERSTAND: Show deep empathy
E - EDUCATE: Provide valuable information
S - STIMULATE: Create desire for more
T - TRANSITION: Move to next step

Generate the complete QUEST content now:`,

  ACCA: `You are an expert copywriter using ACCA framework.

Create content that guides through evaluation using ACCA.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Brand: {{brandName}}
- Offer: {{offer}}

TASK:
A - AWARENESS: Create problem awareness
C - COMPARISON: Show alternatives
C - CONSIDERATION: Present your solution
A - ACTION: Drive clear next step

Generate the complete ACCA content now:`,

  FAB: `You are an expert at translating features into benefits.

Create content using FAB (Features-Advantages-Benefits) framework.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Brand: {{brandName}}
- Offer: {{offer}}

TASK:
F - FEATURES: Present what it is
A - ADVANTAGES: Explain what it does
B - BENEFITS: Show what it means for them

Transform each feature through advantages into emotional benefits.

Generate the complete FAB content now:`,

  '5A': `You are an expert copywriter using 5A framework.

Create engagement-focused content using 5A.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Brand: {{brandName}}
- Offer: {{offer}}

TASK:
1. AWARE - Create awareness
2. APPEAL - Build appeal
3. ASK - Make the request
4. ACT - Enable the action
5. ASSESS - Follow up

Generate the complete 5A content now:`,

  SLAP: `You are an expert at creating high-impact content using SLAP.

Create content that stops the scroll and drives action.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Brand: {{brandName}}
- Offer: {{offer}}

TASK:
S - STOP: Stop them in their tracks
L - LOOK: Make them look closer
A - ACT: Drive immediate action
P - PURCHASE: Present the offer

Maximum impact, minimum length. Every word must earn its place.

Generate the complete SLAP content now:`,

  HOOK_STORY_OFFER: `You are an expert at the Hook-Story-Offer framework.

Create engaging social media content.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Brand: {{brandName}}
- Offer: {{offer}}

TASK:
HOOK (3-5 seconds):
- Stop the scroll immediately
- Create curiosity or shock
- Pattern interrupt

STORY (15-30 seconds):
- Share relatable transformation
- Include specific details
- Emotional beats

OFFER (5-10 seconds):
- Natural transition from story
- Clear, specific offer
- Strong CTA

Generate the complete Hook-Story-Offer content now:`,

  '4P': `You are an expert copywriter using 4P framework.

Create persuasive content using Picture-Promise-Prove-Push.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Brand: {{brandName}}
- Offer: {{offer}}
- CTA: {{cta}}

TASK:
P - PICTURE: Paint the vision
P - PROMISE: Make a clear commitment
P - PROVE: Provide evidence
P - PUSH: Drive action

Generate the complete 4P content now:`,

  MASTER: `You are a master copywriter with expertise in all frameworks.

Analyze the input and create content using the most effective framework combination.

INPUT DATA:
- Problem: {{problem}}
- Audience: {{audience}}
- Platform: {{platform}}
- Funnel Stage: {{funnelStage}}
- Brand: {{brandName}}
- Industry: {{industry}}
- Pain Points: {{painPoints}}
- Desires: {{desires}}
- Offer: {{offer}}
- Hook: {{hook}}
- Headline: {{headline}}
- CTA: {{cta}}

TASK:
1. FRAMEWORK SELECTION:
   - Awareness → HOOK_STORY_OFFER or STORY
   - Consideration → FAB or ACCA or QUEST
   - Conversion → PAS or AIDA or 4P

2. CONTENT STRUCTURE:
   - Open with strongest hook
   - Build emotional connection
   - Provide proof and credibility
   - Present clear offer
   - Drive to action

3. OPTIMIZATION:
   - Match tone to platform
   - Optimize length for platform
   - Mobile-first design

Analyze the inputs and generate the most effective content:`,

  UI_DESIGN: `You are an expert UI/UX designer assistant. Generate a comprehensive design brief for a landing page.

Analyze the requirements and create a detailed brief covering:
1. Design Objectives - What the design should achieve
2. Target User Considerations - User needs, behaviors, expectations
3. Visual Style Guidelines - Colors, typography, imagery direction
4. Layout Recommendations - Structure, hierarchy, key sections
5. User Experience Flow - Navigation, interactions, micro-animations
6. Responsive Considerations - Mobile, tablet, desktop adaptations
7. Accessibility Requirements - WCAG compliance considerations
8. Technical Constraints - Performance, browser compatibility

INPUT DATA:
- Project: {{projectName}}
- Business: {{businessName}}
- Industry: {{industry}}
- Target Audience: {{targetAudience}}
- Funnel Stage: {{funnelStage}}
- Offer: {{offer}}
- Hook: {{hook}}
- Headline: {{headline}}
- CTA: {{cta}}

Generate a clear, actionable design brief now:`,

  LANDING_PAGE_DEV: `You are an expert Full-Stack Developer assistant. Generate a comprehensive development brief for implementing a landing page.

Analyze the requirements and create a detailed brief covering:
1. Technology Stack - Frontend framework, CSS approach, build tools
2. Project Structure - File organization, component breakdown
3. Landing Page Sections - Hero, features, social proof, CTA sections
4. Responsive Design - Mobile-first approach, breakpoints
5. Performance Optimization - Image optimization, lazy loading, Core Web Vitals
6. SEO Implementation - Meta tags, schema markup, semantic HTML
7. Conversion Features - CTA styling, form handling, success states
8. Integration Requirements - Analytics, CRM, email marketing
9. Accessibility (WCAG) - Keyboard navigation, screen reader, ARIA labels
10. Testing Checklist - Cross-browser, mobile, performance testing

INPUT DATA:
- Project: {{projectName}}
- Business: {{businessName}}
- Industry: {{industry}}
- Target Audience: {{targetAudience}}
- Funnel Stage: {{funnelStage}}
- Offer: {{offer}}
- Hook: {{hook}}
- Headline: {{headline}}
- CTA: {{cta}}
- Pain Points: {{painPoints}}
- Desires: {{desires}}

Generate a clear, actionable development brief now:`
};

export default function PromptsPage() {
  const { user } = useAuth();
  const isPlatformAdmin = user?.role === 'platform_admin';

  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewPrompt, setViewPrompt] = useState(null);
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedFramework, setSelectedFramework] = useState('');
  const [customFramework, setCustomFramework] = useState(''); // For custom framework input
  const [showCustomFramework, setShowCustomFramework] = useState(false); // Toggle custom framework input
  const [expandedFrameworks, setExpandedFrameworks] = useState({});
  const [subCategories, setSubCategories] = useState([]); // For modal dropdown
  const [allSubCategories, setAllSubCategories] = useState([]); // For displaying in framework cards

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(promptSchema),
    defaultValues: {
      title: '',
      role: '',
      frameworkType: '',
      content: '',
      category: 'general',
      platform: 'all',
      funnelStage: 'all',
      creativeType: 'all',
      description: '',
      tags: '',
    },
  });

  const watchRole = watch('role');

  useEffect(() => {
    fetchPrompts();
    fetchAllSubCategories();
  }, []);

  // Only check Ollama status for platform admins
  useEffect(() => {
    if (isPlatformAdmin) {
      checkOllamaStatus();
    }
  }, [isPlatformAdmin]);

  useEffect(() => {
    setSelectedRole(watchRole || '');
  }, [watchRole]);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const response = await promptService.getPrompts();
      setPrompts(response.data || []);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch prompts');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllSubCategories = async () => {
    try {
      const response = await frameworkCategoryService.getCategories();
      setAllSubCategories(response.data || []);
    } catch (error) {
      console.error('Failed to fetch all subcategories:', error);
    }
  };

  const checkOllamaStatus = async () => {
    try {
      const response = await promptService.getOllamaStatus();
      setOllamaStatus(response.data);
    } catch (error) {
      setOllamaStatus({ available: false, error: 'Cannot connect to Ollama service' });
    }
  };

  const fetchSubCategories = async (frameworkType) => {
    try {
      const response = await frameworkCategoryService.getCategoriesByFramework(frameworkType);
      setSubCategories(response.data || []);
    } catch (error) {
      console.error('Failed to fetch subcategories:', error);
      setSubCategories([]);
    }
  };

  // Group prompts by framework for Content Planner
  const groupedByFramework = prompts
    .filter(p => p.role === 'content_writer' && p.frameworkType)
    .reduce((acc, prompt) => {
      const framework = prompt.frameworkType;
      if (!acc[framework]) {
        acc[framework] = {
          prompts: [],
          subcategories: {}
        };
      }
      acc[framework].prompts.push(prompt);

      // Also group by subcategory if present
      if (prompt.subCategory) {
        if (!acc[framework].subcategories[prompt.subCategory]) {
          acc[framework].subcategories[prompt.subCategory] = [];
        }
        acc[framework].subcategories[prompt.subCategory].push(prompt);
      }

      return acc;
    }, {});

  // Get prompts for other roles
  const otherRolePrompts = prompts.filter(p => p.role !== 'content_writer');

  const filteredPrompts = selectedRole === 'content_writer'
    ? prompts.filter(p => p.role === 'content_writer')
    : selectedRole
      ? prompts.filter(p => p.role === selectedRole)
      : prompts.filter(p => {
          const matchesSearch = !searchTerm ||
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.tags && p.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
          const matchesRole = !filterRole || p.role === filterRole;
          return matchesSearch && matchesRole;
        });

  const toggleFramework = (framework) => {
    setExpandedFrameworks(prev => ({
      ...prev,
      [framework]: !prev[framework]
    }));
  };

  const openAddModal = () => {
    setEditingPrompt(null);
    setSelectedFramework('');
    setCustomFramework('');
    setShowCustomFramework(false);
    setSubCategories([]); // Clear subcategories
    reset({
      title: '',
      role: '',
      frameworkType: '',
      subCategory: '',
      content: '',
      category: 'general',
      platform: 'all',
      funnelStage: 'all',
      creativeType: 'all',
      description: '',
      tags: '',
    });
    setShowModal(true);
  };

  const openEditModal = (prompt) => {
    setEditingPrompt(prompt);
    setSelectedRole(prompt.role);

    // Check if framework is a predefined one or custom
    const isPredefined = frameworkOptions.some(f => f.value === prompt.frameworkType);
    if (prompt.frameworkType && !isPredefined) {
      // Custom framework
      setSelectedFramework('__custom__');
      setCustomFramework(prompt.frameworkType);
      setShowCustomFramework(true);
    } else {
      setSelectedFramework(prompt.frameworkType || '');
      setCustomFramework('');
      setShowCustomFramework(false);
    }

    // Fetch subcategories if framework is set
    if (prompt.frameworkType) {
      fetchSubCategories(prompt.frameworkType);
    }
    reset({
      title: prompt.title || '',
      role: prompt.role || '',
      frameworkType: prompt.frameworkType || '',
      subCategory: prompt.subCategory || '',
      content: prompt.content || '',
      category: prompt.category || 'general',
      platform: prompt.platform || 'all',
      funnelStage: prompt.funnelStage || 'all',
      creativeType: prompt.creativeType || 'all',
      description: prompt.description || '',
      tags: (prompt.tags || []).join(', '),
    });
    setShowModal(true);
  };

  const handleFrameworkChange = (frameworkType) => {
    // Handle custom framework selection
    if (frameworkType === '__custom__') {
      setShowCustomFramework(true);
      setSelectedFramework('__custom__');
      setValue('frameworkType', '');
      setValue('subCategory', '');
      setSubCategories([]);
      return;
    }

    setShowCustomFramework(false);
    setCustomFramework('');
    setSelectedFramework(frameworkType);
    setValue('frameworkType', frameworkType);
    setValue('subCategory', ''); // Reset subcategory when framework changes

    // Fetch subcategories for the selected framework
    if (frameworkType) {
      fetchSubCategories(frameworkType);
    } else {
      setSubCategories([]);
    }

    // Auto-fill the content with framework template
    if (frameworkType && frameworkTemplates[frameworkType]) {
      setValue('content', frameworkTemplates[frameworkType]);
      // Also set a default title
      const framework = frameworkOptions.find(f => f.value === frameworkType);
      if (framework && !watch('title')) {
        setValue('title', framework.label);
      }
    }
  };

  const handleCustomFrameworkChange = (value) => {
    setCustomFramework(value);
    setValue('frameworkType', value.toUpperCase().replace(/\s+/g, '_'));
    setValue('subCategory', '');
    setSubCategories([]);
  };

  const onSubmit = async (data) => {
    try {
      // Ensure frameworkType is a string, not an array
      let frameworkTypeValue = data.frameworkType;
      if (Array.isArray(frameworkTypeValue)) {
        // If somehow an array was passed, take the first value
        frameworkTypeValue = frameworkTypeValue[0] || '';
      }
      // Ensure it's a string
      if (frameworkTypeValue) {
        frameworkTypeValue = String(frameworkTypeValue).trim();
      }

      const formattedData = {
        title: data.title,
        role: data.role,
        frameworkType: data.role === 'content_writer' ? frameworkTypeValue : undefined,
        subCategory: data.role === 'content_writer' && data.subCategory ? data.subCategory : undefined,
        content: data.content,
        category: data.role === 'content_writer' ? undefined : (data.category || 'general'),
        platform: data.role === 'content_writer' ? undefined : (data.platform || 'all'),
        funnelStage: data.funnelStage || 'all',
        creativeType: data.creativeType || 'all',
        description: data.description || undefined,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };

      if (editingPrompt) {
        await promptService.updatePrompt(editingPrompt._id, formattedData);
        toast.success('Prompt updated successfully');
      } else {
        await promptService.createPrompt(formattedData);
        toast.success('Prompt created successfully');
      }
      setShowModal(false);
      fetchPrompts();
    } catch (error) {
      toast.error(error.message || 'Failed to save prompt');
    }
  };

  const handleDelete = async (promptId) => {
    try {
      await promptService.deletePrompt(promptId);
      toast.success('Prompt deleted successfully');
      setDeleteConfirm(null);
      fetchPrompts();
    } catch (error) {
      toast.error(error.message || 'Failed to delete prompt');
    }
  };

  const handleToggleActive = async (prompt) => {
    try {
      await promptService.togglePromptActive(prompt._id);
      toast.success(`Prompt ${prompt.isActive ? 'deactivated' : 'activated'} successfully`);
      fetchPrompts();
    } catch (error) {
      toast.error(error.message || 'Failed to update prompt status');
    }
  };

  const getRoleLabel = (role) => {
    return roleOptions.find(r => r.value === role)?.label || role;
  };

  const getCategoryLabel = (category) => {
    return categoryOptions.find(c => c.value === category)?.label || category;
  };

  const getFrameworkLabel = (frameworkType) => {
    const predefined = frameworkOptions.find(f => f.value === frameworkType);
    if (predefined) return predefined.label;
    // Return custom framework name formatted nicely
    return frameworkType ? frameworkType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : frameworkType;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prompt Templates</h1>
          <p className="text-gray-600 mt-1">Manage AI prompt templates for content creation</p>
        </div>
        <div className="flex items-center gap-3">
          {/* {ollamaStatus && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
              ollamaStatus.available
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              <Cpu className="w-4 h-4" />
              <span>
                {ollamaStatus.currentProvider?.toUpperCase() || 'AI'}: {ollamaStatus.available ? 'Connected' : 'Offline'}
                {ollamaStatus.model && ` (${ollamaStatus.model})`}
              </span>
            </div>
          )} */}
          {isPlatformAdmin && (
            <Button onClick={openAddModal}>
              <Plus className="w-4 h-4 mr-2" />
              Add Prompt
            </Button>
          )}
        </div>
      </div>

      {/* Framework Overview for Content Planner */}
     

      {/* Search and Filter */}
      <Card>
        <CardBody className="py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search prompts by title, content, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              <option value="">All Roles</option>
              {roleOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </CardBody>
      </Card>

      {/* Prompts List */}
      {loading ? (
        <Card>
          <CardBody className="py-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-500 mt-4">Loading prompts...</p>
          </CardBody>
        </Card>
      ) : filteredPrompts.length === 0 ? (
        <Card>
          <CardBody className="py-12">
            <div className="text-center">
              <PenTool className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No prompts found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || filterRole ? 'Try different search criteria' : 'Get started by creating your first prompt template'}
              </p>
              {!searchTerm && !filterRole && isPlatformAdmin && (
                <Button onClick={openAddModal}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Prompt
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Content Planner Prompts - Grouped by Framework */}
          {filterRole === 'content_writer' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Content Planner Frameworks
              </h3>

              {/* Frameworks with prompts */}
              {Object.entries(groupedByFramework).map(([framework, data]) => {
                const frameworkPrompts = data.prompts || data;
                const subcategories = data.subcategories || {};
                const subcategoryKeys = Object.keys(subcategories);
                const uncategorizedPrompts = frameworkPrompts.filter(p => !p.subCategory);

                return (
                <Card key={framework} className="overflow-hidden">
                  <button
                    onClick={() => toggleFramework(framework)}
                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 flex items-center justify-between hover:from-purple-100 hover:to-indigo-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-purple-500" />
                      <div className="text-left">
                        <div className="font-medium text-gray-900">{getFrameworkLabel(framework)}</div>
                        <div className="text-sm text-gray-500">
                          {frameworkPrompts.length} prompt{frameworkPrompts.length !== 1 ? 's' : ''}
                          {subcategoryKeys.length > 0 && (
                            <span className="ml-2 text-purple-600">
                              • {subcategoryKeys.length} subcategor{subcategoryKeys.length !== 1 ? 'ies' : 'y'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {expandedFrameworks[framework] ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {expandedFrameworks[framework] && (
                    <div className="p-4">
                      {/* Subcategory Groups */}
                      {subcategoryKeys.length > 0 && (
                        <div className="space-y-4 mb-4">
                          {subcategoryKeys.map(subKey => {
                            const subPrompts = subcategories[subKey] || [];
                            const subDetails = allSubCategories.find(c => c.key === subKey && c.frameworkType === framework);
                            return (
                              <div key={subKey} className="border-l-2 border-indigo-200 pl-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Tag className="w-4 h-4 text-indigo-500" />
                                  <h5 className="text-sm font-medium text-indigo-700">
                                    {subDetails?.displayName || subKey}
                                  </h5>
                                  <span className="text-xs text-gray-400">
                                    {subPrompts.length} prompt{subPrompts.length !== 1 ? 's' : ''}
                                  </span>
                                  {subDetails?.isSystem && (
                                    <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">Default</span>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  {subPrompts.map((prompt) => (
                                    <div
                                      key={prompt._id}
                                      className={`p-3 rounded-lg border transition-all ${
                                        !prompt.isActive ? 'opacity-60 bg-gray-50' : 'bg-white'
                                      } ${editingPrompt?._id === prompt._id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                          <h6 className="font-medium text-gray-900 text-sm truncate">{prompt.title}</h6>
                                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                            {prompt.description || prompt.content.substring(0, 80)}...
                                          </p>
                                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                            <span>Used {prompt.usageCount || 0}x</span>
                                            {prompt.isActive ? (
                                              <span className="text-green-500">Active</span>
                                            ) : (
                                              <span>Inactive</span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex gap-1">
                                          <button onClick={() => setViewPrompt(prompt)} className="p-1 text-gray-400 hover:text-primary-600 rounded" title="View"><Eye className="w-3.5 h-3.5" /></button>
                                          {isPlatformAdmin && (
                                            <>
                                              <button onClick={() => openEditModal(prompt)} className="p-1 text-gray-400 hover:text-primary-600 rounded" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                                              <button onClick={() => handleToggleActive(prompt)} className={`p-1 rounded ${prompt.isActive ? 'text-green-500' : 'text-gray-400 hover:text-green-500'}`} title={prompt.isActive ? 'Deactivate' : 'Activate'}><Power className="w-3.5 h-3.5" /></button>
                                              <button onClick={() => setDeleteConfirm(prompt)} className="p-1 text-gray-400 hover:text-red-600 rounded" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Uncategorized Prompts (no subCategory) */}
                      {uncategorizedPrompts.length > 0 && (
                        <div className={subcategoryKeys.length > 0 ? 'border-t border-gray-200 pt-4' : ''}>
                          {subcategoryKeys.length > 0 && (
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-gray-600">Framework-level Prompts</span>
                              <span className="text-xs text-gray-400">{uncategorizedPrompts.length}</span>
                            </div>
                          )}
                          <div className="space-y-2">
                            {uncategorizedPrompts.map((prompt) => (
                              <div
                                key={prompt._id}
                                className={`p-3 rounded-lg border transition-all ${
                                  !prompt.isActive ? 'opacity-60 bg-gray-50' : 'bg-white'
                                } ${editingPrompt?._id === prompt._id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <h6 className="font-medium text-gray-900 text-sm truncate">{prompt.title}</h6>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                      {prompt.description || prompt.content.substring(0, 80)}...
                                    </p>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                      <span>Used {prompt.usageCount || 0}x</span>
                                      {prompt.isActive ? (
                                        <span className="text-green-500">Active</span>
                                      ) : (
                                        <span>Inactive</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <button onClick={() => setViewPrompt(prompt)} className="p-1 text-gray-400 hover:text-primary-600 rounded" title="View"><Eye className="w-3.5 h-3.5" /></button>
                                    {isPlatformAdmin && (
                                      <>
                                        <button onClick={() => openEditModal(prompt)} className="p-1 text-gray-400 hover:text-primary-600 rounded" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => handleToggleActive(prompt)} className={`p-1 rounded ${prompt.isActive ? 'text-green-500' : 'text-gray-400 hover:text-green-500'}`} title={prompt.isActive ? 'Deactivate' : 'Activate'}><Power className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => setDeleteConfirm(prompt)} className="p-1 text-gray-400 hover:text-red-600 rounded" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );})}

              {/* Empty frameworks - show all available frameworks */}
              {frameworkOptions.filter(f => !groupedByFramework[f.value]).length > 0 && (
                <Card className="border-dashed">
                  <CardBody className="py-6">
                    <div className="text-center">
                      <BookOpen className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                      <h4 className="font-medium text-gray-700">Available Frameworks</h4>
                      <p className="text-sm text-gray-500 mt-1 mb-4">
                        These frameworks don't have prompts yet. Create prompts for them.
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {frameworkOptions.filter(f => !groupedByFramework[f.value]).map(f => (
                          <button
                            key={f.value}
                            onClick={() => {
                              setValue('role', 'content_writer');
                              setSelectedRole('content_writer');
                              handleFrameworkChange(f.value);
                              setShowModal(true);
                            }}
                            className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                          >
                            {f.value}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>
          )}

          {/* Other Role Prompts - Regular Grid View */}
          {(filterRole !== 'content_writer' || !filterRole) && otherRolePrompts.length > 0 && (
            <div>
              {filterRole !== 'content_writer' && (
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {roleOptions.find(r => r.value === filterRole)?.label}
                </h3>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {otherRolePrompts
                  .filter(p => !filterRole || p.role === filterRole)
                  .filter(p => {
                    if (!searchTerm) return true;
                    return p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           p.content.toLowerCase().includes(searchTerm.toLowerCase());
                  })
                  .map((prompt) => (
                    <Card key={prompt._id} className={`hover:shadow-md transition-shadow ${!prompt.isActive ? 'opacity-60' : ''}`}>
                      <CardBody className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900 truncate">{prompt.title}</h3>
                              {!prompt.isActive && (
                                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">Inactive</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className="px-2 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full">
                                {getRoleLabel(prompt.role)}
                              </span>
                              {prompt.category && (
                                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                                  {getCategoryLabel(prompt.category)}
                                </span>
                              )}
                              {prompt.platform && prompt.platform !== 'all' && (
                                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                                  {platformOptions.find(p => p.value === prompt.platform)?.label}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <button
                              onClick={() => setViewPrompt(prompt)}
                              className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {isPlatformAdmin && (
                              <>
                                <button
                                  onClick={() => openEditModal(prompt)}
                                  className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleToggleActive(prompt)}
                                  className={`p-1.5 rounded hover:bg-gray-100 ${prompt.isActive ? 'text-green-500 hover:text-green-600' : 'text-gray-400 hover:text-green-500'}`}
                                  title={prompt.isActive ? 'Deactivate' : 'Activate'}
                                >
                                  <Power className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(prompt)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{prompt.description || prompt.content.substring(0, 100)}...</p>

                        {prompt.tags && prompt.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {prompt.tags.slice(0, 4).map((tag, index) => (
                              <span key={index} className="px-2 py-0.5 text-xs bg-gray-50 text-gray-500 rounded">
                                {tag}
                              </span>
                            ))}
                            {prompt.tags.length > 4 && (
                              <span className="px-2 py-0.5 text-xs bg-gray-50 text-gray-500 rounded">
                                +{prompt.tags.length - 4}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                          <span>Used {prompt.usageCount || 0} times</span>
                          <span>{new Date(prompt.createdAt).toLocaleDateString()}</span>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <div className="p-6 max-h-[90vh] overflow-y-auto w-full max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {editingPrompt ? 'Edit Prompt' : 'Add New Prompt'}
            </h2>
            <button
              onClick={() => setShowModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Basic Information</h3>
              <div className="space-y-4">
                <Input
                  label="Title *"
                  placeholder="e.g., Instagram Ad Copy Generator"
                  error={errors.title?.message}
                  {...register('title')}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <select
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    {...register('role')}
                    onChange={(e) => {
                      setValue('role', e.target.value);
                      setSelectedRole(e.target.value);
                      if (e.target.value !== 'content_writer') {
                        setValue('frameworkType', '');
                        setSelectedFramework('');
                      }
                    }}
                  >
                    <option value="">Select a role</option>
                    {roleOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {errors.role && <p className="text-sm text-red-500 mt-1">{errors.role.message}</p>}
                </div>

                {/* Framework Type - Only for Content Planner */}
                {selectedRole === 'content_writer' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Framework Type *
                      <span className="ml-2 text-xs text-purple-600 inline-flex items-center">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI-Optimized Template
                      </span>
                    </label>
                    <select
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      value={selectedFramework}
                      onChange={(e) => handleFrameworkChange(e.target.value)}
                    >
                      <option value="">Select a framework</option>
                      {frameworkOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                      <option value="__custom__">+ Add Custom Framework</option>
                    </select>
                    {errors.frameworkType && <p className="text-sm text-red-500 mt-1">{errors.frameworkType.message}</p>}

                    {/* Custom Framework Input */}
                    {showCustomFramework && (
                      <div className="mt-2">
                        <input
                          type="text"
                          placeholder="Enter custom framework name (e.g., MY_CUSTOM_FRAMEWORK)"
                          className="w-full px-4 py-2 rounded-lg border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-purple-50"
                          value={customFramework}
                          onChange={(e) => handleCustomFrameworkChange(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Use uppercase letters with underscores (e.g., VIDEO_SCRIPT, SALES_EMAIL)
                        </p>
                      </div>
                    )}

                    {/* Show description for predefined frameworks */}
                    {selectedFramework && !showCustomFramework && frameworkOptions.find(f => f.value === selectedFramework) && (
                      <p className="text-xs text-gray-500 mt-1">
                        {frameworkOptions.find(f => f.value === selectedFramework)?.description}
                      </p>
                    )}
                  </div>
                )}

                {/* SubCategory - Optional, only for Content Planner with Framework */}
                {selectedRole === 'content_writer' && selectedFramework && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Subcategory (Optional)
                      </label>
                    </div>
                    <select
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      {...register('subCategory')}
                    >
                      <option value="">No subcategory (framework-level)</option>
                      {subCategories.map(cat => (
                        <option key={cat._id} value={cat.key}>
                          {cat.displayName}{cat.isSystem ? ' (Default)' : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Subcategories allow more granular prompt organization within a framework.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prompt Content *</label>
                  <textarea
                    placeholder={selectedRole === 'content_writer' ? "Select a framework to auto-fill the template..." : "Enter the prompt template..."}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 min-h-[300px] font-mono text-sm"
                    {...register('content')}
                  />
                  {errors.content && <p className="text-sm text-red-500 mt-1">{errors.content.message}</p>}
                  {selectedRole === 'content_writer' && selectedFramework && (
                    <p className="text-xs text-gray-500 mt-1">
                      Framework template loaded. The placeholders (like {'{{problem}}'}, {'{{audience}}'}) will be replaced with actual task context when used.
                    </p>
                  )}
                </div>

                <Input
                  label="Description"
                  placeholder="Brief description of what this prompt does..."
                  error={errors.description?.message}
                  {...register('description')}
                />
              </div>
            </div>

            {/* Classification - Only show for non-content_writer roles */}
            {selectedRole && selectedRole !== 'content_writer' && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Classification</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      {...register('category')}
                    >
                      {categoryOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                    <select
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      {...register('platform')}
                    >
                      {platformOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Funnel Stage</label>
                    <select
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      {...register('funnelStage')}
                    >
                      {funnelStageOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Creative Type</label>
                    <select
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      {...register('creativeType')}
                    >
                      {creativeTypeOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Tags */}
            <div>
              <Input
                label="Tags"
                placeholder="Enter tags separated by commas (e.g., sales, awareness, instagram)"
                error={errors.tags?.message}
                {...register('tags')}
              />
              <p className="text-xs text-gray-500 mt-1">Tags help with searching and organizing prompts</p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingPrompt ? 'Update Prompt' : 'Create Prompt'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* View Prompt Modal */}
      <Modal isOpen={!!viewPrompt} onClose={() => setViewPrompt(null)}>
        {viewPrompt && (
          <div className="p-6 max-h-[90vh] overflow-y-auto w-full max-w-3xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{viewPrompt.title}</h2>
              <button
                onClick={() => setViewPrompt(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 text-sm bg-primary-100 text-primary-700 rounded-full">
                  {getRoleLabel(viewPrompt.role)}
                </span>
                {viewPrompt.frameworkType && (
                  <span className="px-2 py-1 text-sm bg-purple-100 text-purple-700 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {getFrameworkLabel(viewPrompt.frameworkType)}
                  </span>
                )}
                {viewPrompt.role !== 'content_writer' && viewPrompt.category && (
                  <span className="px-2 py-1 text-sm bg-gray-100 text-gray-600 rounded-full">
                    {getCategoryLabel(viewPrompt.category)}
                  </span>
                )}
                {viewPrompt.role !== 'content_writer' && viewPrompt.platform && viewPrompt.platform !== 'all' && (
                  <span className="px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded-full">
                    {platformOptions.find(p => p.value === viewPrompt.platform)?.label}
                  </span>
                )}
                {viewPrompt.funnelStage && viewPrompt.funnelStage !== 'all' && (
                  <span className="px-2 py-1 text-sm bg-purple-100 text-purple-700 rounded-full">
                    {funnelStageOptions.find(f => f.value === viewPrompt.funnelStage)?.label}
                  </span>
                )}
              </div>

              {viewPrompt.description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                  <p className="text-gray-600">{viewPrompt.description}</p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Prompt Content</h4>
                <pre className="bg-gray-50 p-4 rounded-lg text-sm text-gray-800 whitespace-pre-wrap overflow-x-auto max-h-[400px] overflow-y-auto">
                  {viewPrompt.content}
                </pre>
              </div>

              {viewPrompt.tags && viewPrompt.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewPrompt.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 text-sm bg-gray-100 text-gray-600 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
                <span>Used {viewPrompt.usageCount || 0} times</span>
                <span>Created: {new Date(viewPrompt.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <div className="p-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Prompt</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deleteConfirm?.title}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDelete(deleteConfirm._id)}
              >
                Delete Prompt
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}