import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Card, CardBody, CardHeader, Button, Input, Textarea, Spinner } from '@/components/ui';
import { StageProgressTracker } from '@/components/workflow';
import { ArrowLeft, Plus, X, Upload, CheckCircle, Lightbulb, Eye, FileText, Image, Trash2, ExternalLink, Undo2 } from 'lucide-react';
import {
  saveStageData,
  loadStageData,
  clearStageData,
  hasLocalDraft,
  getPreviousStageRoute,
} from '@/utils/stageStorage';

// STATIC DATA MODE - Set to true for development, false for API calls
const USE_STATIC_DATA = false;

// Predefined suggestions for quick selection
const SUGGESTIONS = {
  painPoints: [
    'Low conversion rates',
    'High customer acquisition cost',
    'Poor lead quality',
    'Inconsistent sales',
    'Low website traffic',
    'High cart abandonment',
    'Poor customer retention',
    'Ineffective marketing',
    'Limited budget',
    'Time constraints',
    'Lack of automation',
    'Poor brand awareness',
    'Competition undercutting prices',
    'Difficulty scaling',
    'Low email open rates',
  ],
  desires: [
    'Increase sales',
    'Better ROI',
    'Automated marketing',
    'Higher conversion rates',
    'Quality leads',
    'Brand recognition',
    'Customer loyalty',
    'Scalable systems',
    'Cost reduction',
    'Time efficiency',
    'Data-driven decisions',
    'Competitive advantage',
    'Recurring revenue',
    'Market expansion',
    'Better customer insights',
  ],
  existingPurchases: [
    'CRM software',
    'Email marketing tool',
    'Analytics platform',
    'Social media management',
    'Advertising platform',
    'Website hosting',
    'SEO tools',
    'Course/Training',
    'Consulting services',
    'Marketing automation',
    'Landing page builder',
    'Chat software',
    'Phone system',
    'Accounting software',
  ],
  interests: [
    'Digital Marketing',
    'Business Growth',
    'Lead Generation',
    'Sales Automation',
    'Content Marketing',
    'Social Media',
    'Email Marketing',
    'SEO',
    'Paid Advertising',
    'Analytics',
    'Customer Experience',
    'Brand Building',
    'E-commerce',
    'Funnel Optimization',
    'Copywriting',
  ],
  ageRanges: [
    '18-24 years',
    '25-34 years',
    '35-44 years',
    '45-54 years',
    '55-64 years',
    '65+ years',
  ],
  incomeLevels: [
    'Under $25,000/year',
    '$25,000 - $50,000/year',
    '$50,000 - $75,000/year',
    '$75,000 - $100,000/year',
    '$100,000 - $150,000/year',
    '$150,000 - $250,000/year',
    '$250,000+/year',
  ],
  professions: [
    'Marketing Manager',
    'Business Owner',
    'Entrepreneur',
    'CEO/Founder',
    'Sales Director',
    'Digital Marketer',
    'E-commerce Manager',
    'Marketing Consultant',
    'Agency Owner',
    'Product Manager',
  ],
};

// Mock project data
const STATIC_PROJECT = {
  _id: 'static-project-1',
  customerName: 'John Smith',
  businessName: 'Acme Corporation',
  email: 'john@acme.com',
  mobile: '+1-555-0123',
  currentStage: 2,
  overallProgress: 16,
  stages: {
    onboarding: { isCompleted: true, completedAt: new Date() },
    marketResearch: { isCompleted: false, completedAt: null },
    offerEngineering: { isCompleted: false, completedAt: null },
    trafficStrategy: { isCompleted: false, completedAt: null },
    landingPage: { isCompleted: false, completedAt: null },
    creativeStrategy: { isCompleted: false, completedAt: null }
  },
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date()
};

