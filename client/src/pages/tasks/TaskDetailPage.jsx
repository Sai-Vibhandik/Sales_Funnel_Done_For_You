import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Card, CardBody, CardHeader, Button, Spinner, Badge, Textarea } from '@/components/ui';
import { taskService, promptService, aiService, frameworkCategoryService } from '@/services/api';
import TaskProgressTimeline from '@/components/tasks/TaskProgressTimeline';
import {
  ClipboardList, Play, Send, CheckCircle, XCircle, Clock,
  FileText, ExternalLink, Upload, X, FileIcon, Video, Image,
  AlertCircle, ArrowLeft, Download, Eye, Link, MessageSquare, Layout, Code, Palette,
  PenTool, Sparkles, Copy, ChevronRight, BookOpen, ChevronDown, ChevronUp
} from 'lucide-react';
import { STATUS_CONFIG, getStatusConfig } from '@/constants/taskStatuses';
import BrandSettingsView from '@/components/tasks/BrandSettingsView';

// Utility function to ensure URLs have proper protocol
const normalizeUrl = (url) => {
  if (!url) return url;
  // If already has protocol, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // If it looks like a URL (has a dot or starts with www), add https://
  if (url.includes('.') || url.startsWith('www.')) {
    return `https://${url}`;
  }
  // Otherwise return as-is (could be a relative path or invalid)
  return url;
};

const PLATFORM_LABELS = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
  google: 'Google',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  twitter: 'Twitter/X',
  whatsapp: 'WhatsApp'
};

const FUNNEL_STAGE_LABELS = {
  awareness: 'Awareness',
  consideration: 'Consideration',
  conversion: 'Conversion',
  influencer_ads: 'Influencer Ads',
  retargeting: 'Retargeting',
  engagement: 'Engagement'
};

const CREATIVE_TYPE_LABELS = {
  image_creative: 'Image Creative',
  video_creative: 'Video Creative',
  carousel_creative: 'Carousel Creative',
  reel: 'Reel',
  static_ad: 'Static Ad',
  landing_page_design: 'Landing Page Design',
  landing_page_page: 'Landing Page'
};

