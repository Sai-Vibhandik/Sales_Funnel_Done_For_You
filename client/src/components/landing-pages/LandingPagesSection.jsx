import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardBody, CardHeader, Button, Input, Spinner } from '@/components/ui';
import { Plus, Edit, Trash2, FileText, X, Users, Code, Palette, Settings, CheckSquare, Check, FileText as FileTextIcon } from 'lucide-react';
import { projectService, authService, brandSettingsService } from '@/services/api';

const FUNNEL_TYPES = [
  { id: 'video_sales_letter', label: 'Video Sales Letter' },
  { id: 'long_form', label: 'Long Form Page' },
  { id: 'lead_magnet', label: 'Lead Magnet' },
  { id: 'ebook', label: 'E-book Page' },
  { id: 'webinar', label: 'Webinar Page' }
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
  { id: 'multi', label: 'Multi-Platform' }
];

const LEAD_CAPTURE_METHODS = [
  { id: 'form', label: 'Form' },
  { id: 'calendly', label: 'Calendly' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'free_audit', label: 'Free Audit' }
];

export default function LandingPagesSection({ projectId, landingPages = [], onSave, loading, isCompleted, assignedTeam }) {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [designers, setDesigners] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [contentWriters, setContentWriters] = useState([]);
  const [graphicDesigners, setGraphicDesigners] = useState([]);
  const [videoEditors, setVideoEditors] = useState([]);
  const [testers, setTesters] = useState([]);
  const [brandSettings, setBrandSettings] = useState(null);
  const [brandSettingsLoading, setBrandSettingsLoading] = useState(true);

  // ─── FIX: Use ref to track saving state for immediate synchronous check
  // This prevents multiple clicks before React state updates
  const isSavingRef = useRef(false);

  const [formData, setFormData] = useState({
    name: '',
    funnelType: 'video_sales_letter',
    platform: 'facebook',
    hook: '',
    angle: '',
    cta: '',
    offer: '',
    messaging: '',
    leadCaptureMethod: 'form',
    headline: '',
    subheadline: '',
    assignedDesigners: [],
    assignedDevelopers: [],
    assignedContentWriters: [],
    assignedGraphicDesigners: [],
    assignedVideoEditors: [],
    assignedTesters: []
  });

  // Fetch available designers and developers from project's assigned team
  useEffect(() => {
    console.log('=== LandingPagesSection useEffect ===');
    console.log('assignedTeam prop:', assignedTeam);
    if (assignedTeam) {
      // Get UI/UX Designers from project's assigned team
      const uiUxDesigners = assignedTeam.uiUxDesigners || [];
      const uiUxDesignerLegacy = assignedTeam.uiUxDesigner;
      const allDesigners = uiUxDesigners.length > 0 ? uiUxDesigners : (uiUxDesignerLegacy ? [uiUxDesignerLegacy] : []);
      console.log('allDesigners:', allDesigners);
      setDesigners(allDesigners);

      // Get Developers from project's assigned team
      const developersList = assignedTeam.developers || [];
      const developerLegacy = assignedTeam.developer;
      const allDevelopers = developersList.length > 0 ? developersList : (developerLegacy ? [developerLegacy] : []);
      console.log('allDevelopers:', allDevelopers);
      setDevelopers(allDevelopers);

      // Get Content Writers from project's assigned team
      const contentWritersList = assignedTeam.contentWriters || [];
      const contentWriterLegacy = assignedTeam.contentWriter;
      const allContentWriters = contentWritersList.length > 0 ? contentWritersList : (contentWriterLegacy ? [contentWriterLegacy] : []);
      setContentWriters(allContentWriters);

      // Get Graphic Designers from project's assigned team
      const graphicDesignersList = assignedTeam.graphicDesigners || [];
      const graphicDesignerLegacy = assignedTeam.graphicDesigner;
      const allGraphicDesigners = graphicDesignersList.length > 0 ? graphicDesignersList : (graphicDesignerLegacy ? [graphicDesignerLegacy] : []);
      setGraphicDesigners(allGraphicDesigners);

      // Get Video Editors from project's assigned team
      const videoEditorsList = assignedTeam.videoEditors || [];
      const videoEditorLegacy = assignedTeam.videoEditor;
      const allVideoEditors = videoEditorsList.length > 0 ? videoEditorsList : (videoEditorLegacy ? [videoEditorLegacy] : []);
      setVideoEditors(allVideoEditors);

      // Get Testers from project's assigned team
      const testersList = assignedTeam.testers || [];
      const testerLegacy = assignedTeam.tester;
      const allTesters = testersList.length > 0 ? testersList : (testerLegacy ? [testerLegacy] : []);
      console.log('allTesters:', allTesters);
      setTesters(allTesters);
    } else {
      console.log('No assignedTeam prop provided');
    }
  }, [assignedTeam]);

  // Fetch brand settings
  useEffect(() => {
    const fetchBrandSettings = async () => {
      try {
        setBrandSettingsLoading(true);
        const response = await brandSettingsService.getBrandSettings(projectId);
        if (response.data) {
          setBrandSettings(response.data);
        }
      } catch (error) {
        console.error('Error fetching brand settings:', error);
      } finally {
        setBrandSettingsLoading(false);
      }
    };
    fetchBrandSettings();
  }, [projectId]);

  // Check if brand settings are configured
  const hasBrandSettings = brandSettings && (
    (brandSettings.colors && Object.values(brandSettings.colors).some(c => c?.hex)) ||
    (brandSettings.typography && Object.values(brandSettings.typography).some(t => t?.fontFamily)) ||
    brandSettings.brandManual?.filePath ||
    brandSettings.logos?.primary?.filePath
  );

  // Helper to extract member IDs from populated objects or strings
  const extractMemberIds = (members) => {
    if (!members || !Array.isArray(members)) return [];
    return members.map(m => {
      if (typeof m === 'object' && m !== null) {
        return m._id?.toString() || m._id || String(m);
      }
      return String(m);
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      funnelType: 'video_sales_letter',
      platform: 'facebook',
      hook: '',
      angle: '',
      cta: '',
      offer: '',
      messaging: '',
      leadCaptureMethod: 'form',
      headline: '',
      subheadline: '',
      assignedDesigners: [],
      assignedDevelopers: [],
      assignedContentWriters: [],
      assignedGraphicDesigners: [],
      assignedVideoEditors: [],
      assignedTesters: []
    });
    setEditingIndex(null);
    setShowForm(false);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddNew = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (index) => {
    const lp = landingPages[index];
    setFormData({
      name: lp.name || '',
      funnelType: lp.funnelType || 'video_sales_letter',
      platform: lp.platform || 'facebook',
      hook: lp.hook || '',
      angle: lp.angle || '',
      cta: lp.cta || '',
      offer: lp.offer || '',
      messaging: lp.messaging || '',
      leadCaptureMethod: lp.leadCaptureMethod || 'form',
      headline: lp.headline || '',
      subheadline: lp.subheadline || '',
      // Load from array fields, fallback to legacy single fields
      assignedDesigners: extractMemberIds(lp.assignedDesigners || []).length > 0
        ? extractMemberIds(lp.assignedDesigners)
        : (lp.assignedDesigner ? [lp.assignedDesigner._id || lp.assignedDesigner] : []),
      assignedDevelopers: extractMemberIds(lp.assignedDevelopers || []).length > 0
        ? extractMemberIds(lp.assignedDevelopers)
        : (lp.assignedDeveloper ? [lp.assignedDeveloper._id || lp.assignedDeveloper] : []),
      assignedContentWriters: extractMemberIds(lp.assignedContentWriters || []),
      assignedGraphicDesigners: extractMemberIds(lp.assignedGraphicDesigners || []),
      assignedVideoEditors: extractMemberIds(lp.assignedVideoEditors || []),
      assignedTesters: extractMemberIds(lp.assignedTesters || [])
    });
    setEditingIndex(index);
    setShowForm(true);
  };

  const handleSave = async () => {
    // ─── FIX: Guard against concurrent saves using both ref and state
    if (saving || isSavingRef.current) return;

    if (!formData.name.trim()) {
      toast.error('Please enter a landing page name');
      return;
    }

    // Validation - at least one designer and developer required
    if (!formData.assignedDesigners || formData.assignedDesigners.length === 0) {
      toast.error('Please select at least one UI/UX Designer for this landing page');
      return;
    }

    if (!formData.assignedDevelopers || formData.assignedDevelopers.length === 0) {
      toast.error('Please select at least one Developer for this landing page');
      return;
    }

    if (!formData.assignedTesters || formData.assignedTesters.length === 0) {
      toast.error('Please select at least one Tester for this landing page');
      return;
    }

    setSaving(true);
    isSavingRef.current = true;
    try {
      // Prepare data with both new array fields and legacy single fields
      const dataToSave = {
        ...formData,
        // Legacy single fields (use first element for backward compatibility)
        assignedDesigner: formData.assignedDesigners[0] || null,
        assignedDeveloper: formData.assignedDevelopers[0] || null,
      };

      if (editingIndex !== null) {
        // Update existing
        await onSave('update', editingIndex, dataToSave);
        toast.success('Landing page updated');
      } else {
        // Add new
        await onSave('add', null, dataToSave);
        toast.success('Landing page added');
      }
      resetForm();
    } catch (error) {
      console.error('Error saving landing page:', error);
      toast.error(error?.message || 'Failed to save landing page');
    } finally {
      setSaving(false);
      isSavingRef.current = false;
    }
  };

  const handleDelete = async (index) => {
    // Guard against concurrent operations
    if (saving || isSavingRef.current) return;

    if (!confirm('Are you sure you want to delete this landing page?')) {
      return;
    }

    setSaving(true);
    isSavingRef.current = true;
    try {
      await onSave('delete', index);
      toast.success('Landing page deleted');
    } catch (error) {
      console.error('Error deleting landing page:', error);
      toast.error(error?.message || 'Failed to delete landing page');
    } finally {
      setSaving(false);
      isSavingRef.current = false;
    }
  };

  // Helper to get member name
  const getMemberName = (member) => {
    if (!member) return 'Unknown';
    if (typeof member === 'object') return member.name || 'Unknown';
    return 'Unknown';
  };

  // Helper to get member names by IDs (for arrays)
  const getMemberNames = (ids, memberList) => {
    if (!ids || !Array.isArray(ids) || ids.length === 0) return 'Not assigned';
    return ids.map(id => {
      const member = memberList.find(m => (m._id || m)?.toString() === id.toString());
      return member ? getMemberName(member) : 'Unknown';
    }).join(', ');
  };

  // Helper to toggle member selection in array
  const toggleMember = (field, memberId) => {
    setFormData(prev => {
      const currentArray = prev[field] || [];
      const isSelected = currentArray.includes(memberId);
      return {
        ...prev,
        [field]: isSelected
          ? currentArray.filter(id => id !== memberId)
          : [...currentArray, memberId]
      };
    });
  };

  // Helper to get designer name by ID
  const getDesignerName = (id) => {
    if (!id) return 'Not assigned';
    const designer = designers.find(d => (d._id || d)?.toString() === id.toString());
    return designer ? getMemberName(designer) : 'Unknown';
  };

  // Helper to get developer name by ID
  const getDeveloperName = (id) => {
    if (!id) return 'Not assigned';
    const developer = developers.find(d => (d._id || d)?.toString() === id.toString());
    return developer ? getMemberName(developer) : 'Unknown';
  };

  // Helper to get tester name by ID
  const getTesterName = (id) => {
    if (!id) return 'Unknown';
    const tester = testers.find(t => (t._id || t)?.toString() === id.toString());
    return tester ? getMemberName(tester) : 'Unknown';
  };

  return (
    <Card>
    <CardHeader>
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Landing Pages</h2>
      <p className="text-sm text-gray-500">
        Create landing page strategies and assign team members for each
      </p>
    </div>

    {!showForm && (
      <div className="flex items-center gap-2 shrink-0">
        {/* Brand Settings Button */}
        {hasBrandSettings ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/dashboard/projects/${projectId}/brand-settings`)}
            className="border-green-400 text-green-700 hover:bg-green-50 text-xs px-3 py-1"
          >
            <Palette className="w-3 h-3 mr-1 text-green-600" />
            <span>Brand Settings</span>
            <span className="ml-1 text-green-600">✓</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/dashboard/projects/${projectId}/brand-settings`)}
            className="border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs px-3 py-1 font-semibold animate-pulse"
          >
            <Palette className="w-3 h-3 mr-1 text-amber-600" />
            <span className="hidden sm:inline">Setup Brand Settings</span>
            <span className="sm:hidden">Brand Setup</span>
            <span className="ml-1 text-amber-500">!</span>
          </Button>
        )}

        {/* Add Landing Page Button */}
        <Button
          onClick={handleAddNew}
          disabled={loading}
          size="sm"
          className="text-xs px-3 py-1"
        >
          <Plus className="w-3 h-3 mr-1" />
          <span className="hidden sm:inline">Add Landing Page</span>
          <span className="sm:hidden">Add Page</span>
        </Button>
      </div>
    )}
  </div>
