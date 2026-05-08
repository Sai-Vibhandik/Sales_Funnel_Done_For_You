import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardBody, CardHeader, Button, Input, Textarea, Spinner } from '@/components/ui';
import { StageProgressTracker } from '@/components/workflow';
import { ArrowLeft, ArrowRight, Users, Code, Palette, Undo2, FileText, CheckCircle, Check } from 'lucide-react';
import { projectService, brandSettingsService } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Eye } from 'lucide-react';
import {
  saveStageData,
  loadStageData,
  clearStageData,
} from '@/utils/stageStorage';

const LANDING_PAGE_TYPES = [
  { id: 'video_sales_letter', label: 'Video Sales Letter', icon: '🎥' },
  { id: 'long_form', label: 'Long-form Page', icon: '📄' },
  { id: 'lead_magnet', label: 'Lead Magnet', icon: '🧲' },
  { id: 'ebook', label: 'Ebook Page', icon: '📚' },
  { id: 'webinar', label: 'Webinar Page', icon: '🖥️' },
];

const PLATFORMS = [
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'google', label: 'Google Ads' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'twitter', label: 'Twitter/X' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'multi', label: 'Multi-Platform' },
];

// Helper function to extract member IDs from team array
const extractMemberIds = (members) => {
  if (!members || !Array.isArray(members)) return [];
  return members.map(m => {
    if (typeof m === 'object' && m !== null) {
      return m._id?.toString() || m._id || String(m);
    }
    return String(m);
  });
};

// Helper function to normalize member list for display
const normalizeMemberList = (members) => {
  if (!members || !Array.isArray(members)) return [];
  return members.map(m => {
    if (typeof m === 'object' && m !== null) {
      return { _id: m._id?.toString() || m._id || String(m), name: m.name || 'Unknown' };
    }
    return { _id: String(m), name: 'Team Member' };
  });
};