export default function TaskDetailPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  // ─── FIX: Use ref to track uploading state for immediate synchronous check
  // This prevents multiple clicks before React state updates
  const isUploadingRef = useRef(false);

  // Rejection reasons for dropdown
  const REJECTION_REASONS = [
    { value: 'quality', label: 'Quality issues' },
    { value: 'brand', label: 'Brand guideline mismatch' },
    { value: 'instructions', label: 'Did not follow instructions' },
    { value: 'design', label: 'Design/Layout issues' },
    { value: 'content', label: 'Content/Copy issues' },
    { value: 'technical', label: 'Technical issues' },
    { value: 'other', label: 'Other' },
  ];

  // Check if user is organization admin (view-only for tasks)
  const isAdmin = user?.role === 'admin';

  // Prompts state
  const [prompts, setPrompts] = useState([]);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [showPromptsPanel, setShowPromptsPanel] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [showGeneratedPrompt, setShowGeneratedPrompt] = useState(false);
  const [subCategories, setSubCategories] = useState([]); // All subcategories

  // AI Content Brief state
  const [aiFrameworks, setAiFrameworks] = useState([]);
  const [selectedFramework, setSelectedFramework] = useState('');
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [aiBrief, setAiBrief] = useState('');
  const [showFrameworkSelector, setShowFrameworkSelector] = useState(false);

  // AI Provider state
  const [aiProviders, setAiProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('ollama');
  const [providerStatus, setProviderStatus] = useState(null);

  // Prompt Template search state
  const [promptSearchTerm, setPromptSearchTerm] = useState('');
  const [showPromptDropdown, setShowPromptDropdown] = useState(false);
  const promptDropdownRef = useRef(null);

  // Approved content state (for graphic designers and video editors to paste content)
  const [approvedContent, setApprovedContent] = useState('');

  // Get the back URL from location state, default based on user role
  const getBackUrl = () => {
    // If we have a 'from' state, use it
    if (location.state?.from) {
      return location.state.from;
    }
    // Default based on user role
    if (user?.role === 'performance_marketer' || user?.role === 'admin') {
      return '/assets';
    }
    if (user?.role === 'tester') {
      return '/tester-review';
    }
    return '/tasks';
  };

  // Handle back navigation - use browser history if available
  const handleBack = () => {
    // If we have navigation history, go back
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Otherwise use the default URL
      navigate(getBackUrl());
    }
  };

  // Submission form state - different fields for different task types
  const [submissionForm, setSubmissionForm] = useState({
    // For content creation tasks (content_writer)
    contentLink: '',
    contentFile: null,
    contentNotes: '',
    // For creative tasks (graphic_designer, video_editor)
    creativeLink: '',
    creativeFile: null,
    reviewNotes: '',
    // For landing page design (ui_ux_designer)
    designLink: '',
    designFile: null,
    designNotes: '',
    // For landing page development (developer)
    implementationUrl: '',
    repoLink: '',
    devNotes: ''
  });

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  // Fetch prompts when task is loaded
  useEffect(() => {
    if (task && user && ['content_writer', 'graphic_designer', 'video_editor', 'ui_ux_designer', 'developer'].includes(user.role)) {
      fetchPrompts();
    }
  }, [task, user]);

  // Fetch AI frameworks for content writers, graphic designers, video editors, UI/UX designers, and developers
  useEffect(() => {
    if (['content_writer', 'graphic_designer', 'video_editor', 'ui_ux_designer', 'developer'].includes(user?.role)) {
      fetchAIFrameworks();
      fetchSubCategories();
      fetchAIProviders();
    }
  }, [user]);

  // Click outside handler for prompt dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (promptDropdownRef.current && !promptDropdownRef.current.contains(event.target)) {
        setShowPromptDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch subcategories for AI frameworks
  const fetchSubCategories = async () => {
    try {
      const response = await frameworkCategoryService.getCategories();
      setSubCategories(response.data || []);
    } catch (error) {
      console.error('Failed to fetch subcategories:', error);
    }
  };

  // Set initial AI brief and framework from task
  useEffect(() => {
    if (task) {
      if (task.aiPrompt) {
        setAiBrief(task.aiPrompt);
      }
      if (task.aiFramework) {
        setSelectedFramework(task.aiFramework);
      }
    }
  }, [task]);

  const fetchAIFrameworks = async () => {
    try {
      const response = await aiService.getFrameworks();
      setAiFrameworks(response.data || []);
    } catch (error) {
      console.error('Failed to fetch frameworks:', error);
    }
  };

  const fetchAIProviders = async () => {
    try {
      const response = await aiService.getProviders();
      setAiProviders(response.data?.providers || []);
      setSelectedProvider(response.data?.preferredProvider || 'ollama');
      setProviderStatus(response.data?.status || null);
    } catch (error) {
      console.error('Failed to fetch AI providers:', error);
    }
  };

  const handleProviderChange = async (provider) => {
    try {
      await aiService.setProvider(provider);
      setSelectedProvider(provider);
      toast.success(`AI provider changed to ${provider}`);
    } catch (error) {
      toast.error('Failed to change AI provider');
      console.error('Error changing AI provider:', error);
    }
  };

  const handleGenerateAIBrief = async () => {
    // Framework is required for content_writer, graphic_designer, video_editor
    // UI/UX designers and Developers can generate brief without framework (uses default template)
    const rolesRequiringFramework = ['content_writer', 'graphic_designer', 'video_editor'];
    if (rolesRequiringFramework.includes(user?.role) && !selectedFramework) {
      toast.error('Please select a framework first');
      return;
    }

    try {
      setGeneratingBrief(true);
      setAiBrief('');

      const response = await aiService.generateBrief({
        taskId: task._id,
        frameworkType: selectedFramework || null, // null for ui_ux_designer
        promptId: selectedPrompt?._id || null,
        approvedContent: approvedContent || null
      });

      setAiBrief(response.data.contentBrief);
      toast.success('AI Content Brief generated successfully!');
    } catch (error) {
      console.error('Error generating AI brief:', error);
      toast.error(error.message || 'Failed to generate content brief. Please try again.');
    } finally {
      setGeneratingBrief(false);
    }
  };

  const handleRegenerateBrief = async () => {
    // Framework is required for content_writer, graphic_designer, video_editor
    // UI/UX designers and Developers can regenerate brief without framework (uses default template)
    const rolesRequiringFramework = ['content_writer', 'graphic_designer', 'video_editor'];
    if (rolesRequiringFramework.includes(user?.role) && !selectedFramework) {
      toast.error('Please select a framework first');
      return;
    }

    try {
      setGeneratingBrief(true);

      const response = await aiService.regenerateBrief(task._id, {
        frameworkType: selectedFramework || null,
        promptId: selectedPrompt?._id || null,
        approvedContent: approvedContent || null
      });

      setAiBrief(response.data.contentBrief);
      toast.success('Content brief regenerated!');
    } catch (error) {
      toast.error(error.message || 'Failed to regenerate brief');
    } finally {
      setGeneratingBrief(false);
    }
  };

  const fetchPrompts = async () => {
    if (!user) return;
    try {
      setPromptsLoading(true);
      // Map task type to prompt role
      const roleMap = {
        content_writer: 'content_writer',
        graphic_designer: 'graphic_designer',
        video_editor: 'video_editor',
        ui_ux_designer: 'ui_ux_designer',
        developer: 'developer',
        tester: 'tester'
      };
      const promptRole = roleMap[user.role] || user.role;
      const response = await promptService.getPromptsByRole(promptRole);
      setPrompts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch prompts:', error);
    } finally {
      setPromptsLoading(false);
    }
  };

  const handleGeneratePrompt = async () => {
    if (!selectedPrompt) {
      toast.error('Please select a prompt template first');
      return;
    }

    try {
      setGeneratingPrompt(true);
      setGeneratedPrompt('');

      const strategyContext = task.strategyContext || {};

      // Build the request payload
      const requestPayload = {
        basePromptId: selectedPrompt._id,
        context: {
          problem: strategyContext.painPoints?.join(', ') || '',
          audience: strategyContext.targetAudience || '',
          platform: strategyContext.platform || '',
          funnelStage: strategyContext.funnelStage || '',
          goal: 'Create engaging content',
          offer: strategyContext.offer || '',
          creativeType: strategyContext.creativeType || task.assetType || '',
          hook: strategyContext.hook || '',
          headline: strategyContext.headline || '',
          cta: strategyContext.cta || '',
          brandName: task.projectId?.businessName || task.projectId?.projectName || '',
          industry: strategyContext.industry || '',
          painPoints: strategyContext.painPoints || [],
          desires: strategyContext.desires || []
        }
      };

      // If the prompt has a frameworkType, include it
      if (selectedPrompt.frameworkType) {
        requestPayload.frameworkType = selectedPrompt.frameworkType;
      }

      const response = await promptService.generatePrompt(requestPayload);

      setGeneratedPrompt(response.data?.finalPrompt || '');
      setShowGeneratedPrompt(true);
      toast.success('Prompt generated successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to generate prompt. Make sure Ollama is running.');
    } finally {
      setGeneratingPrompt(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const fetchTask = async () => {
    try {
      setLoading(true);
      const res = await taskService.getTask(taskId);
      setTask(res.data);
      // Initialize submission form with existing data based on task type
      if (res.data.taskType === 'content_creation') {
        setSubmissionForm({
          contentLink: res.data.contentLink || '',
          contentNotes: res.data.contentNotes || '',
          creativeLink: '',
          reviewNotes: '',
          designLink: '',
          designNotes: '',
          implementationUrl: '',
          repoLink: '',
          devNotes: ''
        });
      } else if (res.data.taskType === 'landing_page_design') {
        setSubmissionForm({
          designLink: res.data.designLink || '',
          designNotes: res.data.designNotes || '',
          contentLink: '',
          contentNotes: '',
          creativeLink: '',
          reviewNotes: '',
          implementationUrl: '',
          repoLink: '',
          devNotes: ''
        });
      } else if (res.data.taskType === 'landing_page_development') {
        setSubmissionForm({
          implementationUrl: res.data.implementationUrl || '',
          repoLink: res.data.repoLink || '',
          devNotes: res.data.devNotes || '',
          contentLink: '',
          contentNotes: '',
          creativeLink: '',
          reviewNotes: '',
          designLink: '',
          designNotes: ''
        });
      } else {
        // Graphic design, video editing, and other creative tasks
        setSubmissionForm({
          creativeLink: res.data.creativeLink || '',
          reviewNotes: res.data.reviewNotes || '',
          contentLink: '',
          contentNotes: '',
          designLink: '',
          designNotes: '',
          implementationUrl: '',
          repoLink: '',
          devNotes: ''
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load task');
      navigate(getBackUrl());
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      await taskService.updateTask(task._id, { status: newStatus });
      toast.success('Task status updated');
      fetchTask();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update task');
    }
  };

  const handleTesterApprove = async () => {
    // Check if task is in reviewable status before attempting approval
    const reviewableStatuses = ['content_submitted', 'design_submitted', 'development_submitted', 'submitted'];
    if (!reviewableStatuses.includes(task.status)) {
      toast.error(`Cannot approve: Task status is "${task.status}" (needs to be in submitted status)`);
      return;
    }

    try {
      await taskService.testerReview(task._id, { approved: true });
      toast.success('Task approved successfully');
      fetchTask();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve task');
    }
  };

  const handleTesterReject = async () => {
    if (!rejectionNote.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    try {
      await taskService.testerReview(task._id, {
        approved: false,
        rejectionNote: rejectionNote.trim(),
        rejectionReason
      });
      toast.success('Task rejected with feedback');
      setShowRejectModal(false);
      setRejectionNote('');
      setRejectionReason('');
      fetchTask();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject task');
    }
  };

  const handleMarketerApprove = async () => {
    try {
      await taskService.marketerReview(task._id, { approved: true });
      toast.success('Task approved successfully');
      fetchTask();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve task');
    }
  };

  const handleMarketerReject = async () => {
    if (!rejectionNote.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    try {
      await taskService.marketerReview(task._id, {
        approved: false,
        rejectionNote: rejectionNote.trim(),
        rejectionReason
      });
      toast.success('Task rejected with feedback');
      setShowRejectModal(false);
      setRejectionNote('');
      setRejectionReason('');
      fetchTask();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject task');
    }
  };

  const handleSubmitForReview = async () => {
    // Guard against concurrent uploads using both ref and state
    if (uploading || isUploadingRef.current) return;

    try {
      setUploading(true);
      isUploadingRef.current = true;

      // Build update data based on task type
      let updateData = { submittedAt: new Date() };

      // ============ CONTENT CREATION TASK ============
      if (task.taskType === 'content_creation') {
        // Validate: content link is required
        if (!submissionForm.contentLink.trim()) {
          toast.error('Please provide a content link');
          setUploading(false);
          isUploadingRef.current = false;
          return;
        }

        updateData.status = 'content_submitted';
        updateData.contentLink = submissionForm.contentLink || null;
        updateData.contentNotes = submissionForm.contentNotes || null;

        // Upload files if any (optional)
        if (selectedFiles.length > 0) {
          try {
            const formData = new FormData();
            selectedFiles.forEach(file => {
              formData.append('files', file);
            });
            const uploadRes = await taskService.uploadFiles(task._id, formData);
            console.log('Upload response:', uploadRes);

            // Get the uploaded file info and save to contentFile
            if (uploadRes.data?.outputFiles && uploadRes.data.outputFiles.length > 0) {
              const uploadedFile = uploadRes.data.outputFiles[uploadRes.data.outputFiles.length - 1];
              updateData.contentFile = {
                name: uploadedFile.name,
                path: uploadedFile.path,
                publicId: uploadedFile.publicId,
                uploadedAt: new Date()
              };
            }
          } catch (uploadError) {
            console.error('File upload error:', uploadError);
            toast.error(uploadError?.message || 'Failed to upload file');
            setUploading(false);
            isUploadingRef.current = false;
            return;
          }
        }
      }
      // ============ LANDING PAGE DESIGN TASK ============
      else if (task.taskType === 'landing_page_design') {
        // Validate: design link is required
        if (!submissionForm.designLink.trim()) {
          toast.error('Please provide a design link');
          setUploading(false);
          isUploadingRef.current = false;
          return;
        }

        updateData.status = 'design_submitted';
        updateData.designLink = submissionForm.designLink || null;
        updateData.designNotes = submissionForm.designNotes || null;

        // Upload files if any (optional)
        if (selectedFiles.length > 0) {
          try {
            const formData = new FormData();
            selectedFiles.forEach(file => {
              formData.append('files', file);
            });
            const uploadRes = await taskService.uploadFiles(task._id, formData);
            console.log('Upload response:', uploadRes);

            // Get the uploaded file info and save to designFile
            if (uploadRes.data?.outputFiles && uploadRes.data.outputFiles.length > 0) {
              const uploadedFile = uploadRes.data.outputFiles[uploadRes.data.outputFiles.length - 1];
              updateData.designFile = {
                name: uploadedFile.name,
                path: uploadedFile.path,
                publicId: uploadedFile.publicId,
                uploadedAt: new Date()
              };
            }
          } catch (uploadError) {
            console.error('File upload error:', uploadError);
            toast.error(uploadError?.message || 'Failed to upload file');
            setUploading(false);
            isUploadingRef.current = false;
            return;
          }
        }
      }
      // ============ LANDING PAGE DEVELOPMENT TASK ============
      else if (task.taskType === 'landing_page_development') {
        // Validate implementation URL
        if (!submissionForm.implementationUrl.trim()) {
          toast.error('Please provide the landing page URL');
          setUploading(false);
          isUploadingRef.current = false;
          return;
        }

        updateData.status = 'development_submitted';
        updateData.implementationUrl = submissionForm.implementationUrl;
        updateData.repoLink = submissionForm.repoLink || null;
        updateData.devNotes = submissionForm.devNotes || null;
      }
      // ============ CREATIVE TASKS (Graphic Design, Video Editing) ============
      else {
        // Validate: creative link is required
        if (!submissionForm.creativeLink.trim()) {
          toast.error('Please provide a creative link');
          setUploading(false);
          isUploadingRef.current = false;
          return;
        }

        updateData.status = 'design_submitted';
        updateData.creativeLink = submissionForm.creativeLink || null;
        updateData.reviewNotes = submissionForm.reviewNotes || null;

        // Upload files if any (optional) - files are stored in outputFiles array
        if (selectedFiles.length > 0) {
          try {
            const formData = new FormData();
            selectedFiles.forEach(file => {
              formData.append('files', file);
            });
            const uploadRes = await taskService.uploadFiles(task._id, formData);
            console.log('Upload response:', uploadRes);
          } catch (uploadError) {
            console.error('File upload error:', uploadError);
            toast.error(uploadError?.message || 'Failed to upload file');
            setUploading(false);
            isUploadingRef.current = false;
            return;
          }
        }
      }

      // Update task with submission data
      await taskService.updateTask(task._id, updateData);

      toast.success('Task submitted for review');
      setShowModal(false);
      setSelectedFiles([]);
      setSubmissionForm({
        contentLink: '',
        contentNotes: '',
        creativeLink: '',
        reviewNotes: '',
        designLink: '',
        designNotes: '',
        implementationUrl: '',
        repoLink: '',
        devNotes: ''
      });
      fetchTask();
    } catch (error) {
      console.error('Submit task error:', error);
      toast.error(error?.message || 'Failed to submit task');
    } finally {
      setUploading(false);
      isUploadingRef.current = false;
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status) => {
    const config = getStatusConfig(status);
    const Icon = config.icon;
    return (
      <span className={`px-3 py-1.5 text-sm rounded-full flex items-center gap-1.5 ${config.bgColor} ${config.textColor}`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    );
  };

  const isAssignedUser = () => {
    // Check if the current user is assigned to this task
    // Organization admins are view-only and cannot submit/approve
    if (!user || !task) return false;
    if (user.role === 'admin') return false; // Admin is view-only

    // Check if user is assigned to the task
    const assignedToId = task.assignedTo?._id || task.assignedTo;
    if (assignedToId?.toString() === user._id?.toString()) {
      return true;
    }

    // Fallback: Check if user is the original assignee (for rejected tasks)
    // This ensures users can resubmit after rejection even if assignedTo hasn't been updated
    const originalAssignedToId = task.originalAssignedTo?._id || task.originalAssignedTo;
    if (originalAssignedToId?.toString() === user._id?.toString()) {
      return true;
    }

    return false;
  };

  const canStartTask = () => {
    // Standard tasks can be started from 'todo' status
    // Landing page tasks don't have an 'in_progress' status, so they can't be "started"
    return task && task.status === 'todo' && isAssignedUser();
  };

  const canSubmitTask = () => {
    // Standard tasks can be submitted from 'in_progress' or 'rejected' status
    // Only assigned users can submit
    return task && ['in_progress', 'rejected'].includes(task.status) && isAssignedUser();
  };

  const canSubmitContent = () => {
    // Content creator can submit from content_pending or content_rejected
    // Only assigned Content Planners can submit
    return task && ['content_pending', 'content_rejected'].includes(task.status) &&
           task.taskType === 'content_creation' && isAssignedUser();
  };

  const canSubmitCreative = () => {
    // Graphic designer / Video Editor can submit from design_pending or design_rejected
    // Only assigned designers can submit
    return task && ['design_pending', 'design_rejected'].includes(task.status) &&
           ['graphic_design', 'video_editing'].includes(task.taskType) && isAssignedUser();
  };

  const canResubmitTask = () => {
    // For tasks that have been rejected and need resubmission
    // Show "Resubmit" button for:
    // - design_rejected: Landing page designs rejected by tester/marketer
    // - rejected: Development tasks rejected by marketer (final rejection)
    // - development_pending with rejection notes: Development tasks rejected by tester
    return task && isAssignedUser() && (
      (task.status === 'design_rejected' && task.taskType === 'landing_page_design') ||
      (task.status === 'rejected' && task.taskType === 'landing_page_development') ||
      (task.status === 'development_pending' && task.taskType === 'landing_page_development' && (task.rejectionNote || task.rejectionReason))
    );
  };

  const canSubmitLandingPage = () => {
    // Landing page design can be submitted from design_pending (first submission)
    return task && task.status === 'design_pending' && task.taskType === 'landing_page_design' &&
           isAssignedUser();
  };

  const canSubmitLandingPageDev = () => {
    // Landing page development can be submitted from development_pending (first submission)
    // Only if there's no rejection note (otherwise it's a resubmit)
    return task && task.status === 'development_pending' && task.taskType === 'landing_page_development' &&
           !task.rejectionNote && !task.rejectionReason && isAssignedUser();
  };

  const canTesterReview = () => {
    // Testers can review tasks in these statuses
    // Organization admins are view-only and cannot review
    const reviewableStatuses = ['content_submitted', 'design_submitted', 'development_submitted', 'submitted'];
    return user && user.role === 'tester' &&
           task && reviewableStatuses.includes(task.status);
  };

  const canMarketerApprove = () => {
    // Performance marketers can approve tasks in these statuses
    // Organization admins are view-only and cannot approve
    // Note: content_final_approved goes directly to design, marketers don't approve content
    const approvableStatuses = ['design_approved', 'development_approved', 'approved_by_tester'];
    return user && user.role === 'performance_marketer' &&
           task && approvableStatuses.includes(task.status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">Task not found</p>
        <Button variant="secondary" onClick={handleBack} className="mt-4">
          Back
        </Button>
      </div>
    );
  }

  const strategyContext = task.strategyContext || {};

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{task.taskTitle}</h1>
            <p className="text-gray-500 mt-1">
              {task.projectId?.projectName || task.projectId?.businessName || 'Unknown Project'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(task.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Strategy Context Card */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Strategy Context
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Creative brief provided by the Performance Marketer
              </p>
            </CardHeader>
            <CardBody className="p-6">
              <div className="space-y-6">
                {/* Funnel Stage & Creative Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Funnel Stage
                    </label>
                    <p className="mt-1 text-gray-900 font-medium">
                      {FUNNEL_STAGE_LABELS[strategyContext.funnelStage] || strategyContext.funnelStage || 'Not specified'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Creative Type
                    </label>
                    <p className="mt-1 text-gray-900 font-medium">
                      {CREATIVE_TYPE_LABELS[strategyContext.creativeType] || strategyContext.creativeType || 'Not specified'}
                    </p>
                  </div>
                </div>

                {/* Lead Capture Method - Only for landing page tasks */}
                {(task.taskType === 'landing_page_design' || task.taskType === 'landing_page_development') && strategyContext.leadCaptureMethod && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Lead Capture Method
                    </label>
                    <p className="mt-1 text-gray-900 font-medium capitalize">
                      {strategyContext.leadCaptureMethod.replace(/_/g, ' ')}
                    </p>
                  </div>
                )}

                {/* Platform */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Target Platform
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {strategyContext.platform && (
                      <Badge variant="primary" className="text-sm">
                        {PLATFORM_LABELS[strategyContext.platform] || strategyContext.platform}
                      </Badge>
                    )}
                    {strategyContext.platforms?.length > 1 && (
                      <span className="text-sm text-gray-500">
                        (Also: {strategyContext.platforms
                          .filter(p => p !== strategyContext.platform)
                          .map(p => PLATFORM_LABELS[p] || p)
                          .join(', ')})
                      </span>
                    )}
                  </div>
                </div>

                {/* Hook */}
                {strategyContext.hook && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <label className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                      Hook
                    </label>
                    <p className="mt-2 text-gray-900 text-lg font-medium">
                      {strategyContext.hook}
                    </p>
                  </div>
                )}

                {/* Creative Angle / Messaging */}
                {strategyContext.creativeAngle && (
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                    <label className="text-xs font-medium text-purple-600 uppercase tracking-wide">
                      Creative Angle
                    </label>
                    <p className="mt-2 text-gray-900">
                      {strategyContext.creativeAngle}
                    </p>
                  </div>
                )}

                {/* Messaging */}
                {strategyContext.messaging && strategyContext.messaging !== strategyContext.creativeAngle && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Messaging
                    </label>
                    <p className="mt-2 text-gray-900">
                      {strategyContext.messaging}
                    </p>
                  </div>
                )}

                {/* Headline */}
                {strategyContext.headline && (
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                    <label className="text-xs font-medium text-yellow-700 uppercase tracking-wide">
                      Headline
                    </label>
                    <p className="mt-2 text-gray-900 font-medium text-xl">
                      {strategyContext.headline}
                    </p>
                  </div>
                )}

                {/* Call to Action */}
                {strategyContext.cta && (
                  <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                    <label className="text-xs font-medium text-green-600 uppercase tracking-wide">
                      Call to Action
                    </label>
                    <p className="mt-2 text-gray-900 font-semibold">
                      {strategyContext.cta}
                    </p>
                  </div>
                )}

                {/* Target Audience */}
                {strategyContext.targetAudience && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Target Audience
                      </label>
                      <p className="mt-2 text-gray-900">
                        {strategyContext.targetAudience}
                      </p>
                    </div>
                    {strategyContext.industry && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Industry
                        </label>
                        <p className="mt-2 text-gray-900">
                          {strategyContext.industry}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Pain Points */}
                {strategyContext.painPoints?.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Pain Points to Address
                    </label>
                    <ul className="mt-2 space-y-1">
                      {strategyContext.painPoints.map((point, index) => (
                        <li key={index} className="flex items-start gap-2 text-gray-900">
                          <span className="text-red-500 mt-1">•</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Desires */}
                {strategyContext.desires?.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Customer Desires
                    </label>
                    <ul className="mt-2 space-y-1">
                      {strategyContext.desires.map((desire, index) => (
                        <li key={index} className="flex items-start gap-2 text-gray-900">
                          <span className="text-green-500 mt-1">•</span>
                          {desire}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Offer */}
                {strategyContext.offer && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Value Proposition / Offer
                    </label>
                    <p className="mt-2 text-gray-900">
                      {strategyContext.offer}
                    </p>
                  </div>
                )}

                {/* Notes */}
                {strategyContext.notes && (
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                    <label className="text-xs font-medium text-orange-600 uppercase tracking-wide">
                      Additional Notes
                    </label>
                    <p className="mt-2 text-gray-900">
                      {strategyContext.notes}
                    </p>
                  </div>
                )}

                {/* Strategy Link */}
                {task.contextLink && (
                  <div className="pt-4 border-t">
                    <Button
                      variant="secondary"
                      onClick={() => navigate(`/dashboard/projects/${task.projectId._id}/strategy-summary`)}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Full Strategy
                    </Button>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* AI Content Brief - For Content Writers, Graphic Designers, Video Editors, UI/UX Designers, Developers */}
          {['content_writer', 'graphic_designer', 'video_editor', 'ui_ux_designer', 'developer'].includes(user?.role) && (
            <Card>
              <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    AI Content Brief
                  </h2>
                  {aiBrief && (
                    <button
                      onClick={() => copyToClipboard(aiBrief)}
                      className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Brief
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Generate AI-powered content brief using marketing frameworks
                </p>
              </CardHeader>
              <CardBody className="p-6">
                {/* AI Provider Selector */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI Provider
                  </label>
                  <div className="flex items-center gap-4">
                    <select
                      value={selectedProvider}
                      onChange={(e) => handleProviderChange(e.target.value)}
                      className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
                    >
                      {aiProviders.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    {/* {providerStatus && (
                      <span className={`text-sm ${providerStatus.available ? 'text-green-600' : 'text-red-600'}`}>
                        {providerStatus.available ? '✓ Connected' : '✗ Offline'}
                      </span>
                    )} */}
                  </div>
                </div>

                {/* Framework Selector */}
                {/* Framework Selector - Only for content_writer (auto-selected by marketer) */}
                {user?.role === 'content_writer' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Framework
                    </label>
                    <select
                      value={selectedFramework}
                      onChange={(e) => {
                        setSelectedFramework(e.target.value);
                        setSelectedPrompt(null);
                      }}
                      disabled
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                    >
                      <option value="">No framework assigned...</option>
                      {aiFrameworks.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                    {selectedFramework && (
                      <p className="text-xs text-gray-500 mt-2">
                        {aiFrameworks.find(f => f.value === selectedFramework)?.description}
                      </p>
                    )}
                    {!selectedFramework && (
                      <p className="text-xs text-amber-600 mt-2">
                        Framework will be assigned by the Performance Marketer
                      </p>
                    )}
                  </div>
                )}

                {/* Framework Selector - For graphic_designer, video_editor (selectable) */}
                {/* UI/UX Designers do NOT need framework - they use prompt templates only */}
                {['graphic_designer', 'video_editor'].includes(user?.role) && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Framework <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedFramework}
                      onChange={(e) => {
                        setSelectedFramework(e.target.value);
                        setSelectedPrompt(null);
                      }}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                    >
                      <option value="">Select a framework...</option>
                      {aiFrameworks.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                    {selectedFramework && (
                      <p className="text-xs text-gray-500 mt-2">
                        {aiFrameworks.find(f => f.value === selectedFramework)?.description}
                      </p>
                    )}
                    {!selectedFramework && (
                      <p className="text-xs text-amber-600 mt-2">
                        Please select a framework to generate your brief
                      </p>
                    )}
                  </div>
                )}

                {/* Prompt Templates */}
                {/* For content_writer: show only when framework is selected */}
                {/* For other roles (graphic_designer, video_editor, ui_ux_designer): always show */}
                {(user?.role !== 'content_writer' || selectedFramework) && prompts.length > 0 && (
  <div className="mb-6">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Prompt Template {user?.role === 'content_writer' ? '(Optional)' : ''}
    </label>
    <p className="text-xs text-gray-500 mb-2">
      {user?.role === 'content_writer'
        ? 'Select a specific prompt template or leave unselected to use default framework'
        : 'Select a prompt template to guide the AI brief generation'}
    </p>

    {/* Searchable Dropdown */}
    <div className="relative" ref={promptDropdownRef}>
      <div
        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 cursor-pointer flex items-center justify-between bg-white"
        onClick={() => setShowPromptDropdown(!showPromptDropdown)}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedPrompt ? (
            <>
              <CheckCircle className="w-4 h-4 text-primary-500 flex-shrink-0" />
              <span className="text-gray-900 truncate">{selectedPrompt.title}</span>
              {selectedPrompt.frameworkType && (
                <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full flex-shrink-0">
                  {selectedPrompt.frameworkType}
                </span>
              )}
            </>
          ) : (
            <span className="text-gray-500">Select a prompt template...</span>
          )}
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showPromptDropdown ? 'rotate-90' : ''}`} />
      </div>

      {showPromptDropdown && (
        <div className="absolute z-20 w-full mt-2 bg-white rounded-lg border border-gray-200 shadow-lg max-h-72 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <input
                type="text"
                value={promptSearchTerm}
                onChange={(e) => setPromptSearchTerm(e.target.value)}
                placeholder="Search templates..."
                className="w-full px-3 py-2 pl-9 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                onClick={(e) => e.stopPropagation()}
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Clear Selection Option */}
          {selectedPrompt && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPrompt(null);
                setShowPromptDropdown(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-b border-gray-100"
            >
              <XCircle className="w-4 h-4" />
              Clear selection
            </button>
          )}

          {/* Prompts List */}
          <div className="overflow-y-auto max-h-52">
            {(() => {
              const filtered = prompts.filter(p => {
                // content_writer: filter by framework; others: show all
                const matchesFramework = user?.role === 'content_writer'
                  ? (!p.frameworkType || p.frameworkType === selectedFramework)
                  : true;
                const matchesSearch = !promptSearchTerm ||
                  p.title.toLowerCase().includes(promptSearchTerm.toLowerCase()) ||
                  (p.description && p.description.toLowerCase().includes(promptSearchTerm.toLowerCase()));
                return matchesFramework && matchesSearch;
              });

              if (filtered.length === 0) {
                return (
                  <div className="px-4 py-6 text-center text-gray-500 text-sm">
                    {promptSearchTerm ? 'No templates match your search' : 'No templates available'}
                  </div>
                );
              }

              return filtered.map((prompt) => (
                <button
                  key={prompt._id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPrompt(prompt);
                    // For non-content_writers, auto-set the framework from the prompt
                    if (user?.role !== 'content_writer' && prompt.frameworkType) {
                      setSelectedFramework(prompt.frameworkType);
                    }
                    setShowPromptDropdown(false);
                    setPromptSearchTerm('');
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 ${
                    selectedPrompt?._id === prompt._id ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-gray-900 truncate">{prompt.title}</span>
                    {selectedPrompt?._id === prompt._id && (
                      <CheckCircle className="w-4 h-4 text-primary-500 flex-shrink-0" />
                    )}
                  </div>
                  {prompt.description && (
                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{prompt.description}</div>
                  )}
                  {prompt.frameworkType && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                        <Sparkles className="w-3 h-3" />
                        {prompt.frameworkType}
                        {prompt.subCategory && (
                          <span className="text-purple-500">
                            → {subCategories.find(c => c.key === prompt.subCategory && c.frameworkType === prompt.frameworkType)?.displayName || prompt.subCategory}
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </button>
              ));
            })()}
          </div>
        </div>
      )}
    </div>

    {/* Selected Template Details */}
    {selectedPrompt && (
      <div className="mt-3 p-4 bg-primary-50 rounded-lg border border-primary-200">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-primary-600" />
              <span className="font-medium text-primary-900">{selectedPrompt.title}</span>
            </div>
            {selectedPrompt.description && (
              <p className="text-sm text-primary-700 mb-2">{selectedPrompt.description}</p>
            )}
            {selectedPrompt.frameworkType && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                  <Sparkles className="w-3 h-3" />
                  Framework: {selectedPrompt.frameworkType}
                </span>
                {selectedPrompt.subCategory && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full">
                    Category: {subCategories.find(c => c.key === selectedPrompt.subCategory && c.frameworkType === selectedPrompt.frameworkType)?.displayName || selectedPrompt.subCategory}
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSelectedPrompt(null)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )}
  </div>
)}
                {/* Approved Content - Only for Graphic Designers and Video Editors */}
                {['graphic_designer', 'video_editor'].includes(user?.role) && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Approved Content (from Content Planner)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Paste the approved headline, body text, CTA, and script from the content link you received
                    </p>
                    <textarea
                      value={approvedContent}
                      onChange={(e) => setApprovedContent(e.target.value)}
                      placeholder="Paste approved content here...

Example:
Headline: Get 50% Off Today!
Body: Transform your business with our AI solution...
CTA: Click Here Now
Script: (for video) Opening hook..."
                      rows={6}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm resize-none"
                    />
                    {approvedContent && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {approvedContent.length} characters - will be included in prompt
                      </p>
                    )}
                  </div>
                )}

                {/* Generate Button */}
                <div className="mb-6">
                  {!aiBrief ? (
                    <Button
                      className="w-full"
                      onClick={handleGenerateAIBrief}
                      loading={generatingBrief}
                      disabled={(['content_writer', 'graphic_designer', 'video_editor'].includes(user?.role) && !selectedFramework) || generatingBrief}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Brief
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={handleRegenerateBrief}
                      loading={generatingBrief}
                      disabled={(['content_writer', 'graphic_designer', 'video_editor'].includes(user?.role) && !selectedFramework) || generatingBrief}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {selectedPrompt ? 'Regenerate with Selected Template' : 'Regenerate Brief'}
                    </Button>
                  )}
                </div>

                {/* Generated Brief */}
                {generatingBrief && !aiBrief && (
                  <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-500">Generating your content brief...</p>
                    <p className="text-sm text-gray-400 mt-1">This may take a few seconds</p>
                  </div>
                )}

                {aiBrief && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          {aiFrameworks.find(f => f.value === selectedFramework)?.value || selectedFramework}
                        </span>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                        {aiBrief}
                      </pre>
                    </div>
                    <div className="mt-4 flex gap-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => copyToClipboard(aiBrief)}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy to Clipboard
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleRegenerateBrief}
                        loading={generatingBrief}
                      >
                        <Sparkles className="w-4 h-4 mr-1" />
                        Regenerate
                      </Button>
                    </div>
                  </div>
                )}

                {!aiBrief && !generatingBrief && (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <BookOpen className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 mb-2">Select a framework and generate your AI content brief</p>
                    <p className="text-sm text-gray-400">
                      The AI will use your task's strategy context to create a personalized brief
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Brand Settings - For UI/UX Designers working on Landing Page Design */}
          {user?.role === 'ui_ux_designer' && task.taskType === 'landing_page_design' && task.projectId && (
            <Card>
              <CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-pink-500" />
                  Brand Guidelines
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Use these brand colors, typography, and logos for your design
                </p>
              </CardHeader>
              <CardBody className="p-6">
                <BrandSettingsView
                  projectId={task.projectId._id || task.projectId}
                  taskId={task._id}
                  onGeneratePrompt={(brandPrompt) => {
                    // Append brand guidelines to AI brief if generated
                    if (aiBrief) {
                      const newBrief = aiBrief + '\n\n' + brandPrompt;
                      setAiBrief(newBrief);
                      toast.success('Brand guidelines added to your brief');
                    } else {
                      setAiBrief(brandPrompt);
                      toast.success('Brand guidelines loaded');
                    }
                  }}
                />
              </CardBody>
            </Card>
          )}

          {/* Brand Settings - For Graphic Designers working on Image Creatives */}
          {user?.role === 'graphic_designer' && task.taskType === 'graphic_design' && task.projectId && (
            <Card>
              <CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-pink-500" />
                  Brand Guidelines
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Use these brand colors, typography, and logos for your image creatives
                </p>
              </CardHeader>
              <CardBody className="p-6">
                <BrandSettingsView
                  projectId={task.projectId._id || task.projectId}
                  taskId={task._id}
                  onGeneratePrompt={(brandPrompt) => {
                    // Append brand guidelines to AI brief if generated
                    if (aiBrief) {
                      const newBrief = aiBrief + '\n\n' + brandPrompt;
                      setAiBrief(newBrief);
                      toast.success('Brand guidelines added to your brief');
                    } else {
                      setAiBrief(brandPrompt);
                      toast.success('Brand guidelines loaded');
                    }
                  }}
                />
              </CardBody>
            </Card>
          )}

          {/* AI Prompt (for other roles with pre-existing prompt) */}
          {task.aiPrompt && user?.role !== 'content_writer' && user?.role !== 'graphic_designer' && (
            // <Card>
            //   <CardHeader>
            //     <h2 className="text-lg font-semibold text-gray-900">
            //       AI Creative Brief
            //     </h2>
            //   </CardHeader>
            //   <CardBody className="p-6">
            //     <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
            //       {task.aiPrompt}
            //     </pre>
            //   </CardBody>
            // </Card>
            <></>
          )}

          {/* Creative Reference - For Testers reviewing creatives */}
          {['graphic_design', 'video_editing'].includes(task.taskType) && (task.creativeLink || task.outputFiles?.length > 0 || task.reviewNotes) && (
            <Card>
              <CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-pink-600" />
                  Submitted Creative
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {task.taskType === 'video_editing' ? 'Video submitted by Video Editor' : 'Creative submitted by Graphic Designer'}
                </p>
              </CardHeader>
              <CardBody className="p-6">
                <div className="space-y-4">
                  {/* Creative Link */}
                  {task.creativeLink && (
                    <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
                      <h4 className="text-sm font-medium text-pink-800 mb-2 flex items-center gap-2">
                        <Link className="w-4 h-4" />
                        Creative Link
                      </h4>
                      <a
                        href={normalizeUrl(task.creativeLink)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-600 hover:underline flex items-center gap-1 text-sm break-all"
                      >
                        {task.creativeLink}
                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                      </a>
                    </div>
                  )}

                  {/* Uploaded Files */}
                  {task.outputFiles && task.outputFiles.length > 0 && (
                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <FileIcon className="w-4 h-4" />
                        Uploaded Files ({task.outputFiles.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {task.outputFiles.map((file, index) => (
                          <a
                            key={index}
                            href={file.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-white border rounded text-sm text-blue-600 hover:bg-gray-100 flex items-center gap-1"
                          >
                            <Download className="w-4 h-4" />
                            {file.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Review Notes */}
                  {task.reviewNotes && (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h4 className="text-sm font-medium text-yellow-800 mb-2 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Notes from {task.taskType === 'video_editing' ? 'Video Editor' : 'Graphic Designer'}
                      </h4>
                      <p className="text-sm text-gray-700">{task.reviewNotes}</p>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Content Reference - For Testers reviewing content */}
          {task.taskType === 'content_creation' && (task.contentLink || task.contentFile?.path || task.contentNotes) && (
            <Card>
              <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  Submitted Content
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Content submitted by Content Creator
                </p>
              </CardHeader>
              <CardBody className="p-6">
                <div className="space-y-4">
                  {/* Content Link */}
                  {task.contentLink && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="text-sm font-medium text-green-800 mb-2 flex items-center gap-2">
                        <Link className="w-4 h-4" />
                        Content Link
                      </h4>
                      <a
                        href={normalizeUrl(task.contentLink)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:underline flex items-center gap-1 text-sm break-all"
                      >
                        {task.contentLink}
                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                      </a>
                    </div>
                  )}

                  {/* Content File */}
                  {task.contentFile?.path && (
                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <FileIcon className="w-4 h-4" />
                        Content File
                      </h4>
                      <a
                        href={task.contentFile.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-white border rounded text-sm text-blue-600 hover:bg-gray-100 flex items-center gap-1 w-fit"
                      >
                        <Download className="w-4 h-4" />
                        {task.contentFile.name || 'Download Content File'}
                      </a>
                    </div>
                  )}

                  {/* Content Notes */}
                  {task.contentNotes && (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h4 className="text-sm font-medium text-yellow-800 mb-2 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Notes from Content Creator
                      </h4>
                      <p className="text-sm text-gray-700">{task.contentNotes}</p>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Approved Content - For Designers/Editors working on creative tasks */}
          {/* Show content reference for graphic_design and video_editing tasks that have content, regardless of status */}
          {['graphic_design', 'video_editing'].includes(task.taskType) && (task.contentLink || task.contentFile?.path || task.contentNotes || task.contentOutput?.headline || task.contentOutput?.bodyText || task.contentOutput?.cta || task.contentOutput?.script) && (
            <Card>
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  {task.taskType === 'video_editing' ? 'Approved Script & Content Reference' : 'Approved Content Reference'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {task.taskType === 'video_editing'
                    ? 'Script and content approved by tester - use this for your video editing'
                    : 'Content approved by tester - use this for your design'}
                </p>
              </CardHeader>
              <CardBody className="p-6">
                <div className="space-y-4">
                  {/* Content Link */}
                  {task.contentLink && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="text-sm font-medium text-green-800 mb-2 flex items-center gap-2">
                        <Link className="w-4 h-4" />
                        Content Link
                      </h4>
                      <a
                        href={normalizeUrl(task.contentLink)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:underline flex items-center gap-1 text-sm break-all"
                      >
                        {task.contentLink}
                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                      </a>
                    </div>
                  )}

                  {/* Content File */}
                  {task.contentFile?.path && (
                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <FileIcon className="w-4 h-4" />
                        Content File
                      </h4>
                      <a
                        href={task.contentFile.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-white border rounded text-sm text-blue-600 hover:bg-gray-100 flex items-center gap-1 w-fit"
                      >
                        <Download className="w-4 h-4" />
                        {task.contentFile.name || 'Download Content File'}
                      </a>
                    </div>
                  )}

                  {/* Content Notes */}
                  {task.contentNotes && (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h4 className="text-sm font-medium text-yellow-800 mb-2 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Notes from Content Creator
                      </h4>
                      <p className="text-sm text-gray-700">{task.contentNotes}</p>
                    </div>
                  )}

                  {/* Content Output (headline, bodyText, cta, script) */}
                  {task.contentOutput && (task.contentOutput.headline || task.contentOutput.bodyText || task.contentOutput.cta || task.contentOutput.script) && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-medium text-blue-800 mb-3">Content Output</h4>
                      {task.contentOutput.headline && (
                        <div className="mb-2">
                          <span className="text-xs font-medium text-blue-600">Headline:</span>
                          <p className="text-sm text-gray-800">{task.contentOutput.headline}</p>
                        </div>
                      )}
                      {task.contentOutput.bodyText && (
                        <div className="mb-2">
                          <span className="text-xs font-medium text-blue-600">Body Text:</span>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{task.contentOutput.bodyText}</p>
                        </div>
                      )}
                      {task.contentOutput.cta && (
                        <div className="mb-2">
                          <span className="text-xs font-medium text-blue-600">CTA:</span>
                          <p className="text-sm text-gray-800">{task.contentOutput.cta}</p>
                        </div>
                      )}
                      {task.contentOutput.script && (
                        <div>
                          <span className="text-xs font-medium text-blue-600">Script:</span>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{task.contentOutput.script}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Submitted Design - For Testers reviewing landing page design */}
          {task.taskType === 'landing_page_design' && ['design_submitted', 'design_approved', 'design_rejected'].includes(task.status) && (task.designLink || task.designFile?.path || task.designNotes) && (
            <Card>
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Layout className="w-5 h-5 text-purple-600" />
                  Submitted Design
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Design submitted by UI/UX Designer for review
                </p>
              </CardHeader>
              <CardBody className="p-6">
                <div className="space-y-4">
                  {/* Design Link */}
                  {task.designLink && (
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <h4 className="text-sm font-medium text-purple-800 mb-2 flex items-center gap-2">
                        <Link className="w-4 h-4" />
                        Design Link
                      </h4>
                      <a
                        href={normalizeUrl(task.designLink)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:underline flex items-center gap-1 text-sm break-all"
                      >
                        {task.designLink}
                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                      </a>
                    </div>
                  )}

                  {/* Design File */}
                  {task.designFile?.path && (
                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <FileIcon className="w-4 h-4" />
                        Design File
                      </h4>
                      <a
                        href={task.designFile.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-white border rounded text-sm text-blue-600 hover:bg-gray-100 flex items-center gap-1 w-fit"
                      >
                        <Download className="w-4 h-4" />
                        {task.designFile.name || 'Download Design File'}
                      </a>
                    </div>
                  )}

                  {/* Designer Notes */}
                  {task.designNotes && (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h4 className="text-sm font-medium text-yellow-800 mb-2 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Notes from Designer
                      </h4>
                      <p className="text-sm text-gray-700">{task.designNotes}</p>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Brand Settings - For Developers working on Landing Page Development */}
          {user?.role === 'developer' && task.taskType === 'landing_page_development' && task.projectId && (
            <Card>
              <CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-pink-500" />
                  Brand Guidelines
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Use these brand colors, typography, and logos for your implementation
                </p>
              </CardHeader>
              <CardBody className="p-6">
                <BrandSettingsView
                  projectId={task.projectId._id || task.projectId}
                  taskId={task._id}
                  editable={false}
                  onGeneratePrompt={(brandPrompt) => {
                    // Append brand guidelines to AI brief if generated
                    if (aiBrief) {
                      const newBrief = aiBrief + '\n\n' + brandPrompt;
                      setAiBrief(newBrief);
                      toast.success('Brand guidelines added to your brief');
                    } else {
                      setAiBrief(brandPrompt);
                      toast.success('Brand guidelines loaded');
                    }
                  }}
                />
              </CardBody>
            </Card>
          )}

          {/* Designer's Creative Brief - For Developers */}
          {user?.role === 'developer' && task.taskType === 'landing_page_development' && task.designerPrompt && (
            <Card>
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-500" />
                    Designer's Creative Brief
                  </h2>
                  <button
                    onClick={() => copyToClipboard(task.designerPrompt)}
                    className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Brief
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  AI-generated brief used by the designer for this landing page design
                </p>
              </CardHeader>
              <CardBody className="p-6">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                    {task.designerPrompt}
                  </pre>
                </div>
                <div className="mt-4 flex gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      // Append designer's brief to developer's AI brief
                      if (aiBrief) {
                        const newBrief = aiBrief + '\n\n--- Designer\'s Reference ---\n' + task.designerPrompt;
                        setAiBrief(newBrief);
                        toast.success('Designer\'s brief appended to your brief');
                      } else {
                        setAiBrief(task.designerPrompt);
                        toast.success('Designer\'s brief loaded as reference');
                      }
                    }}
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    Use as Reference
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Design Reference - For Developers */}
          {task.taskType === 'landing_page_development' && (task.designLink || task.designFile?.path || task.designNotes) && (
            <Card>
              <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Layout className="w-5 h-5 text-purple-600" />
                  Design Reference
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Design assets from UI/UX Designer
                </p>
              </CardHeader>
              <CardBody className="p-6">
                <div className="space-y-4">
                  {/* Design Link */}
                  {task.designLink && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                        <Link className="w-4 h-4" />
                        Design Link
                      </h4>
                      <a
                        href={normalizeUrl(task.designLink)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 text-sm break-all"
                      >
                        {task.designLink}
                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                      </a>
                    </div>
                  )}

                  {/* Design File */}
                  {task.designFile?.path && (
                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <FileIcon className="w-4 h-4" />
                        Design File
                      </h4>
                      <a
                        href={task.designFile.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-white border rounded text-sm text-blue-600 hover:bg-gray-100 flex items-center gap-1 w-fit"
                      >
                        <Download className="w-4 h-4" />
                        {task.designFile.name || 'Download Design File'}
                      </a>
                    </div>
                  )}

                  {/* Designer Notes */}
                  {task.designNotes && (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h4 className="text-sm font-medium text-yellow-800 mb-2 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Notes from Designer
                      </h4>
                      <p className="text-sm text-gray-700">{task.designNotes}</p>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Submitted Implementation - Show when developer has submitted work */}
          {task.taskType === 'landing_page_development' && task.implementationUrl && (
            <Card>
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Code className="w-5 h-5 text-green-600" />
                  Submitted Implementation
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Implementation submitted by Developer
                </p>
              </CardHeader>
              <CardBody className="p-6">
                <div className="space-y-4">
                  {/* Implementation URL */}
                  {task.implementationUrl && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="text-sm font-medium text-green-800 mb-2 flex items-center gap-2">
                        <Link className="w-4 h-4" />
                        Landing Page URL
                      </h4>
                      <a
                        href={normalizeUrl(task.implementationUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:underline flex items-center gap-1 text-sm break-all"
                      >
                        {task.implementationUrl}
                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                      </a>
                    </div>
                  )}

                  {/* Repository Link */}
                  {task.repoLink && (
                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Code className="w-4 h-4" />
                        Repository Link
                      </h4>
                      <a
                        href={normalizeUrl(task.repoLink)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 text-sm break-all"
                      >
                        {task.repoLink}
                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                      </a>
                    </div>
                  )}

                  {/* Developer Notes */}
                  {task.devNotes && (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <h4 className="text-sm font-medium text-yellow-800 mb-2 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Notes from Developer
                      </h4>
                      <p className="text-sm text-gray-700">{task.devNotes}</p>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Previously Submitted Work */}
          {task.outputFiles?.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">
                  Submitted Files
                </h2>
              </CardHeader>
              <CardBody className="p-6">
                <div className="flex flex-wrap gap-3">
                  {task.outputFiles.map((file, index) => (
                    <a
                      key={index}
                      href={file.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      {file.path?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <Image className="w-4 h-4" />
                      ) : file.path?.match(/\.(mp4|mov|avi|webm)$/i) ? (
                        <Video className="w-4 h-4" />
                      ) : (
                        <FileIcon className="w-4 h-4" />
                      )}
                      <span className="text-sm font-medium text-gray-700">{file.name}</span>
                    </a>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Rejection Note */}
          {(['rejected', 'content_rejected', 'design_rejected', 'development_pending'].includes(task.status) && (task.rejectionNote || task.rejectionReason)) && (
            <Card className="border-red-200">
              <CardBody className="p-6 bg-red-50">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-800">Rejection Feedback</h3>
                    {task.rejectionReason && (
                      <p className="text-sm text-red-600 mb-1">
                        <span className="font-medium">Category:</span> {task.rejectionReason}
                      </p>
                    )}
                    <p className="mt-1 text-red-700">{task.rejectionNote}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Task Info */}
          <Card>
            <CardBody className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Task Information</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Task Type</dt>
                  <dd className="mt-1 text-gray-900">
                    {task.taskType?.replace(/_/g, ' ')}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Asset Type</dt>
                  <dd className="mt-1 text-gray-900">
                    {CREATIVE_TYPE_LABELS[task.assetType] || task.assetType?.replace(/_/g, ' ')}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Priority</dt>
                  <dd className="mt-1">
                    <Badge variant={task.priority === 'high' ? 'danger' : task.priority === 'urgent' ? 'danger' : 'default'}>
                      {task.priority}
                    </Badge>
                  </dd>
                </div>
                {task.dueDate && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Due Date</dt>
                    <dd className="mt-1 text-gray-900 flex items-center gap-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {new Date(task.dueDate).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Assigned Role</dt>
                  <dd className="mt-1 text-gray-900">
                    {task.assignedRole?.replace(/_/g, ' ')}
                  </dd>
                </div>
                {task.assignedTo && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase">Assigned To</dt>
                    <dd className="mt-1 text-gray-900">
                      {task.assignedTo?.name || 'Unassigned'}
                    </dd>
                  </div>
                )}
                {/* Show Framework and Subcategory for content writer tasks */}
                {user?.role === 'content_writer' && task.contentFramework && (
                  <div className="col-span-2">
                    <dt className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-500" />
                      Framework
                    </dt>
                    <dd className="mt-1 text-gray-900">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-50 text-purple-700 text-sm font-medium">
                        {task.contentFramework}
                        {task.contentSubCategory && (
                          <span className="ml-2 text-purple-500">
                            → {subCategories.find(c => c.key === task.contentSubCategory && c.frameworkType === task.contentFramework)?.displayName || task.contentSubCategory}
                          </span>
                        )}
                      </span>
                    </dd>
                  </div>
                )}
              </dl>
            </CardBody>
          </Card>

          {/* Task Progress Timeline */}
          <Card>
            <CardBody className="p-4">
              <TaskProgressTimeline task={task} />
            </CardBody>
          </Card>

          {/* Prompts Sidebar - For content creators */}
          {['content_writer', 'graphic_designer'].includes(user?.role) && prompts.length > 0 && (
            <></>
            // <Card>
            //   <CardBody className="p-6">
            //     <div className="flex items-center justify-between mb-4">
            //       <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            //         <PenTool className="w-5 h-5 text-primary-500" />
            //         Prompt Templates
            //       </h3>
            //       <button
            //         onClick={() => setShowPromptsPanel(!showPromptsPanel)}
            //         className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            //       >
            //         {showPromptsPanel ? 'Hide' : 'View'}
            //         <ChevronRight className={`w-4 h-4 transition-transform ${showPromptsPanel ? 'rotate-90' : ''}`} />
            //       </button>
            //     </div>

            //     {showPromptsPanel && (
            //       <div className="space-y-3 mt-4">
            //         <p className="text-sm text-gray-500 mb-3">
            //           Select a prompt template to generate an AI-optimized creative brief
            //         </p>

            //         {promptsLoading ? (
            //           <div className="flex items-center justify-center py-4">
            //             <Spinner size="sm" />
            //           </div>
            //         ) : (
            //           <div className="space-y-2 max-h-96 overflow-y-auto">
            //             {/* Group prompts by framework for content writers */}
            //             {user?.role === 'content_writer' ? (
            //               (() => {
            //                 // Group prompts by framework
            //                 const groupedByFramework = prompts
            //                   .filter(p => p.frameworkType)
            //                   .reduce((acc, prompt) => {
            //                     const framework = prompt.frameworkType;
            //                     if (!acc[framework]) {
            //                       acc[framework] = { prompts: [], subcategories: {} };
            //                     }
            //                     acc[framework].prompts.push(prompt);
            //                     if (prompt.subCategory) {
            //                       if (!acc[framework].subcategories[prompt.subCategory]) {
            //                         acc[framework].subcategories[prompt.subCategory] = [];
            //                       }
            //                       acc[framework].subcategories[prompt.subCategory].push(prompt);
            //                     }
            //                     return acc;
            //                   }, {});

            //                 const otherPrompts = prompts.filter(p => !p.frameworkType);

            //                 return (
            //                   <>
            //                     {Object.entries(groupedByFramework).map(([framework, data]) => {
            //                       const frameworkPrompts = data.prompts;
            //                       const subcategories = data.subcategories;
            //                       const subcategoryKeys = Object.keys(subcategories);
            //                       const uncategorizedPrompts = frameworkPrompts.filter(p => !p.subCategory);

            //                       return (
            //                         <div key={framework} className="border border-gray-200 rounded-lg overflow-hidden">
            //                           <div className="bg-purple-50 px-3 py-2 flex items-center gap-2">
            //                             <Sparkles className="w-4 h-4 text-purple-500" />
            //                             <span className="font-medium text-sm text-purple-700">{framework}</span>
            //                             <span className="text-xs text-purple-500">({frameworkPrompts.length})</span>
            //                           </div>

            //                           {/* Subcategories */}
            //                           {subcategoryKeys.length > 0 && subcategoryKeys.map(subKey => {
            //                             const subPrompts = subcategories[subKey] || [];
            //                             const subDetails = subCategories.find(c => c.key === subKey && c.frameworkType === framework);

            //                             return (
            //                               <div key={subKey} className="border-t border-gray-200">
            //                                 <div className="bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 flex items-center gap-1">
            //                                   <span>├</span>
            //                                   {subDetails?.displayName || subKey}
            //                                   <span className="text-gray-400">({subPrompts.length})</span>
            //                                 </div>
            //                                 {subPrompts.map((prompt) => (
            //                                   <button
            //                                     key={prompt._id}
            //                                     onClick={() => setSelectedPrompt(prompt)}
            //                                     className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-all ${
            //                                       selectedPrompt?._id === prompt._id ? 'bg-primary-50 border-l-2 border-primary-500' : ''
            //                                     }`}
            //                                   >
            //                                     <div className="text-gray-700">{prompt.title}</div>
            //                                   </button>
            //                                 ))}
            //                               </div>
            //                             );
            //                           })}

            //                           {/* Uncategorized prompts */}
            //                           {uncategorizedPrompts.length > 0 && (
            //                             <div className="border-t border-gray-200">
            //                               {uncategorizedPrompts.map((prompt) => (
            //                                 <button
            //                                   key={prompt._id}
            //                                   onClick={() => setSelectedPrompt(prompt)}
            //                                   className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-all ${
            //                                     selectedPrompt?._id === prompt._id ? 'bg-primary-50 border-l-2 border-primary-500' : ''
            //                                   }`}
            //                                 >
            //                                   <div className="text-gray-700">{prompt.title}</div>
            //                                 </button>
            //                               ))}
            //                             </div>
            //                           )}
            //                         </div>
            //                       );
            //                     })}

            //                     {/* Other prompts without framework */}
            //                     {otherPrompts.length > 0 && (
            //                       <div className="border border-gray-200 rounded-lg overflow-hidden">
            //                         <div className="bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600">
            //                           Other Prompts
            //                         </div>
            //                         {otherPrompts.map((prompt) => (
            //                           <button
            //                             key={prompt._id}
            //                             onClick={() => setSelectedPrompt(prompt)}
            //                             className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-all border-t border-gray-200 ${
            //                               selectedPrompt?._id === prompt._id ? 'bg-primary-50 border-l-2 border-primary-500' : ''
            //                             }`}
            //                           >
            //                             <div className="text-gray-700">{prompt.title}</div>
            //                             {prompt.category && (
            //                               <span className="text-xs text-gray-500">{prompt.category}</span>
            //                             )}
            //                           </button>
            //                         ))}
            //                       </div>
            //                     )}
            //                   </>
            //                 );
            //               })()
            //             ) : (
            //               // Non-content writers: show simple list
            //               prompts.map((prompt) => (
            //                 <button
            //                   key={prompt._id}
            //                   onClick={() => setSelectedPrompt(prompt)}
            //                   className={`w-full text-left p-3 rounded-lg border transition-all ${
            //                     selectedPrompt?._id === prompt._id
            //                       ? 'border-primary-500 bg-primary-50'
            //                       : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
            //                   }`}
            //                 >
            //                   <div className="font-medium text-sm text-gray-900">{prompt.title}</div>
            //                   <div className="flex gap-2 mt-1 flex-wrap">
            //                     {!prompt.frameworkType && prompt.category && (
            //                       <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
            //                         {prompt.category}
            //                       </span>
            //                     )}
            //                     {prompt.platform && prompt.platform !== 'all' && (
            //                       <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
            //                         {prompt.platform}
            //                       </span>
            //                     )}
            //                   </div>
            //                 </button>
            //               ))
            //             )}
            //           </div>
            //         )}

            //         {selectedPrompt && (
            //           <div className="mt-4 pt-4 border-t">
            //             <div className="bg-gray-50 rounded-lg p-3 mb-3">
            //               <div className="text-xs font-medium text-gray-500 mb-1">Selected Template:</div>
            //               <div className="text-sm text-gray-700">{selectedPrompt.title}</div>
            //               {selectedPrompt.frameworkType && (
            //                 <div className="text-xs text-purple-600 mt-1 flex items-center gap-1">
            //                   <Sparkles className="w-3 h-3" />
            //                   Framework: {selectedPrompt.frameworkType}
            //                   {selectedPrompt.subCategory && (
            //                     <span className="ml-2 text-indigo-600">
            //                       → {subCategories.find(c => c.key === selectedPrompt.subCategory && c.frameworkType === selectedPrompt.frameworkType)?.displayName || selectedPrompt.subCategory}
            //                     </span>
            //                   )}
            //                 </div>
            //               )}
            //               {selectedPrompt.description && (
            //                 <div className="text-xs text-gray-500 mt-1">{selectedPrompt.description}</div>
            //               )}
            //             </div>
            //             <Button
            //               className="w-full"
            //               onClick={handleGeneratePrompt}
            //               loading={generatingPrompt}
            //               disabled={generatingPrompt}
            //             >
            //               <Sparkles className="w-4 h-4 mr-2" />
            //               Generate AI Prompt
            //             </Button>
            //           </div>
            //         )}
            //       </div>
            //     )}
            //   </CardBody>
            // </Card>

          )}

          {/* Generated Prompt Modal */}
          {showGeneratedPrompt && generatedPrompt && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary-500" />
                    Generated AI Prompt
                  </h3>
                  <button
                    onClick={() => {
                      setShowGeneratedPrompt(false);
                      setGeneratedPrompt('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6">
                  <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap text-sm text-gray-800 font-mono">
                    {generatedPrompt}
                  </div>
                  <div className="flex justify-end gap-3 mt-4">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setShowGeneratedPrompt(false);
                        setGeneratedPrompt('');
                      }}
                    >
                      Close
                    </Button>
                    <Button onClick={() => copyToClipboard(generatedPrompt)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy to Clipboard
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions - Only render if there's content to show */}
          {(isAdmin || canStartTask() || canSubmitContent() || canSubmitCreative() || canSubmitTask() || canResubmitTask() || canSubmitLandingPage() || canSubmitLandingPageDev() || canTesterReview() || canMarketerApprove() || ['content_submitted', 'content_approved', 'content_rejected', 'submitted', 'design_submitted', 'development_submitted', 'design_approved', 'development_approved', 'approved_by_tester', 'final_approved'].includes(task?.status)) && (
            <Card>
              <CardBody className="p-6 space-y-3">
              {/* Admin View-Only Message */}
              {isAdmin && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <Eye className="w-5 h-5 mx-auto mb-2 text-blue-500" />
                  <p className="text-sm text-blue-800 font-medium">View Only</p>
                  <p className="text-xs text-blue-600 mt-1">
                    As an organization admin, you can view task details but cannot take actions.
                  </p>
                </div>
              )}

              {!isAdmin && canStartTask() && (
                <Button
                  className="w-full"
                  onClick={() => handleStatusUpdate('in_progress')}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Task
                </Button>
              )}
              {/* Content Creator Submit Button */}
              {!isAdmin && canSubmitContent() && (
                <Button
                  className="w-full"
                  onClick={() => setShowModal(true)}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Content
                </Button>
              )}
              {/* Creative/Grammar Designer Submit Button */}
              {!isAdmin && canSubmitCreative() && (
                <Button
                  className="w-full"
                  onClick={() => setShowModal(true)}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Creative
                </Button>
              )}
              {/* Landing Page Design/Development Submit Button */}
              {!isAdmin && (canSubmitTask() || canResubmitTask() || canSubmitLandingPage() || canSubmitLandingPageDev()) && (
                <Button
                  className="w-full"
                  onClick={() => setShowModal(true)}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {canResubmitTask() ? 'Resubmit for Review' : 'Submit for Review'}
                </Button>
              )}

              {/* Tester Review Actions */}
              {!isAdmin && canTesterReview() && (
                <div className="space-y-3 pt-3 border-t">
                  <h4 className="font-medium text-gray-900">Tester Review</h4>
                  <p className="text-sm text-gray-500">
                    Review the submitted work and approve or reject.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      variant="success"
                      onClick={handleTesterApprove}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      className="flex-1"
                      variant="danger"
                      onClick={() => setShowRejectModal(true)}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              )}

              {/* Marketer Approval Actions */}
              {!isAdmin && canMarketerApprove() && (
                <div className="space-y-3 pt-3 border-t">
                  <h4 className="font-medium text-gray-900">Marketer Review</h4>
                  <p className="text-sm text-gray-500">
                    Final approval required before task completion.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      variant="success"
                      onClick={handleMarketerApprove}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      className="flex-1"
                      variant="danger"
                      onClick={() => setShowRejectModal(true)}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              )}

              {/* Status Messages */}
              {task.status === 'content_submitted' && (
                <div className="text-center text-sm text-gray-500 py-4">
                  <Eye className="w-5 h-5 mx-auto mb-2 text-yellow-500" />
                  Content is pending tester review
                </div>
              )}
              {task.status === 'content_approved' && (
                <div className="text-center text-sm text-gray-500 py-4">
                  <CheckCircle className="w-5 h-5 mx-auto mb-2 text-purple-500" />
                  Content approved, awaiting marketer review
                </div>
              )}
              {task.status === 'content_rejected' && (task.rejectionNote || task.rejectionReason) && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-800 font-medium mb-1">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    Content Rejected - Action Required
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    <span className="font-medium">Reason: </span>
                    {task.rejectionNote || task.rejectionReason}
                  </p>
                </div>
              )}
              {task.status === 'content_rejected' && !(task.rejectionNote || task.rejectionReason) && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-800">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    Content rejected. Please revise and resubmit.
                  </p>
                </div>
              )}
              {task.status === 'submitted' && (
                <div className="text-center text-sm text-gray-500 py-4">
                  <Eye className="w-5 h-5 mx-auto mb-2 text-yellow-500" />
                  Task is pending tester review
                </div>
              )}
              {task.status === 'design_submitted' && (
                <div className="text-center text-sm text-gray-500 py-4">
                  <Eye className="w-5 h-5 mx-auto mb-2 text-yellow-500" />
                  Design is pending tester review
                </div>
              )}
              {task.status === 'development_submitted' && (
                <div className="text-center text-sm text-gray-500 py-4">
                  <Eye className="w-5 h-5 mx-auto mb-2 text-yellow-500" />
                  Development is pending tester review
                </div>
              )}
              {task.status === 'design_approved' && (
                <div className="text-center text-sm text-gray-500 py-4">
                  <CheckCircle className="w-5 h-5 mx-auto mb-2 text-purple-500" />
                  Design approved, awaiting development
                </div>
              )}
              {task.status === 'development_approved' && (
                <div className="text-center text-sm text-gray-500 py-4">
                  <CheckCircle className="w-5 h-5 mx-auto mb-2 text-purple-500" />
                  Development approved, awaiting marketer review
                </div>
              )}
              {task.status === 'approved_by_tester' && (
                <div className="text-center text-sm text-gray-500 py-4">
                  <CheckCircle className="w-5 h-5 mx-auto mb-2 text-purple-500" />
                  Awaiting marketer approval
                </div>
              )}
              {task.status === 'final_approved' && (
                <div className="text-center py-4">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="font-medium text-green-700">Task Completed</p>
                </div>
              )}
            </CardBody>
          </Card>
          )}

          {/* SOP Reference */}
          {/* {task.sopReference && (
            <Card>
              <CardBody className="p-6">
                <h3 className="font-semibold text-gray-900 mb-2">SOP Reference</h3>
                <a
                  href={task.sopReference}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  View Standard Operating Procedure
                </a>
              </CardBody>
            </Card>
          )} */}
        </div>
      </div>

      {/* Submission Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          {/* Modal Container - centered */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {task.taskType === 'content_creation' ? 'Submit Content for Review' :
                   task.taskType === 'landing_page_design' ? 'Submit Design for Review' :
                   task.taskType === 'landing_page_development' ? 'Submit Implementation for Review' :
                   task.taskType === 'graphic_design' ? 'Submit Creative for Review' :
                   task.taskType === 'video_editing' ? 'Submit Video for Review' :
                   'Submit Work for Review'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">

            <div className="space-y-5">
              {/* ============ CONTENT CREATION (Content Creator) ============ */}
              {task.taskType === 'content_creation' && (
                <>
                  {/* Content Link - Required */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content Link <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        value={submissionForm.contentLink}
                        onChange={(e) => setSubmissionForm({ ...submissionForm, contentLink: e.target.value })}
                        placeholder="https://docs.google.com/... or https://drive.google.com/..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Share a link to your content (Google Docs, Drive, Figma, etc.)
                    </p>
                  </div>

                  {/* Content File Upload - Optional */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Upload Content File <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="content-file-upload"
                    />
                    <label
                      htmlFor="content-file-upload"
                      className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-400 transition-colors text-center cursor-pointer block"
                    >
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">Click to upload content files</p>
                      <p className="text-xs text-gray-400 mt-1">Documents, Images, Videos (Max 100MB)</p>
                    </label>

                    {selectedFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <div className="overflow-hidden">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                            <button type="button" onClick={() => handleRemoveFile(index)} className="p-1 hover:bg-gray-200 rounded">
                              <X className="w-4 h-4 text-gray-500" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Content Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content Notes
                    </label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <textarea
                        value={submissionForm.contentNotes}
                        onChange={(e) => setSubmissionForm({ ...submissionForm, contentNotes: e.target.value })}
                        placeholder="Add notes about your content for the tester..."
                        rows={4}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ============ LANDING PAGE DESIGN (UI/UX Designer) ============ */}
              {task.taskType === 'landing_page_design' && (
                <>
                  {/* Design Link - Required */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Design Link <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        value={submissionForm.designLink}
                        onChange={(e) => setSubmissionForm({ ...submissionForm, designLink: e.target.value })}
                        placeholder="https://figma.com/file/... or https://drive.google.com/..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Share a link to your design file (Figma, Adobe XD, Drive, etc.)
                    </p>
                  </div>

                  {/* Design File Upload - Optional */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Upload Design File <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*,.pdf,.psd,.ai,.sketch,.fig,.zip"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="design-file-upload"
                    />
                    <label
                      htmlFor="design-file-upload"
                      className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-400 transition-colors text-center cursor-pointer block"
                    >
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">Click to upload design files</p>
                      <p className="text-xs text-gray-400 mt-1">PDF, PSD, AI, Sketch, Images (Max 100MB)</p>
                    </label>

                    {selectedFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <div className="overflow-hidden">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                            <button type="button" onClick={() => handleRemoveFile(index)} className="p-1 hover:bg-gray-200 rounded">
                              <X className="w-4 h-4 text-gray-500" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notes for Developer */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes for Developer
                    </label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <textarea
                        value={submissionForm.designNotes}
                        onChange={(e) => setSubmissionForm({ ...submissionForm, designNotes: e.target.value })}
                        placeholder="Add notes for the developer implementing this design..."
                        rows={4}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ============ LANDING PAGE DEVELOPMENT (Developer) ============ */}
              {task.taskType === 'landing_page_development' && (
                <>
                  {/* Show Design Reference if available */}
                  {task.designLink && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                      <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                        <Layout className="w-4 h-4" />
                        Design Reference from UI/UX Designer
                      </h4>
                      <a
                        href={normalizeUrl(task.designLink)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 text-sm break-all"
                      >
                        {task.designLink}
                        <ExternalLink className="w-4 h-4 flex-shrink-0" />
                      </a>
                      {task.designNotes && (
                        <div className="mt-2 pt-2 border-t border-blue-200">
                          <p className="text-xs text-blue-700 font-medium">Designer Notes:</p>
                          <p className="text-sm text-gray-700 mt-1">{task.designNotes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {task.designFile?.path && (
                    <div className="p-4 bg-gray-50 rounded-lg border mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <FileIcon className="w-4 h-4" />
                        Design File
                      </h4>
                      <a
                        href={task.designFile.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-white border rounded text-sm text-blue-600 hover:bg-gray-100 flex items-center gap-1 w-fit"
                      >
                        <Download className="w-4 h-4" />
                        {task.designFile.name || 'Download Design File'}
                      </a>
                    </div>
                  )}

                  {/* Implementation URL - Required */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Landing Page URL <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        value={submissionForm.implementationUrl}
                        onChange={(e) => setSubmissionForm({ ...submissionForm, implementationUrl: e.target.value })}
                        placeholder="https://your-landing-page.com"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      The URL where the landing page is deployed
                    </p>
                  </div>

                  {/* Repository Link - Optional */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Repository Link <span className="text-gray-400">(optional)</span>
                    </label>
                    <div className="relative">
                      <Code className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        value={submissionForm.repoLink}
                        onChange={(e) => setSubmissionForm({ ...submissionForm, repoLink: e.target.value })}
                        placeholder="https://github.com/username/repo"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Notes for Tester */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes for Tester
                    </label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <textarea
                        value={submissionForm.devNotes}
                        onChange={(e) => setSubmissionForm({ ...submissionForm, devNotes: e.target.value })}
                        placeholder="Add notes for the tester reviewing this implementation..."
                        rows={4}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ============ OTHER CREATIVE TASKS (Graphic Designer, Video Editor) ============ */}
              {/* Note: Content Planners have their own form above, this is for graphic_design and video_editing */}
              {['graphic_design', 'video_editing'].includes(task.taskType) && (
                <>
                  {/* Creative Link - Required */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Creative Link <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        value={submissionForm.creativeLink}
                        onChange={(e) => setSubmissionForm({ ...submissionForm, creativeLink: e.target.value })}
                        placeholder="https://figma.com/file/... or https://canva.com/..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Share a link to your design (Figma, Canva, Google Drive, etc.)
                    </p>
                  </div>

                  {/* File Upload - Optional */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Upload File <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*,video/*,.pdf,.psd,.ai,.sketch,.zip"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload-modal"
                    />
                    <label
                      htmlFor="file-upload-modal"
                      className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-400 transition-colors text-center cursor-pointer block"
                    >
                      <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">Click to upload files</p>
                      <p className="text-xs text-gray-400 mt-1">Images, Videos, PDFs, PSDs (Max 100MB)</p>
                    </label>

                    {selectedFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <div className="overflow-hidden">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                            <button type="button" onClick={() => handleRemoveFile(index)} className="p-1 hover:bg-gray-200 rounded">
                              <X className="w-4 h-4 text-gray-500" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notes for Reviewer */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes for Reviewer
                    </label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <textarea
                        value={submissionForm.reviewNotes}
                        onChange={(e) => setSubmissionForm({ ...submissionForm, reviewNotes: e.target.value })}
                        placeholder="Add any notes or context for the reviewer..."
                        rows={3}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowModal(false)} disabled={uploading}>
                Cancel
              </Button>
              <Button onClick={handleSubmitForReview} loading={uploading} disabled={uploading}>
                <Send className="w-4 h-4 mr-1" />
                Submit for Review
              </Button>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowRejectModal(false);
              setRejectionNote('');
              setRejectionReason('');
            }}
          />

          {/* Modal Container - centered */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-50 to-red-100 px-6 py-4 border-b border-red-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Reject Task</h2>
                    <p className="text-sm text-gray-600">{task?.taskTitle}</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Rejection
                  </label>
                  <select
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white text-gray-900"
                  >
                    <option value="">Select a reason...</option>
                    {REJECTION_REASONS.map(reason => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Detailed Feedback <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                    placeholder="Provide specific feedback for improvement..."
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionNote('');
                    setRejectionReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={canTesterReview() ? handleTesterReject : handleMarketerReject}
                  disabled={!rejectionNote.trim()}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject Task
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}