</CardHeader>
      <CardBody className="space-y-4">
        {/* Landing Page Form */}
        {showForm && (
          <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
            {/* Brand Settings Warning */}
            {!hasBrandSettings && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Brand settings not configured</p>
                    <p className="text-xs text-amber-600">Set up brand colors, fonts, and logos for consistent designs</p>
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

            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">
                {editingIndex !== null ? 'Edit Landing Page' : 'New Landing Page'}
              </h3>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Landing Page Name"
                placeholder="e.g., Free Trial Funnel"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Funnel Type</label>
                <select
                  value={formData.funnelType}
                  onChange={(e) => handleInputChange('funnelType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {FUNNEL_TYPES.map(ft => (
                    <option key={ft.id} value={ft.id}>{ft.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                <select
                  value={formData.platform}
                  onChange={(e) => handleInputChange('platform', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {PLATFORMS.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead Capture Method</label>
                <select
                  value={formData.leadCaptureMethod}
                  onChange={(e) => handleInputChange('leadCaptureMethod', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {LEAD_CAPTURE_METHODS.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Team Member Assignments */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Team Assignments for this Landing Page
              </h4>
              <p className="text-xs text-blue-600 mb-4">Select multiple team members for each role. Tasks will be created for each selected member.</p>
              <div className="space-y-4">
                {/* UI/UX Designers */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Palette className="w-4 h-4 text-purple-500" />
                    UI/UX Designers <span className="text-red-500">*</span>
                  </label>
                  {designers.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">
                      No UI/UX Designers assigned to this project. Contact admin to add team members.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {designers.map(designer => {
                        const id = (designer._id || designer)?.toString();
                        const isSelected = formData.assignedDesigners.includes(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => toggleMember('assignedDesigners', id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                              isSelected
                                ? 'bg-purple-50 border-purple-300 text-purple-700'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-purple-200 hover:bg-purple-25'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-purple-500 border-purple-500' : 'border-gray-300'}`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span>{getMemberName(designer)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {formData.assignedDesigners.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">{formData.assignedDesigners.length} designer{formData.assignedDesigners.length !== 1 ? 's' : ''} selected</p>
                  )}
                </div>

                {/* Developers */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Code className="w-4 h-4 text-green-500" />
                    Developers <span className="text-red-500">*</span>
                  </label>
                  {developers.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">
                      No Developers assigned to this project. Contact admin to add team members.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {developers.map(developer => {
                        const id = (developer._id || developer)?.toString();
                        const isSelected = formData.assignedDevelopers.includes(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => toggleMember('assignedDevelopers', id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                              isSelected
                                ? 'bg-green-50 border-green-300 text-green-700'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-green-200 hover:bg-green-25'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span>{getMemberName(developer)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {formData.assignedDevelopers.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">{formData.assignedDevelopers.length} developer{formData.assignedDevelopers.length !== 1 ? 's' : ''} selected</p>
                  )}
                </div>

                {/* Content Planners */}
                {/* <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <FileTextIcon className="w-4 h-4 text-blue-500" />
                    Content Planners
                  </label>
                  {contentWriters.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">
                      No Content Planners assigned to this project. Contact admin to add team members.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {contentWriters.map(writer => {
                        const id = (writer._id || writer)?.toString();
                        const isSelected = formData.assignedContentWriters.includes(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => toggleMember('assignedContentWriters', id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                              isSelected
                                ? 'bg-blue-50 border-blue-300 text-blue-700'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-blue-200 hover:bg-blue-25'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span>{getMemberName(writer)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {formData.assignedContentWriters.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">{formData.assignedContentWriters.length} content planner{formData.assignedContentWriters.length !== 1 ? 's' : ''} selected</p>
                  )}
                </div> */}

                {/* Graphic Designers */}
                {/* <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Palette className="w-4 h-4 text-pink-500" />
                    Graphic Designers
                  </label>
                  {graphicDesigners.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">
                      No Graphic Designers assigned to this project. Contact admin to add team members.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {graphicDesigners.map(designer => {
                        const id = (designer._id || designer)?.toString();
                        const isSelected = formData.assignedGraphicDesigners.includes(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => toggleMember('assignedGraphicDesigners', id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                              isSelected
                                ? 'bg-pink-50 border-pink-300 text-pink-700'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-pink-200 hover:bg-pink-25'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-pink-500 border-pink-500' : 'border-gray-300'}`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span>{getMemberName(designer)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {formData.assignedGraphicDesigners.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">{formData.assignedGraphicDesigners.length} graphic designer{formData.assignedGraphicDesigners.length !== 1 ? 's' : ''} selected</p>
                  )}
                </div> */}

                {/* Video Editors */}
                {/* <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Users className="w-4 h-4 text-cyan-500" />
                    Video Editors
                  </label>
                  {videoEditors.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">
                      No Video Editors assigned to this project. Contact admin to add team members.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {videoEditors.map(editor => {
                        const id = (editor._id || editor)?.toString();
                        const isSelected = formData.assignedVideoEditors.includes(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => toggleMember('assignedVideoEditors', id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                              isSelected
                                ? 'bg-cyan-50 border-cyan-300 text-cyan-700'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-cyan-200 hover:bg-cyan-25'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-gray-300'}`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span>{getMemberName(editor)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {formData.assignedVideoEditors.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">{formData.assignedVideoEditors.length} video editor{formData.assignedVideoEditors.length !== 1 ? 's' : ''} selected</p>
                  )}
                </div> */}

                {/* Testers */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <CheckSquare className="w-4 h-4 text-orange-500" />
                    Testers <span className="text-red-500">*</span>
                  </label>
                  {testers.length === 0 ? (
                    <p className="text-xs text-red-500 italic">
                      No Testers assigned to this project. Please contact admin to assign testers.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {testers.map(tester => {
                        const id = (tester._id || tester)?.toString();
                        const isSelected = formData.assignedTesters.includes(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => toggleMember('assignedTesters', id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                              isSelected
                                ? 'bg-orange-50 border-orange-300 text-orange-700'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-orange-200 hover:bg-orange-25'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span>{getMemberName(tester)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {formData.assignedTesters.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">{formData.assignedTesters.length} tester{formData.assignedTesters.length !== 1 ? 's' : ''} selected</p>
                  )}
                </div>
              </div>
            </div>

            {/* <Input
              label="Hook"
              placeholder="What's the main hook that grabs attention?"
              value={formData.hook}
              onChange={(e) => handleInputChange('hook', e.target.value)}
            />

            <Input
              label="Angle"
              placeholder="What's the creative angle or approach?"
              value={formData.angle}
              onChange={(e) => handleInputChange('angle', e.target.value)}
            />

            <Input
              label="Call-to-Action (CTA)"
              placeholder="e.g., Get Started Now"
              value={formData.cta}
              onChange={(e) => handleInputChange('cta', e.target.value)}
            />

            <Input
              label="Offer"
              placeholder="What's the main offer?"
              value={formData.offer}
              onChange={(e) => handleInputChange('offer', e.target.value)}
            />

            <Input
              label="Headline"
              placeholder="Main headline for the landing page"
              value={formData.headline}
              onChange={(e) => handleInputChange('headline', e.target.value)}
            />

            <Input
              label="Subheadline"
              placeholder="Supporting headline"
              value={formData.subheadline}
              onChange={(e) => handleInputChange('subheadline', e.target.value)}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Messaging</label>
              <textarea
                value={formData.messaging}
                onChange={(e) => handleInputChange('messaging', e.target.value)}
                placeholder="Key messaging and talking points"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div> */}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleSave} loading={saving}>
                {editingIndex !== null ? 'Update' : 'Add'} Landing Page
              </Button>
            </div>
          </div>
        )}

        {/* Landing Pages List */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : landingPages.length === 0 && !showForm ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">No landing pages created yet</p>
            <Button onClick={handleAddNew}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Landing Page
            </Button>
          </div>
        ) : (
          !showForm && (
            <div className="space-y-3">
              {landingPages.map((lp, index) => (
                <div
                  key={lp._id || index}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{lp.name}</h4>
                    <p className="text-sm text-gray-500">
                      {FUNNEL_TYPES.find(ft => ft.id === lp.funnelType)?.label || lp.funnelType} • {PLATFORMS.find(p => p.id === lp.platform)?.label || lp.platform}
                    </p>
                    {/* {lp.hook && (
                      <p className="text-sm text-gray-400 mt-1 truncate max-w-md">
                        Hook: {lp.hook}
                      </p>
                    )} */}
                    {/* Show assigned team members */}
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      {/* UI/UX Designers */}
                      {(lp.assignedDesigners?.length > 0 || lp.assignedDesigner) && (
                        <span className="text-xs flex items-center gap-1 text-purple-600">
                          <Palette className="w-3 h-3" />
                          {getMemberNames(lp.assignedDesigners?.length > 0 ? lp.assignedDesigners : (lp.assignedDesigner ? [lp.assignedDesigner] : []), designers)}
                        </span>
                      )}
                      {/* Developers */}
                      {(lp.assignedDevelopers?.length > 0 || lp.assignedDeveloper) && (
                        <span className="text-xs flex items-center gap-1 text-green-600">
                          <Code className="w-3 h-3" />
                          {getMemberNames(lp.assignedDevelopers?.length > 0 ? lp.assignedDevelopers : (lp.assignedDeveloper ? [lp.assignedDeveloper] : []), developers)}
                        </span>
                      )}
                      {/* Testers */}
                      {(lp.assignedTesters?.length > 0) && (
                        <span className="text-xs flex items-center gap-1 text-orange-600">
                          <CheckSquare className="w-3 h-3" />
                          {lp.assignedTesters.map(t => getTesterName(typeof t === 'object' ? t._id : t)).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(index)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

      </CardBody>
    </Card>
  );
}