export default function LandingPageStrategyPage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const landingPageId = searchParams.get('landingPageId');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState(null);
  const [brandSettings, setBrandSettings] = useState(null);
  const [brandSettingsLoading, setBrandSettingsLoading] = useState(true);

  // Available team members from project
  const [availableDesigners, setAvailableDesigners] = useState([]);
  const [availableDevelopers, setAvailableDevelopers] = useState([]);
  const [availableContentWriters, setAvailableContentWriters] = useState([]);
  const [availableGraphicDesigners, setAvailableGraphicDesigners] = useState([]);
  const [availableVideoEditors, setAvailableVideoEditors] = useState([]);
  const [availableTesters, setAvailableTesters] = useState([]);

  // Form state - multi-select arrays
  const [name, setName] = useState('');
  const [funnelType, setFunnelType] = useState('video_sales_letter');
  const [hook, setHook] = useState('');
  const [angle, setAngle] = useState('');
  const [adPlatforms, setAdPlatforms] = useState(['facebook']);
  const [cta, setCta] = useState('');
  const [offer, setOffer] = useState('');
  const [messaging, setMessaging] = useState('');
  const [assignedDesigners, setAssignedDesigners] = useState([]);
  const [assignedDevelopers, setAssignedDevelopers] = useState([]);
  const [assignedContentWriters, setAssignedContentWriters] = useState([]);
  const [assignedGraphicDesigners, setAssignedGraphicDesigners] = useState([]);
  const [assignedVideoEditors, setAssignedVideoEditors] = useState([]);
  const [assignedTesters, setAssignedTesters] = useState([]);

  // Permission checks - Only Performance Marketer can edit, Admin view only
  const isAdmin = user?.role === 'admin';
  const isPerformanceMarketer = user?.role === 'performance_marketer';
  const canEdit = isPerformanceMarketer && !isAdmin;

  useEffect(() => {
    if (!projectId) {
      navigate('/dashboard/projects');
      return;
    }
    fetchData();
  }, [projectId, landingPageId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const projectRes = await projectService.getProject(projectId);
      setProject(projectRes.data);

      // Extract all team members from project's assigned team
      const assignedTeam = projectRes.data.assignedTeam || {};

      // UI/UX Designers
      const uiUxDesigners = normalizeMemberList(assignedTeam.uiUxDesigners || []);
      const uiUxDesignerLegacy = assignedTeam.uiUxDesigner;
      const allDesigners = uiUxDesigners.length > 0 ? uiUxDesigners : (uiUxDesignerLegacy ? normalizeMemberList([uiUxDesignerLegacy]) : []);
      setAvailableDesigners(allDesigners);

      // Developers
      const developers = normalizeMemberList(assignedTeam.developers || []);
      const developerLegacy = assignedTeam.developer;
      const allDevelopers = developers.length > 0 ? developers : (developerLegacy ? normalizeMemberList([developerLegacy]) : []);
      setAvailableDevelopers(allDevelopers);

      // Content Writers
      const contentWriters = normalizeMemberList(assignedTeam.contentWriters || []);
      const contentWriterLegacy = assignedTeam.contentWriter;
      const allContentWriters = contentWriters.length > 0 ? contentWriters : (contentWriterLegacy ? normalizeMemberList([contentWriterLegacy]) : []);
      setAvailableContentWriters(allContentWriters);

      // Graphic Designers
      const graphicDesigners = normalizeMemberList(assignedTeam.graphicDesigners || []);
      const graphicDesignerLegacy = assignedTeam.graphicDesigner;
      const allGraphicDesigners = graphicDesigners.length > 0 ? graphicDesigners : (graphicDesignerLegacy ? normalizeMemberList([graphicDesignerLegacy]) : []);
      setAvailableGraphicDesigners(allGraphicDesigners);

      // Video Editors
      const videoEditors = normalizeMemberList(assignedTeam.videoEditors || []);
      const videoEditorLegacy = assignedTeam.videoEditor;
      const allVideoEditors = videoEditors.length > 0 ? videoEditors : (videoEditorLegacy ? normalizeMemberList([videoEditorLegacy]) : []);
      setAvailableVideoEditors(allVideoEditors);

      // Testers
      const testers = normalizeMemberList(assignedTeam.testers || []);
      const testerLegacy = assignedTeam.tester;
      const allTesters = testers.length > 0 ? testers : (testerLegacy ? normalizeMemberList([testerLegacy]) : []);
      setAvailableTesters(allTesters);

      // Fetch brand settings
      try {
        const brandRes = await brandSettingsService.getBrandSettings(projectId);
        if (brandRes.data) {
          setBrandSettings(brandRes.data);
        }
      } catch (brandErr) {
        console.log('No brand settings found for this project');
      } finally {
        setBrandSettingsLoading(false);
      }

      // Check if traffic strategy is completed
      if (!projectRes.data.stages?.trafficStrategy?.isCompleted) {
        toast.error('Complete Traffic Strategy first to access Landing Pages');
        navigate('/dashboard/projects');
        return;
      }

      // Check for local draft
      const localDraft = loadStageData(projectId, 'landingPage');

      if (landingPageId) {
        // Load specific landing page from embedded array
        const lp = projectRes.data.landingPages?.find(lp => lp._id === landingPageId);
        if (lp) {
          setName(localDraft?.name || lp.name || '');
          setFunnelType(localDraft?.funnelType || lp.funnelType || 'video_sales_letter');
          setHook(localDraft?.hook || lp.hook || '');
          setAngle(localDraft?.angle || lp.angle || '');
          setAdPlatforms(localDraft?.adPlatforms || lp.adPlatforms || ['facebook']);
          setCta(localDraft?.cta || lp.cta || '');
          setOffer(localDraft?.offer || lp.offer || '');
          setMessaging(localDraft?.messaging || lp.messaging || '');

          // Load assigned team members (support both new array and legacy single field)
          setAssignedDesigners(localDraft?.assignedDesigners || extractMemberIds(lp.assignedDesigners || []) || (lp.assignedDesigner ? [lp.assignedDesigner._id || lp.assignedDesigner] : []));
          setAssignedDevelopers(localDraft?.assignedDevelopers || extractMemberIds(lp.assignedDevelopers || []) || (lp.assignedDeveloper ? [lp.assignedDeveloper._id || lp.assignedDeveloper] : []));
          setAssignedContentWriters(localDraft?.assignedContentWriters || extractMemberIds(lp.assignedContentWriters || []));
          setAssignedGraphicDesigners(localDraft?.assignedGraphicDesigners || extractMemberIds(lp.assignedGraphicDesigners || []));
          setAssignedVideoEditors(localDraft?.assignedVideoEditors || extractMemberIds(lp.assignedVideoEditors || []));
          setAssignedTesters(localDraft?.assignedTesters || extractMemberIds(lp.assignedTesters || []));

          // Show notification if local draft exists
          if (localDraft && localDraft._isLocalDraft) {
            toast.info('Your previously saved draft has been restored. Review and save to keep your changes.');
          }
        } else {
          toast.error('Landing page not found');
          navigate(`/dashboard/landing-pages?projectId=${projectId}`);
        }
      } else if (localDraft && localDraft._isLocalDraft) {
        // New landing page with local draft
        setName(localDraft.name || '');
        setFunnelType(localDraft.funnelType || 'video_sales_letter');
        setHook(localDraft.hook || '');
        setAngle(localDraft.angle || '');
        setAdPlatforms(localDraft.adPlatforms || ['facebook']);
        setCta(localDraft.cta || '');
        setOffer(localDraft.offer || '');
        setMessaging(localDraft.messaging || '');
        setAssignedDesigners(localDraft.assignedDesigners || []);
        setAssignedDevelopers(localDraft.assignedDevelopers || []);
        setAssignedContentWriters(localDraft.assignedContentWriters || []);
        setAssignedGraphicDesigners(localDraft.assignedGraphicDesigners || []);
        setAssignedVideoEditors(localDraft.assignedVideoEditors || []);
        setAssignedTesters(localDraft.assignedTesters || []);
        toast.info('Your previously saved draft has been restored. Review and save to keep your changes.');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      const errorMessage = error?.message || 'Failed to load landing page';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a landing page name');
      return;
    }

    try {
      setSaving(true);

      const landingPageData = {
        name,
        funnelType,
        hook,
        angle,
        adPlatforms,
        cta,
        offer,
        messaging,
        // New array fields for multi-select
        assignedDesigners,
        assignedDevelopers,
        assignedContentWriters,
        assignedGraphicDesigners,
        assignedVideoEditors,
        assignedTesters,
        // Legacy single fields (use first element for backward compatibility)
        assignedDesigner: assignedDesigners[0] || null,
        assignedDeveloper: assignedDevelopers[0] || null,
      };

      if (landingPageId) {
        // Update existing
        await projectService.updateLandingPage(projectId, landingPageId, landingPageData);
      } else {
        // Create new
        await projectService.addLandingPage(projectId, landingPageData);
      }

      // Clear local draft after successful save
      clearStageData(projectId, 'landingPage');
      toast.success('Landing page saved!');

      // Navigate back to landing pages list
      navigate(`/dashboard/landing-pages?projectId=${projectId}`);
    } catch (error) {
      console.error('Error saving landing page:', error);
      toast.error(error?.message || 'Failed to save landing page');
    } finally {
      setSaving(false);
    }
  };

  // Handle going back to previous stage with auto-save
  const handleGoBack = async () => {
    try {
      // Get current form data
      const currentFormData = {
        name,
        funnelType,
        hook,
        angle,
        adPlatforms,
        cta,
        offer,
        messaging,
        assignedDesigners,
        assignedDevelopers,
        assignedContentWriters,
        assignedGraphicDesigners,
        assignedVideoEditors,
        assignedTesters,
      };

      // Save to localStorage before navigating back
      saveStageData(projectId, 'landingPage', currentFormData);
      toast.success('Progress saved locally');

      // Navigate to traffic strategy (previous stage)
      navigate(`/dashboard/traffic-strategy?projectId=${projectId}`);
    } catch (error) {
      console.error('Error saving before navigating back:', error);
      // Still navigate even if save fails
      navigate(`/dashboard/traffic-strategy?projectId=${projectId}`);
    }
  };

  const handleContinue = async () => {
    // Save first if there are unsaved changes
    if (!name.trim()) {
      toast.error('Please enter a landing page name before continuing');
      return;
    }

    try {
      setSaving(true);

      const landingPageData = {
        name,
        funnelType,
        hook,
        angle,
        adPlatforms,
        cta,
        offer,
        messaging,
        assignedDesigners,
        assignedDevelopers,
        assignedContentWriters,
        assignedGraphicDesigners,
        assignedVideoEditors,
        assignedTesters,
        // Legacy single fields
        assignedDesigner: assignedDesigners[0] || null,
        assignedDeveloper: assignedDevelopers[0] || null,
      };

      if (landingPageId) {
        await projectService.updateLandingPage(projectId, landingPageId, landingPageData);
      }

      // Clear local draft after successful save
      clearStageData(projectId, 'landingPage');

      // Mark landing page stage as complete
      try {
        await projectService.completeLandingPageStage(projectId);
        toast.success('Landing page stage completed!');
      } catch (completeError) {
        // Continue even if completion fails - backend allows access if landing pages exist
        console.error('Error completing stage:', completeError);
      }

      // Navigate to creative strategy - no task generation
      navigate(`/dashboard/creative-strategy?projectId=${projectId}`);
    } catch (error) {
      console.error('Error saving landing page:', error);
      toast.error(error?.message || 'Failed to save landing page');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => navigate(`/dashboard/landing-pages?projectId=${projectId}`)} className="p-2" title="Back to Landing Pages">
          <ArrowLeft className="w-5 h-5" />
        </Button>
       
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {name || 'Landing Page Strategy'}
          </h1>
          <p className="text-gray-600 mt-1">{project?.businessName}</p>
        </div>
        {isAdmin && !isPerformanceMarketer && (
          <div className="flex items-center gap-1 text-blue-600 text-sm">
            <Eye className="w-4 h-4" />
            <span>View Only</span>
          </div>
        )}
      </div>

      {/* Progress */}
      <Card>
        <CardBody className="p-3 sm:p-4">
          <StageProgressTracker stages={project?.stages} currentStage={project?.currentStage} />
        </CardBody>
      </Card>

      {/* Read Only Notice for Admin */}
      {isAdmin && !isPerformanceMarketer && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Eye className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">View Only</h3>
              <p className="text-sm text-blue-700">
                You can view the Landing Page Strategy, but only Performance Marketers can make changes. Contact your team if changes are needed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
          <p className="text-sm text-gray-500">Name and platform for this landing page</p>
        </CardHeader>
        <CardBody className="space-y-4">
          <Input
            label="Landing Page Name"
            placeholder="e.g., Main Landing Page, Campaign A, etc."
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Funnel Type</label>
              <select
                value={funnelType}
                onChange={(e) => setFunnelType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={!canEdit}
              >
                {LANDING_PAGE_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ad Platforms</label>
              <p className="text-xs text-gray-500 mb-2">Select all platforms where this landing page will be promoted</p>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => {
                  const isSelected = adPlatforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setAdPlatforms(adPlatforms.filter(id => id !== p.id));
                        } else {
                          setAdPlatforms([...adPlatforms, p.id]);
                        }
                      }}
                      className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                        isSelected
                          ? 'bg-primary-100 border-primary-300 text-primary-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-primary-200 hover:bg-primary-50'
                      } ${!canEdit ? 'cursor-not-allowed opacity-60' : ''}`}
                      disabled={!canEdit}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Team Assignment */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" />
            Team Assignment
          </h2>
          <p className="text-sm text-gray-500">Assign team members for this landing page. You can select multiple members for each role.</p>
        </CardHeader>
        <CardBody className="space-y-6">
          {/* UI/UX Designers */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Palette className="w-4 h-4 text-purple-500" />
              UI/UX Designers
            </label>
            <div className="space-y-2">
              {availableDesigners.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No UI/UX Designers assigned to this project. Contact admin to add team members.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableDesigners.map(designer => {
                    const isSelected = assignedDesigners.includes(designer._id);
                    return (
                      <button
                        key={designer._id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setAssignedDesigners(assignedDesigners.filter(id => id !== designer._id));
                          } else {
                            setAssignedDesigners([...assignedDesigners, designer._id]);
                          }
                        }}
                        disabled={!canEdit}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                          isSelected
                            ? 'bg-purple-50 border-purple-300 text-purple-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-purple-200 hover:bg-purple-25'
                        } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-purple-500 border-purple-500' : 'border-gray-300'}`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span>{designer.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {assignedDesigners.length > 0 && (
                <p className="text-xs text-gray-500">{assignedDesigners.length} designer{assignedDesigners.length !== 1 ? 's' : ''} selected</p>
              )}
            </div>
          </div>

          {/* Developers */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Code className="w-4 h-4 text-green-500" />
              Developers
            </label>
            <div className="space-y-2">
              {availableDevelopers.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No Developers assigned to this project. Contact admin to add team members.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableDevelopers.map(developer => {
                    const isSelected = assignedDevelopers.includes(developer._id);
                    return (
                      <button
                        key={developer._id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setAssignedDevelopers(assignedDevelopers.filter(id => id !== developer._id));
                          } else {
                            setAssignedDevelopers([...assignedDevelopers, developer._id]);
                          }
                        }}
                        disabled={!canEdit}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                          isSelected
                            ? 'bg-green-50 border-green-300 text-green-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-green-200 hover:bg-green-25'
                        } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span>{developer.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {assignedDevelopers.length > 0 && (
                <p className="text-xs text-gray-500">{assignedDevelopers.length} developer{assignedDevelopers.length !== 1 ? 's' : ''} selected</p>
              )}
            </div>
          </div>

          {/* Content Writers */}
          {/* <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 text-blue-500" />
              Content Planners
            </label>
            <div className="space-y-2">
              {availableContentWriters.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No Content Planners assigned to this project. Contact admin to add team members.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableContentWriters.map(writer => {
                    const isSelected = assignedContentWriters.includes(writer._id);
                    return (
                      <button
                        key={writer._id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setAssignedContentWriters(assignedContentWriters.filter(id => id !== writer._id));
                          } else {
                            setAssignedContentWriters([...assignedContentWriters, writer._id]);
                          }
                        }}
                        disabled={!canEdit}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                          isSelected
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-blue-200 hover:bg-blue-25'
                        } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span>{writer.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {assignedContentWriters.length > 0 && (
                <p className="text-xs text-gray-500">{assignedContentWriters.length} content planner{assignedContentWriters.length !== 1 ? 's' : ''} selected</p>
              )}
            </div>
          </div> */}

          {/* Graphic Designers */}
          {/* <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Palette className="w-4 h-4 text-pink-500" />
              Graphic Designers
            </label>
            <div className="space-y-2">
              {availableGraphicDesigners.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No Graphic Designers assigned to this project. Contact admin to add team members.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableGraphicDesigners.map(designer => {
                    const isSelected = assignedGraphicDesigners.includes(designer._id);
                    return (
                      <button
                        key={designer._id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setAssignedGraphicDesigners(assignedGraphicDesigners.filter(id => id !== designer._id));
                          } else {
                            setAssignedGraphicDesigners([...assignedGraphicDesigners, designer._id]);
                          }
                        }}
                        disabled={!canEdit}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                          isSelected
                            ? 'bg-pink-50 border-pink-300 text-pink-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-pink-200 hover:bg-pink-25'
                        } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-pink-500 border-pink-500' : 'border-gray-300'}`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span>{designer.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {assignedGraphicDesigners.length > 0 && (
                <p className="text-xs text-gray-500">{assignedGraphicDesigners.length} graphic designer{assignedGraphicDesigners.length !== 1 ? 's' : ''} selected</p>
              )}
            </div>
          </div> */}

          {/* Video Editors */}
          {/* <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 text-cyan-500" />
              Video Editors
            </label>
            <div className="space-y-2">
              {availableVideoEditors.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No Video Editors assigned to this project. Contact admin to add team members.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableVideoEditors.map(editor => {
                    const isSelected = assignedVideoEditors.includes(editor._id);
                    return (
                      <button
                        key={editor._id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setAssignedVideoEditors(assignedVideoEditors.filter(id => id !== editor._id));
                          } else {
                            setAssignedVideoEditors([...assignedVideoEditors, editor._id]);
                          }
                        }}
                        disabled={!canEdit}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                          isSelected
                            ? 'bg-cyan-50 border-cyan-300 text-cyan-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-cyan-200 hover:bg-cyan-25'
                        } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-gray-300'}`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span>{editor.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {assignedVideoEditors.length > 0 && (
                <p className="text-xs text-gray-500">{assignedVideoEditors.length} video editor{assignedVideoEditors.length !== 1 ? 's' : ''} selected</p>
              )}
            </div>
          </div> */}

          {/* Testers */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <CheckCircle className="w-4 h-4 text-orange-500" />
              Testers
            </label>
            <div className="space-y-2">
              {availableTesters.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No Testers assigned to this project. Contact admin to add team members.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableTesters.map(tester => {
                    const isSelected = assignedTesters.includes(tester._id);
                    return (
                      <button
                        key={tester._id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setAssignedTesters(assignedTesters.filter(id => id !== tester._id));
                          } else {
                            setAssignedTesters([...assignedTesters, tester._id]);
                          }
                        }}
                        disabled={!canEdit}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                          isSelected
                            ? 'bg-orange-50 border-orange-300 text-orange-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-orange-200 hover:bg-orange-25'
                        } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span>{tester.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {assignedTesters.length > 0 && (
                <p className="text-xs text-gray-500">{assignedTesters.length} tester{assignedTesters.length !== 1 ? 's' : ''} selected</p>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
            <strong>Note:</strong> Select multiple team members for each role. Tasks will be assigned to all selected members.
            If no members are selected for a role, the task will be created without assignment and can be assigned later.
          </p>
        </CardBody>
      </Card>

      {/* Brand Settings */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary-500" />
            Brand Settings
          </h2>
          <p className="text-sm text-gray-500">Configure brand colors, typography, and logos for landing page designs</p>
        </CardHeader>
        <CardBody>
          {brandSettingsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : brandSettings && (
            (brandSettings.colors && Object.values(brandSettings.colors).some(c => c?.hex)) ||
            (brandSettings.typography && Object.values(brandSettings.typography).some(t => t?.fontFamily)) ||
            brandSettings.brandManual?.filePath
          ) ? (
            <div className="space-y-4">
              {/* Brand Settings Summary */}
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Brand settings configured</p>
                    <p className="text-sm text-green-600">
                      {brandSettings.colors && Object.values(brandSettings.colors).filter(c => c?.hex).length} colors
                      {brandSettings.typography && Object.values(brandSettings.typography).filter(t => t?.fontFamily).length > 0 && `, ${Object.values(brandSettings.typography).filter(t => t?.fontFamily).length} fonts`}
                      {brandSettings.brandManual?.filePath && ', brand manual uploaded'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/dashboard/projects/${projectId}/brand-settings`)}
                >
                  Edit Settings
                </Button>
              </div>

              {/* Quick Preview */}
              {brandSettings.colors && Object.values(brandSettings.colors).some(c => c?.hex) && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Brand Colors</p>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(brandSettings.colors).map(([key, color]) => {
                      if (!color?.hex) return null;
                      return (
                        <div key={key} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
                          <div
                            className="w-4 h-4 rounded-full border border-gray-300"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span className="text-sm text-gray-700 capitalize">{key}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {brandSettings.typography && Object.values(brandSettings.typography).some(t => t?.fontFamily) && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Typography</p>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(brandSettings.typography).map(([key, typo]) => {
                      if (!typo?.fontFamily) return null;
                      return (
                        <div key={key} className="px-3 py-1.5 bg-gray-100 rounded-full">
                          <span className="text-sm text-gray-700 capitalize">{key}: </span>
                          <span className="text-sm font-medium text-gray-900">{typo.fontFamily}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Palette className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">No brand settings configured</p>
                  <p className="text-sm text-amber-600">
                    Set up brand colors, typography, and logos for consistent designs
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/dashboard/projects/${projectId}/brand-settings`)}
                className="bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-300"
              >
                Setup Now
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Strategy Fields
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Strategy</h2>
          <p className="text-sm text-gray-500">Define the hook and angle for this landing page</p>
        </CardHeader>
        <CardBody className="space-y-4">
          <Textarea
            label="Hook"
            placeholder="What's the main hook that grabs attention?"
            value={hook}
            onChange={(e) => setHook(e.target.value)}
            rows={2}
          />
          <Textarea
            label="Angle"
            placeholder="What's the creative angle or approach?"
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
            rows={2}
          />
          <Input
            label="Call-to-Action (CTA)"
            placeholder="e.g., Get Started Now"
            value={cta}
            onChange={(e) => setCta(e.target.value)}
          />
          <Input
            label="Offer"
            placeholder="What's the main offer?"
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
          />
          <Textarea
            label="Messaging"
            placeholder="Key messaging and talking points"
            value={messaging}
            onChange={(e) => setMessaging(e.target.value)}
            rows={3}
          />
        </CardBody>
      </Card> */}

      {/* Actions */}
      <div className="flex justify-between gap-4">
       
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onSave} loading={saving}>
              Save
            </Button>
            
            {/* <Button onClick={handleContinue} loading={saving}>
              Continue to Creative Strategy
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button> */}
          </div>
        )}
      </div>
    </div>
  );
}