// Mock market research data
const STATIC_MARKET_RESEARCH = {
  avatar: {
    ageRanges: ['25-34 years'],
    location: 'United States, Urban areas',
    incomeLevels: ['$50,000 - $75,000/year'],
    professions: ['Marketing Manager', 'Business Owner'],
    interests: ['Digital Marketing', 'Business Growth', 'Lead Generation']
  },
  painPoints: ['Low conversion rates', 'High customer acquisition cost', 'Poor lead quality'],
  desires: ['Increase sales', 'Better ROI', 'Automated marketing'],
  existingPurchases: ['CRM software', 'Email marketing tool', 'Analytics platform'],
  competitors: 'Competitor A has strong brand recognition but high prices. Competitor B offers budget solutions but lacks features.',
  completionPercentage: 50,
  isCompleted: false
};

// Reusable MultiSelectField component for array fields with suggestions
function MultiSelectField({ label, fieldName, suggestions, watch, setValue, newItem, setNewItem, placeholder }) {
  const selectedItems = watch(fieldName) || [];
  const availableSuggestions = suggestions.filter(s => !selectedItems.includes(s));

  const addItem = () => {
    if (!newItem.trim()) return;
    if (selectedItems.includes(newItem.trim())) {
      toast.info('This item is already added');
      return;
    }
    setValue(fieldName, [...selectedItems, newItem.trim()]);
    setNewItem('');
  };

  const removeItem = (index) => {
    const current = [...selectedItems];
    current.splice(index, 1);
    setValue(fieldName, current);
  };

  const addSuggestion = (suggestion) => {
    if (selectedItems.includes(suggestion)) {
      toast.info('This item is already added');
      return;
    }
    setValue(fieldName, [...selectedItems, suggestion]);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex gap-2 mb-2">
        <Input
          placeholder={placeholder}
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <Button type="button" onClick={addItem}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {availableSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          <span className="text-xs text-gray-500 flex items-center gap-1 mr-1">
            <Lightbulb className="w-3 h-3" /> Suggestions:
          </span>
          {availableSuggestions.slice(0, 6).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => addSuggestion(suggestion)}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-primary-50 hover:text-primary-700 rounded-full transition-colors"
            >
              + {suggestion}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {selectedItems.map((item, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm"
          >
            {item}
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="hover:text-primary-900"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function MarketResearchPage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [newInterest, setNewInterest] = useState('');
  const [newPainPoint, setNewPainPoint] = useState('');
  const [newDesire, setNewDesire] = useState('');
  const [newPurchase, setNewPurchase] = useState('');
  const [newAgeRange, setNewAgeRange] = useState('');
  const [newIncomeLevel, setNewIncomeLevel] = useState('');
  const [newProfession, setNewProfession] = useState('');
  const [visionBoard, setVisionBoard] = useState(null);
  const [strategySheet, setStrategySheet] = useState(null);
  const [uploadingVisionBoard, setUploadingVisionBoard] = useState(false);
  const [uploadingStrategySheet, setUploadingStrategySheet] = useState(false);
  const visionBoardInputRef = useRef(null);
  const strategySheetInputRef = useRef(null);

  // Admin can only view, Performance Marketer can edit
  const isAdmin = user?.role === 'admin';
  const isPerformanceMarketer = user?.role === 'performance_marketer';
  const canEdit = isPerformanceMarketer && !isAdmin;

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      avatar: {
        ageRanges: [],
        location: '',
        incomeLevels: [],
        professions: [],
        interests: [],
      },
      painPoints: [],
      desires: [],
      existingPurchases: [],
      competitorsText: '',
    },
  });

  // Watch values for display
  const interests = watch('avatar.interests') || [];
  const ageRanges = watch('avatar.ageRanges') || [];
  const incomeLevels = watch('avatar.incomeLevels') || [];
  const professions = watch('avatar.professions') || [];
  const painPoints = watch('painPoints') || [];
  const desires = watch('desires') || [];
  const existingPurchases = watch('existingPurchases') || [];

  useEffect(() => {
    if (!projectId) {
      navigate('/dashboard/projects');
      return;
    }
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      if (USE_STATIC_DATA) {
        setProject(STATIC_PROJECT);
        setValue('avatar', {
          ...STATIC_MARKET_RESEARCH.avatar,
          ageRanges: STATIC_MARKET_RESEARCH.avatar.ageRanges || [],
          incomeLevels: STATIC_MARKET_RESEARCH.avatar.incomeLevels || [],
          professions: STATIC_MARKET_RESEARCH.avatar.professions || [],
        });
        setValue('painPoints', STATIC_MARKET_RESEARCH.painPoints);
        setValue('desires', STATIC_MARKET_RESEARCH.desires);
        setValue('existingPurchases', STATIC_MARKET_RESEARCH.existingPurchases);
        setValue('competitors', STATIC_MARKET_RESEARCH.competitors[0]?.name || '');
        setIsCompleted(STATIC_MARKET_RESEARCH.isCompleted);
      } else {
        const { projectService, marketResearchService } = await import('@/services/api');
        const [projectRes, dataRes] = await Promise.all([
          projectService.getProject(projectId),
          marketResearchService.get(projectId),
        ]);
        setProject(projectRes.data);

        // Check for local draft first
        const localDraft = loadStageData(projectId, 'marketResearch');

        if (dataRes.data) {
          const avatar = dataRes.data.avatar || {};
          const localAvatar = localDraft?.avatar || {};

          setValue('avatar', {
            ageRanges: localDraft?.avatar?.ageRanges || avatar.ageRanges || [],
            location: localDraft?.avatar?.location || avatar.location || '',
            incomeLevels: localDraft?.avatar?.incomeLevels || avatar.incomeLevels || [],
            professions: localDraft?.avatar?.professions || avatar.professions || [],
            interests: localDraft?.avatar?.interests || avatar.interests || [],
          });
          setValue('painPoints', localDraft?.painPoints || dataRes.data.painPoints || []);
          setValue('desires', localDraft?.desires || dataRes.data.desires || []);
          setValue('existingPurchases', localDraft?.existingPurchases || dataRes.data.existingPurchases || []);
          setValue('competitorsText', localDraft?.competitorsText || dataRes.data.competitors || '');
          setIsCompleted(dataRes.data.isCompleted);
          // Load uploaded files
          if (dataRes.data.visionBoard && dataRes.data.visionBoard.fileName) {
            setVisionBoard(dataRes.data.visionBoard);
          }
          if (dataRes.data.strategySheet && dataRes.data.strategySheet.fileName) {
            setStrategySheet(dataRes.data.strategySheet);
          }

          // Show notification if local draft exists
          if (localDraft && localDraft._isLocalDraft) {
            toast.info('Your previously saved draft has been restored. Review and save to keep your changes.');
          }
        } else if (localDraft && localDraft._isLocalDraft) {
          // No server data but have local draft
          const localAvatar = localDraft.avatar || {};
          setValue('avatar', {
            ageRanges: localAvatar.ageRanges || [],
            location: localAvatar.location || '',
            incomeLevels: localAvatar.incomeLevels || [],
            professions: localAvatar.professions || [],
            interests: localAvatar.interests || [],
          });
          setValue('painPoints', localDraft.painPoints || []);
          setValue('desires', localDraft.desires || []);
          setValue('existingPurchases', localDraft.existingPurchases || []);
          setValue('competitorsText', localDraft.competitorsText || '');
          toast.info('Your previously saved draft has been restored. Review and save to keep your changes.');
        }
      }
    } catch (error) {
      // Only show error for actual failures (network errors, 500 errors, 403, 404)
      // The API interceptor transforms errors, so error.message is available directly
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to load market research';
      const statusCode = error?.response?.status || error?.status;

      console.error('Market research fetch error:', error);

      if (statusCode === 403) {
        toast.error('You do not have access to this project');
        navigate('/dashboard/projects');
      } else if (statusCode === 404) {
        toast.error('Project not found');
        navigate('/dashboard/projects');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (formData, markComplete = false) => {
    try {
      setSaving(true);

      if (USE_STATIC_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (markComplete) {
          setIsCompleted(true);
          setProject(prev => ({
            ...prev,
            stages: {
              ...prev.stages,
              marketResearch: { isCompleted: true, completedAt: new Date() }
            },
            currentStage: 3,
            overallProgress: 33
          }));
          // Clear local draft after successful completion
          clearStageData(projectId, 'marketResearch');
          toast.success('Market research completed! Moving to Offer Engineering...');
          setTimeout(() => {
            navigate(`/dashboard/offer-engineering?projectId=${projectId}`);
          }, 1500);
        } else {
          // Clear local draft after successful save
          clearStageData(projectId, 'marketResearch');
          toast.success('Progress saved!');
        }
      } else {
        const { marketResearchService } = await import('@/services/api');
        // Transform competitorsText to competitors for backend
        const submitData = {
          ...formData,
          competitors: formData.competitorsText || '',
        };
        delete submitData.competitorsText;
        await marketResearchService.upsert(projectId, {
          ...submitData,
          isCompleted: markComplete,
        });
        // Clear local draft after successful save
        clearStageData(projectId, 'marketResearch');
        toast.success(markComplete ? 'Market research completed!' : 'Progress saved!');
        if (markComplete) {
          navigate(`/dashboard/offer-engineering?projectId=${projectId}`);
        } else {
          fetchData();
        }
      }
    } catch (error) {
      console.error('Market research save error:', error);
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to save market research';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Handle going back to previous stage with auto-save
  const handleGoBack = async () => {
    try {
      // Get current form data
      const currentFormData = {
        avatar: {
          ageRanges: watch('avatar.ageRanges') || [],
          location: watch('avatar.location') || '',
          incomeLevels: watch('avatar.incomeLevels') || [],
          professions: watch('avatar.professions') || [],
          interests: watch('avatar.interests') || [],
        },
        painPoints: watch('painPoints') || [],
        desires: watch('desires') || [],
        existingPurchases: watch('existingPurchases') || [],
        competitorsText: watch('competitorsText') || '',
        visionBoard,
        strategySheet,
      };

      // Save to localStorage before navigating back
      saveStageData(projectId, 'marketResearch', currentFormData);
      toast.success('Progress saved locally');

      // Navigate to onboarding (previous stage)
      navigate(`/dashboard/onboarding?projectId=${projectId}`);
    } catch (error) {
      console.error('Error saving before navigating back:', error);
      // Still navigate even if save fails
      navigate(`/dashboard/onboarding?projectId=${projectId}`);
    }
  };

  const addItem = (field, value, setter) => {
    if (!value.trim()) return;
    const current = watch(field) || [];
    if (current.includes(value.trim())) {
      toast.info('This item is already added');
      return;
    }
    setValue(field, [...current, value.trim()]);
    setter('');
  };

  const removeItem = (field, index) => {
    const current = watch(field) || [];
    setValue(field, current.filter((_, i) => i !== index));
  };

  const addSuggestion = (field, suggestion) => {
    const current = watch(field) || [];
    if (current.includes(suggestion)) {
      toast.info('This item is already added');
      return;
    }
    setValue(field, [...current, suggestion]);
  };

  // File upload handlers
  const handleVisionBoardUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PNG, JPG, or PDF file');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    try {
      setUploadingVisionBoard(true);
      const { marketResearchService } = await import('@/services/api');
      const formData = new FormData();
      formData.append('file', file);
      const response = await marketResearchService.uploadVisionBoard(projectId, formData);
      setVisionBoard(response.data.visionBoard);
      toast.success('Vision Board uploaded successfully');
    } catch (error) {
      console.error('Vision Board upload error:', error);
      toast.error(error?.message || 'Failed to upload Vision Board');
    } finally {
      setUploadingVisionBoard(false);
      // Reset input
      if (visionBoardInputRef.current) {
        visionBoardInputRef.current.value = '';
      }
    }
  };

  const handleStrategySheetUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PDF, DOC, or DOCX file');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    try {
      setUploadingStrategySheet(true);
      const { marketResearchService } = await import('@/services/api');
      const formData = new FormData();
      formData.append('file', file);
      const response = await marketResearchService.uploadStrategySheet(projectId, formData);
      setStrategySheet(response.data.strategySheet);
      toast.success('Strategy Sheet uploaded successfully');
    } catch (error) {
      console.error('Strategy Sheet upload error:', error);
      toast.error(error?.message || 'Failed to upload Strategy Sheet');
    } finally {
      setUploadingStrategySheet(false);
      // Reset input
      if (strategySheetInputRef.current) {
        strategySheetInputRef.current.value = '';
      }
    }
  };

  const handleRemoveVisionBoard = () => {
    setVisionBoard(null);
    toast.success('Vision Board removed');
  };

  const handleRemoveStrategySheet = () => {
    setStrategySheet(null);
    toast.success('Strategy Sheet removed');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const calculateProgress = () => {
    const fields = [
      ageRanges.length > 0,
      watch('avatar.location'),
      incomeLevels.length > 0,
      professions.length > 0,
      painPoints.length > 0,
      desires.length > 0,
      existingPurchases.length > 0,
      watch('competitorsText'),
    ];
    const filled = fields.filter(f => f).length;
    return Math.round((filled / fields.length) * 100);
  };

  const progress = calculateProgress();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => navigate(`/dashboard/projects/${projectId}`)} className="p-2" title="Back to Project">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        {canEdit && (
          <Button
            variant="ghost"
            onClick={handleGoBack}
            className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50"
            title="Back to Onboarding (saves current progress locally)"
          >
            <Undo2 className="w-5 h-5" />
          </Button>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Market Research</h1>
          <p className="text-gray-600 mt-1">{project?.businessName}</p>
        </div>
        <div className="text-right">
          {isAdmin && !canEdit && (
            <div className="flex items-center gap-1 text-blue-600 text-sm mb-1">
              <Eye className="w-4 h-4" />
              <span>View Only</span>
            </div>
          )}
        </div>
      </div>

      {/* Read Only Notice for Admin */}
      {isAdmin && !canEdit && !isCompleted && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Eye className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">View Only</h3>
              <p className="text-sm text-blue-700">
                You can view the Market Research stage, but only Performance Marketers can make changes.
                As Admin, you can edit Landing Page and Creative Strategy stages.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Completion Banner */}
      {isCompleted && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <div>
            <h3 className="font-semibold text-green-800">Stage Completed!</h3>
            <p className="text-sm text-green-600">You can still make changes above. Click "Update Changes" to save any modifications.</p>
          </div>
        </div>
      )}

      {/* Progress */}
      <Card>
        <CardBody className="p-3 sm:p-4">
          <StageProgressTracker stages={project?.stages} currentStage={project?.currentStage} />
        </CardBody>
      </Card>

      <form onSubmit={handleSubmit((data) => onSubmit(data, false))}>
        {/* Customer Avatar */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Customer Avatar</h2>
            <p className="text-sm text-gray-500">Define your ideal customer profile</p>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Location"
                placeholder="e.g., United States, Urban areas"
                error={errors.avatar?.location?.message}
                {...register('avatar.location')}
              />
            </div>

            {/* Age Ranges - Multi-select */}
            <MultiSelectField
              label="Age Ranges"
              fieldName="avatar.ageRanges"
              suggestions={SUGGESTIONS.ageRanges}
              watch={watch}
              setValue={setValue}
              newItem={newAgeRange}
              setNewItem={setNewAgeRange}
              placeholder="Add age range..."
            />

            {/* Income Levels - Multi-select */}
            <MultiSelectField
              label="Income Levels"
              fieldName="avatar.incomeLevels"
              suggestions={SUGGESTIONS.incomeLevels}
              watch={watch}
              setValue={setValue}
              newItem={newIncomeLevel}
              setNewItem={setNewIncomeLevel}
              placeholder="Add income level..."
            />

            {/* Professions - Multi-select */}
            <MultiSelectField
              label="Professions"
              fieldName="avatar.professions"
              suggestions={SUGGESTIONS.professions}
              watch={watch}
              setValue={setValue}
              newItem={newProfession}
              setNewItem={setNewProfession}
              placeholder="Add profession..."
            />

            {/* Interests */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Interests</label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Add an interest..."
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addItem('avatar.interests', newInterest, setNewInterest);
                    }
                  }}
                />
                <Button type="button" onClick={() => addItem('avatar.interests', newInterest, setNewInterest)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                <span className="text-xs text-gray-500 flex items-center gap-1 mr-1">
                  <Lightbulb className="w-3 h-3" /> Suggestions:
                </span>
                {SUGGESTIONS.interests.filter(s => !interests.includes(s)).slice(0, 8).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => addSuggestion('avatar.interests', suggestion)}
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-primary-50 hover:text-primary-700 rounded-full transition-colors"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm"
                  >
                    {interest}
                    <button
                      type="button"
                      onClick={() => removeItem('avatar.interests', index)}
                      className="hover:text-primary-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Pain Points */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Customer Pain Points</h2>
            <p className="text-sm text-gray-500">What problems does your customer face?</p>
          </CardHeader>
          <CardBody>
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="Add a pain point..."
                value={newPainPoint}
                onChange={(e) => setNewPainPoint(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addItem('painPoints', newPainPoint, setNewPainPoint);
                  }
                }}
              />
              <Button type="button" onClick={() => addItem('painPoints', newPainPoint, setNewPainPoint)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              <span className="text-xs text-gray-500 flex items-center gap-1 mr-1">
                <Lightbulb className="w-3 h-3" /> Quick add:
              </span>
              {SUGGESTIONS.painPoints.filter(s => !painPoints.includes(s)).slice(0, 10).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => addSuggestion('painPoints', suggestion)}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-red-50 hover:text-red-700 rounded-full transition-colors"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {painPoints.map((point, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-red-50 text-red-800 rounded-lg"
                >
                  <span>{point}</span>
                  <button
                    type="button"
                    onClick={() => removeItem('painPoints', index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Desires */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Customer Desires</h2>
            <p className="text-sm text-gray-500">What does your customer want to achieve?</p>
          </CardHeader>
          <CardBody>
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="Add a desire..."
                value={newDesire}
                onChange={(e) => setNewDesire(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addItem('desires', newDesire, setNewDesire);
                  }
                }}
              />
              <Button type="button" onClick={() => addItem('desires', newDesire, setNewDesire)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              <span className="text-xs text-gray-500 flex items-center gap-1 mr-1">
                <Lightbulb className="w-3 h-3" /> Quick add:
              </span>
              {SUGGESTIONS.desires.filter(s => !desires.includes(s)).slice(0, 10).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => addSuggestion('desires', suggestion)}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-green-50 hover:text-green-700 rounded-full transition-colors"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {desires.map((desire, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-green-50 text-green-800 rounded-lg"
                >
                  <span>{desire}</span>
                  <button
                    type="button"
                    onClick={() => removeItem('desires', index)}
                    className="text-green-600 hover:text-green-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Existing Purchases */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Existing Purchases</h2>
            <p className="text-sm text-gray-500">What has your customer already purchased?</p>
          </CardHeader>
          <CardBody>
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="Add a purchase..."
                value={newPurchase}
                onChange={(e) => setNewPurchase(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addItem('existingPurchases', newPurchase, setNewPurchase);
                  }
                }}
              />
              <Button type="button" onClick={() => addItem('existingPurchases', newPurchase, setNewPurchase)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              <span className="text-xs text-gray-500 flex items-center gap-1 mr-1">
                <Lightbulb className="w-3 h-3" /> Quick add:
              </span>
              {SUGGESTIONS.existingPurchases.filter(s => !existingPurchases.includes(s)).slice(0, 10).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => addSuggestion('existingPurchases', suggestion)}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 rounded-full transition-colors"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {existingPurchases.map((purchase, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-blue-50 text-blue-800 rounded-lg"
                >
                  <span>{purchase}</span>
                  <button
                    type="button"
                    onClick={() => removeItem('existingPurchases', index)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Competitor Analysis */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Competitor Funnels</h2>
            <p className="text-sm text-gray-500">Analyze your competition</p>
          </CardHeader>
          <CardBody>
            <Textarea
              placeholder="Describe your competitors and their strategies..."
              rows={4}
              {...register('competitorsText')}
            />
          </CardBody>
        </Card>

        {/* File Uploads */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
            <p className="text-sm text-gray-500">Upload vision board and strategy sheets</p>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Vision Board Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vision Board</label>
                {visionBoard ? (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary-100 rounded-lg">
                        <Image className="w-5 h-5 text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{visionBoard.fileName}</p>
                        <p className="text-xs text-gray-500">
                          Uploaded {new Date(visionBoard.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {visionBoard.filePath && (
                          <a
                            href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${visionBoard.filePath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="View file"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={handleRemoveVisionBoard}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove file"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      canEdit
                        ? 'border-gray-300 hover:border-primary-500 cursor-pointer'
                        : 'border-gray-200 cursor-not-allowed opacity-60'
                    }`}
                    onClick={() => canEdit && visionBoardInputRef.current?.click()}
                  >
                    {uploadingVisionBoard ? (
                      <div className="flex flex-col items-center">
                        <Spinner size="sm" />
                        <p className="text-sm text-gray-500 mt-2">Uploading...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF up to 10MB</p>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={visionBoardInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf"
                  onChange={handleVisionBoardUpload}
                  className="hidden"
                  disabled={!canEdit || uploadingVisionBoard}
                />
              </div>

              {/* Strategy Sheet Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">10-Year Strategy Sheet</label>
                {strategySheet ? (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary-100 rounded-lg">
                        <FileText className="w-5 h-5 text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{strategySheet.fileName}</p>
                        <p className="text-xs text-gray-500">
                          Uploaded {new Date(strategySheet.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {strategySheet.filePath && (
                          <a
                            href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${strategySheet.filePath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="View file"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={handleRemoveStrategySheet}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove file"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      canEdit
                        ? 'border-gray-300 hover:border-primary-500 cursor-pointer'
                        : 'border-gray-200 cursor-not-allowed opacity-60'
                    }`}
                    onClick={() => canEdit && strategySheetInputRef.current?.click()}
                  >
                    {uploadingStrategySheet ? (
                      <div className="flex flex-col items-center">
                        <Spinner size="sm" />
                        <p className="text-sm text-gray-500 mt-2">Uploading...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX up to 10MB</p>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={strategySheetInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleStrategySheetUpload}
                  className="hidden"
                  disabled={!canEdit || uploadingStrategySheet}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Actions */}
        <div className="flex justify-between items-center">
          {canEdit && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleGoBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Onboarding
            </Button>
          )}
          <div className="flex gap-4 ml-auto">
            {canEdit ? (
              <>
                <Button type="submit" variant="secondary" loading={saving}>
                  {isCompleted ? 'Update Changes' : 'Save Progress'}
                </Button>
                {!isCompleted && (
                  <Button type="button" loading={saving} onClick={handleSubmit((data) => onSubmit(data, true))}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Complete & Continue
                  </Button>
                )}
                {isCompleted && (
                  <Button type="button" onClick={() => navigate(`/dashboard/offer-engineering?projectId=${projectId}`)}>
                    Continue to Offer Engineering
                    <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                  </Button>
                )}
              </>
            ) : (
              <Button type="button" onClick={() => navigate(`/dashboard/offer-engineering?projectId=${projectId}`)}>
                Continue to Offer Engineering
                <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}