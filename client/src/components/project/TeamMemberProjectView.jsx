import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { projectService, taskService, strategyService } from '@/services/api';
import { Card, CardBody, CardHeader, Button, Badge, Spinner } from '@/components/ui';
import ProjectSummary from './ProjectSummary';
import {
  ArrowLeft, ClipboardList, Play, CheckCircle, Clock,
  Eye, Palette, Code, Video, FileText, Search, Gift,
  TrendingUp, Lightbulb, FileText as FileTextIcon, Users
} from 'lucide-react';

const TASK_TYPES = {
  graphic_design: { label: 'Graphic Design', icon: Palette },
  video_editing: { label: 'Video Editing', icon: Video },
  landing_page_design: { label: 'Landing Page Design', icon: Eye },
  landing_page_development: { label: 'Landing Page Development', icon: Code },
  content_creation: { label: 'Content Creation', icon: FileText },
  content_writing: { label: 'Content Writing', icon: FileText },
};

const STATUS_CONFIG = {
  todo: { label: 'To Do', color: 'bg-gray-100 text-gray-800' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  submitted: { label: 'Submitted', color: 'bg-yellow-100 text-yellow-800' },
  approved_by_tester: { label: 'Tester Approved', color: 'bg-purple-100 text-purple-800' },
  final_approved: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  content_pending: { label: 'Content Pending', color: 'bg-orange-100 text-orange-800' },
  content_submitted: { label: 'Content Submitted', color: 'bg-yellow-100 text-yellow-800' },
  content_approved: { label: 'Content Approved', color: 'bg-purple-100 text-purple-800' },
  content_rejected: { label: 'Content Rejected', color: 'bg-red-100 text-red-800' },
  content_final_approved: { label: 'Content Final Approved', color: 'bg-green-100 text-green-800' },
  design_pending: { label: 'Design Pending', color: 'bg-orange-100 text-orange-800' },
  design_submitted: { label: 'Design Submitted', color: 'bg-yellow-100 text-yellow-800' },
  design_approved: { label: 'Design Approved', color: 'bg-purple-100 text-purple-800' },
  design_rejected: { label: 'Design Rejected', color: 'bg-red-100 text-red-800' },
  development_pending: { label: 'Dev Pending', color: 'bg-orange-100 text-orange-800' },
  development_submitted: { label: 'Dev Submitted', color: 'bg-yellow-100 text-yellow-800' },
  development_approved: { label: 'Dev Approved', color: 'bg-purple-100 text-purple-800' },
};

export default function TeamMemberProjectView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [strategy, setStrategy] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');

  const isDeveloper = user?.role === 'developer';
  const isGraphicDesigner = user?.role === 'graphic_designer';
  const isUIDesigner = user?.role === 'ui_ux_designer';
  const isContentWriter = user?.role === 'content_writer';
  const isVideoEditor = user?.role === 'video_editor';

  useEffect(() => {
    fetchProjectAndTasks();
  }, [id]);

  // Refetch data when window regains focus (to ensure fresh data)
  useEffect(() => {
    const handleFocus = () => {
      fetchProjectAndTasks();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [id]);

  const fetchProjectAndTasks = async () => {
    try {
      setLoading(true);

      // Fetch project and tasks in parallel
      const [projectRes, tasksRes] = await Promise.all([
        projectService.getProject(id),
        taskService.getProjectTasks(id)
      ]);

      setProject(projectRes.data);
      setTasks(tasksRes.data || []);
    } catch (error) {
      toast.error('Failed to load project');
      navigate('/dashboard/projects');
    } finally {
      setLoading(false);
    }
  };

  // Fetch strategy when strategy tab is active
  useEffect(() => {
    if (activeTab === 'strategy') {
      fetchStrategy();
    }
  }, [activeTab, id]);

  const fetchStrategy = async () => {
    try {
      setLoading(true);
      const res = await strategyService.getCompleteStrategy(id);
      setStrategy(res.data);
    } catch (error) {
      console.error('Failed to load strategy:', error);
      toast.error('Failed to load strategy data');
    } finally {
      setLoading(false);
    }
  };

  // Filter tasks based on role
  const filteredTasks = tasks.filter(task => {
    if (isDeveloper) {
      // Developers only see landing page development tasks that have been approved by marketer
      // (design approved, ready for development)
      return task.taskType === 'landing_page_development' &&
             ['development_pending', 'development_submitted', 'development_approved', 'final_approved'].includes(task.status);
    }
    if (isUIDesigner) {
      // UI/UX Designers only see landing page design tasks
      return task.taskType === 'landing_page_design';
    }
    if (isGraphicDesigner) {
      // Graphic Designers see graphic design tasks (images, carousels, offers)
      return task.taskType === 'graphic_design';
    }
    if (isVideoEditor) {
      // Video Editors see video editing tasks
      return task.taskType === 'video_editing';
    }
    if (isContentWriter) {
      // Content Planners see content_creation tasks (handles both content_creation and content_writing)
      return task.taskType === 'content_creation' || task.taskType === 'content_writing';
    }
    return false;
  });

  // Group tasks by status
  const pendingTasks = filteredTasks.filter(t =>
    ['todo', 'content_pending', 'design_pending', 'development_pending'].includes(t.status)
  );
  const inProgressTasks = filteredTasks.filter(t =>
    ['in_progress', 'submitted', 'content_submitted', 'design_submitted', 'development_submitted', 'content_rejected', 'design_rejected', 'rejected'].includes(t.status)
  );
  const completedTasks = filteredTasks.filter(t =>
    ['approved_by_tester', 'content_approved', 'design_approved', 'development_approved', 'final_approved', 'content_final_approved'].includes(t.status)
  );

  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.todo;
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getTaskTypeBadge = (taskType) => {
    const config = TASK_TYPES[taskType] || { label: taskType, icon: ClipboardList };
    const Icon = config.icon;
    return (
      <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard/projects')}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {project.projectName || project.businessName}
              </h1>
              <Badge variant={project.status === 'active' ? 'success' : 'default'}>
                {project.status}
              </Badge>
            </div>
            <p className="text-gray-600 mt-1">{project.customerName}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'summary'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Project Summary
          </button>
          <button
            onClick={() => setActiveTab('strategy')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'strategy'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Strategy
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'tasks'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            My Tasks ({filteredTasks.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'summary' && (
        <ProjectSummary projectId={id} />
      )}

      {activeTab === 'strategy' && (
        <div className="space-y-6">
          {/* Strategy Stage Progress */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Strategy Stages</h2>
                <p className="text-sm text-gray-500 mt-1">
                  View the complete strategy created by the Performance Marketer
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/dashboard/projects/${id}/strategy-summary`)}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Full Strategy
              </Button>
            </CardHeader>
            <CardBody className="p-6">
              {project.stages && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Market Research */}
                  <div className={`p-4 rounded-lg border ${project.stages.marketResearch?.isCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Search className={`w-5 h-5 ${project.stages.marketResearch?.isCompleted ? 'text-green-600' : 'text-gray-400'}`} />
                      <h3 className="font-medium text-gray-900">Market Research</h3>
                      {project.stages.marketResearch?.isCompleted && <CheckCircle className="w-5 h-5 text-green-500" />}
                    </div>
                    <p className="text-sm text-gray-500">Target audience, pain points, desires</p>
                  </div>

                  {/* Offer Engineering */}
                  <div className={`p-4 rounded-lg border ${project.stages.offerEngineering?.isCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className={`w-5 h-5 ${project.stages.offerEngineering?.isCompleted ? 'text-green-600' : 'text-gray-400'}`} />
                      <h3 className="font-medium text-gray-900">Offer Engineering</h3>
                      {project.stages.offerEngineering?.isCompleted && <CheckCircle className="w-5 h-5 text-green-500" />}
                    </div>
                    <p className="text-sm text-gray-500">Value proposition, bonuses</p>
                  </div>

                  {/* Traffic Strategy */}
                  <div className={`p-4 rounded-lg border ${project.stages.trafficStrategy?.isCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className={`w-5 h-5 ${project.stages.trafficStrategy?.isCompleted ? 'text-green-600' : 'text-gray-400'}`} />
                      <h3 className="font-medium text-gray-900">Traffic Strategy</h3>
                      {project.stages.trafficStrategy?.isCompleted && <CheckCircle className="w-5 h-5 text-green-500" />}
                    </div>
                    <p className="text-sm text-gray-500">Channels, hooks, messaging</p>
                  </div>

                  {/* Landing Page */}
                  <div className={`p-4 rounded-lg border ${project.stages.landingPage?.isCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <FileTextIcon className={`w-5 h-5 ${project.stages.landingPage?.isCompleted ? 'text-green-600' : 'text-gray-400'}`} />
                      <h3 className="font-medium text-gray-900">Landing Page</h3>
                      {project.stages.landingPage?.isCompleted && <CheckCircle className="w-5 h-5 text-green-500" />}
                    </div>
                    <p className="text-sm text-gray-500">Page strategy, funnel type</p>
                  </div>

                  {/* Creative Strategy */}
                  <div className={`p-4 rounded-lg border ${project.stages.creativeStrategy?.isCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className={`w-5 h-5 ${project.stages.creativeStrategy?.isCompleted ? 'text-green-600' : 'text-gray-400'}`} />
                      <h3 className="font-medium text-gray-900">Creative Strategy</h3>
                      {project.stages.creativeStrategy?.isCompleted && <CheckCircle className="w-5 h-5 text-green-500" />}
                    </div>
                    <p className="text-sm text-gray-500">Ad types, creative angles</p>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Strategy Details */}
          {strategy && (
            <>
              {/* ========== MARKET RESEARCH ========== */}
              {strategy.stages?.marketResearch?.data && (
                <>
                  {/* Customer Avatar */}
                  {strategy.stages.marketResearch.data.avatar && (
                    <Card>
                      <CardHeader>
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <Users className="w-5 h-5 text-blue-500" />
                          Customer Avatar
                        </h3>
                      </CardHeader>
                      <CardBody className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {strategy.stages.marketResearch.data.avatar.ageRanges?.length > 0 && (
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <label className="text-xs text-gray-500 uppercase">Age Ranges</label>
                              <p className="mt-1 font-medium text-gray-900">
                                {strategy.stages.marketResearch.data.avatar.ageRanges.join(', ')}
                              </p>
                            </div>
                          )}
                          {strategy.stages.marketResearch.data.avatar.location && (
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <label className="text-xs text-gray-500 uppercase">Location</label>
                              <p className="mt-1 font-medium text-gray-900">{strategy.stages.marketResearch.data.avatar.location}</p>
                            </div>
                          )}
                          {strategy.stages.marketResearch.data.avatar.incomeLevels?.length > 0 && (
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <label className="text-xs text-gray-500 uppercase">Income Levels</label>
                              <p className="mt-1 font-medium text-gray-900">
                                {strategy.stages.marketResearch.data.avatar.incomeLevels.join(', ')}
                              </p>
                            </div>
                          )}
                          {strategy.stages.marketResearch.data.avatar.professions?.length > 0 && (
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <label className="text-xs text-gray-500 uppercase">Professions</label>
                              <p className="mt-1 font-medium text-gray-900">
                                {strategy.stages.marketResearch.data.avatar.professions.join(', ')}
                              </p>
                            </div>
                          )}
                        </div>
                        {strategy.stages.marketResearch.data.avatar.interests?.length > 0 && (
                          <div className="mt-4">
                            <label className="text-xs text-gray-500 uppercase">Interests</label>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {strategy.stages.marketResearch.data.avatar.interests.map((interest, i) => (
                                <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">{interest}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  )}

                  {/* Pain Points & Desires */}
                  {(strategy.stages.marketResearch.data.painPoints?.length > 0 || strategy.stages.marketResearch.data.desires?.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {strategy.stages.marketResearch.data.painPoints?.length > 0 && (
                        <Card>
                          <CardHeader className="bg-red-50">
                            <h3 className="font-semibold text-red-800">Pain Points</h3>
                          </CardHeader>
                          <CardBody className="p-4">
                            <ul className="space-y-2">
                              {strategy.stages.marketResearch.data.painPoints.map((point, i) => (
                                <li key={i} className="flex items-start gap-2 p-2 bg-red-50 rounded">
                                  <span className="text-red-700">{point}</span>
                                </li>
                              ))}
                            </ul>
                          </CardBody>
                        </Card>
                      )}
                      {strategy.stages.marketResearch.data.desires?.length > 0 && (
                        <Card>
                          <CardHeader className="bg-green-50">
                            <h3 className="font-semibold text-green-800">Customer Desires</h3>
                          </CardHeader>
                          <CardBody className="p-4">
                            <ul className="space-y-2">
                              {strategy.stages.marketResearch.data.desires.map((desire, i) => (
                                <li key={i} className="flex items-start gap-2 p-2 bg-green-50 rounded">
                                  <span className="text-green-700">{desire}</span>
                                </li>
                              ))}
                            </ul>
                          </CardBody>
                        </Card>
                      )}
                    </div>
                  )}

                  {/* Existing Purchases */}
                  {strategy.stages.marketResearch.data.existingPurchases?.length > 0 && (
                    <Card>
                      <CardHeader>
                        <h3 className="font-semibold text-gray-900">Existing Purchases</h3>
                      </CardHeader>
                      <CardBody className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {strategy.stages.marketResearch.data.existingPurchases.map((purchase, i) => (
                            <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">{purchase}</span>
                          ))}
                        </div>
                      </CardBody>
                    </Card>
                  )}

                  {/* Competitors */}
                  {strategy.stages.marketResearch.data.competitors && (
                    <Card>
                      <CardHeader>
                        <h3 className="font-semibold text-gray-900">Competitor Analysis</h3>
                      </CardHeader>
                      <CardBody className="p-4">
                        <p className="text-gray-700 whitespace-pre-wrap">{strategy.stages.marketResearch.data.competitors}</p>
                      </CardBody>
                    </Card>
                  )}
                </>
              )}

              {/* ========== OFFER ENGINEERING ========== */}
              {strategy.stages?.offerEngineering?.data && (
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Gift className="w-5 h-5 text-purple-500" />
                      Value Proposition & Offer
                    </h3>
                  </CardHeader>
                  <CardBody className="p-6 space-y-6">
                    {/* Functional Values */}
                    {strategy.stages.offerEngineering.data.functionalValues?.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">Functional Values</label>
                        <ul className="space-y-1">
                          {strategy.stages.offerEngineering.data.functionalValues.map((value, i) => (
                            <li key={i} className="p-2 bg-purple-50 text-purple-800 rounded text-sm">{value}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Emotional Values */}
                    {strategy.stages.offerEngineering.data.emotionalValues?.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">Emotional Values</label>
                        <ul className="space-y-1">
                          {strategy.stages.offerEngineering.data.emotionalValues.map((value, i) => (
                            <li key={i} className="p-2 bg-pink-50 text-pink-800 rounded text-sm">{value}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Social Values */}
                    {strategy.stages.offerEngineering.data.socialValues?.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">Social/Status Values</label>
                        <ul className="space-y-1">
                          {strategy.stages.offerEngineering.data.socialValues.map((value, i) => (
                            <li key={i} className="p-2 bg-blue-50 text-blue-800 rounded text-sm">{value}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Economic Values */}
                    {strategy.stages.offerEngineering.data.economicValues?.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">Economic Values</label>
                        <ul className="space-y-1">
                          {strategy.stages.offerEngineering.data.economicValues.map((value, i) => (
                            <li key={i} className="p-2 bg-green-50 text-green-800 rounded text-sm">{value}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Experiential Values */}
                    {strategy.stages.offerEngineering.data.experientialValues?.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">Experiential Values</label>
                        <ul className="space-y-1">
                          {strategy.stages.offerEngineering.data.experientialValues.map((value, i) => (
                            <li key={i} className="p-2 bg-orange-50 text-orange-800 rounded text-sm">{value}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Bonuses */}
                    {strategy.stages.offerEngineering.data.bonuses?.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">Bonus Stack</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {strategy.stages.offerEngineering.data.bonuses.map((bonus, i) => (
                            <div key={i} className="p-3 bg-indigo-50 rounded-lg">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-indigo-900">{bonus.title}</h4>
                                {bonus.value > 0 && (
                                  <span className="text-sm text-indigo-600 font-semibold">${bonus.value}</span>
                                )}
                              </div>
                              {bonus.description && (
                                <p className="text-sm text-indigo-700 mt-1">{bonus.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Guarantees */}
                    {strategy.stages.offerEngineering.data.guarantees?.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">Guarantees</label>
                        <ul className="space-y-1">
                          {strategy.stages.offerEngineering.data.guarantees.map((guarantee, i) => (
                            <li key={i} className="p-2 bg-green-50 text-green-800 rounded text-sm flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              {guarantee}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Urgency Tactics */}
                    {strategy.stages.offerEngineering.data.urgencyTactics?.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">Urgency Tactics</label>
                        <ul className="space-y-1">
                          {strategy.stages.offerEngineering.data.urgencyTactics.map((tactic, i) => (
                            <li key={i} className="p-2 bg-orange-50 text-orange-800 rounded text-sm">{tactic}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardBody>
                </Card>
              )}

              {/* ========== TRAFFIC STRATEGY ========== */}
              {strategy.stages?.trafficStrategy?.data && (
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-orange-500" />
                      Traffic Strategy
                    </h3>
                  </CardHeader>
                  <CardBody className="p-6 space-y-6">
                    {/* Selected Channels */}
                    {strategy.stages.trafficStrategy.data.channels?.filter(c => c.isSelected).length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">Selected Channels</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {strategy.stages.trafficStrategy.data.channels
                            .filter(c => c.isSelected)
                            .map((channel, i) => (
                              <div key={i} className="p-3 bg-orange-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-orange-900 capitalize">
                                    {channel.name.replace(/_/g, ' ')}
                                  </span>
                                </div>
                                {channel.justification && (
                                  <p className="text-sm text-orange-700 mt-1">{channel.justification}</p>
                                )}
                                {channel.budget > 0 && (
                                  <p className="text-sm text-orange-600 mt-1">Budget: ${channel.budget}</p>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Hooks */}
                    {strategy.stages.trafficStrategy.data.hooks?.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">Ad Hooks</label>
                        <ul className="space-y-2">
                          {strategy.stages.trafficStrategy.data.hooks.map((hook, i) => (
                            <li key={i} className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-gray-900">{hook.content || hook}</p>
                              {hook.type && (
                                <span className="text-xs px-2 py-1 bg-gray-200 rounded-full capitalize mt-1 inline-block">
                                  {hook.type.replace('_', ' ')}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Total Budget */}
                    {strategy.stages.trafficStrategy.data.totalBudget > 0 && (
                      <div className="p-4 bg-green-50 rounded-lg">
                        <label className="text-sm text-green-600">Total Budget</label>
                        <p className="text-2xl font-bold text-green-800">
                          ${strategy.stages.trafficStrategy.data.totalBudget.toLocaleString()}
                        </p>
                      </div>
                    )}

                    {/* Target Audience */}
                    {strategy.stages.trafficStrategy.data.targetAudience && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {strategy.stages.trafficStrategy.data.targetAudience.primaryAge && (
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <label className="text-xs text-blue-600 uppercase">Primary Age</label>
                            <p className="font-medium text-blue-900">{strategy.stages.trafficStrategy.data.targetAudience.primaryAge}</p>
                          </div>
                        )}
                        {strategy.stages.trafficStrategy.data.targetAudience.primaryLocation && (
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <label className="text-xs text-blue-600 uppercase">Primary Location</label>
                            <p className="font-medium text-blue-900">{strategy.stages.trafficStrategy.data.targetAudience.primaryLocation}</p>
                          </div>
                        )}
                        {strategy.stages.trafficStrategy.data.targetAudience.primaryInterests?.length > 0 && (
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <label className="text-xs text-blue-600 uppercase">Primary Interests</label>
                            <p className="font-medium text-blue-900">{strategy.stages.trafficStrategy.data.targetAudience.primaryInterests.join(', ')}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardBody>
                </Card>
              )}

              {/* ========== LANDING PAGES ========== */}
              {strategy.stages?.landingPage?.data && (
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <FileTextIcon className="w-5 h-5 text-teal-500" />
                      Landing Pages
                    </h3>
                  </CardHeader>
                  <CardBody className="p-6">
                    <div className="space-y-4">
                      {/* Landing pages are stored in the Project model */}
                      {strategy.project?.landingPages?.length > 0 ? (
                        strategy.project.landingPages.map((lp, i) => (
                          <div key={i} className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900">{lp.name || `Landing Page ${i + 1}`}</h4>
                              {lp.funnelType && (
                                <span className="px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded-full capitalize">
                                  {lp.funnelType.replace(/_/g, ' ')}
                                </span>
                              )}
                            </div>
                            {lp.description && (
                              <p className="text-sm text-gray-600">{lp.description}</p>
                            )}
                            {lp.targetUrl && (
                              <p className="text-sm text-gray-500 mt-1">URL: {lp.targetUrl}</p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-4">No landing pages configured</p>
                      )}
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* ========== CREATIVE STRATEGY ========== */}
              {strategy.stages?.creativeStrategy?.data && (
                <Card>
                  <CardHeader>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-yellow-500" />
                      Creative Strategy
                    </h3>
                  </CardHeader>
                  <CardBody className="p-6">
                    {/* Ad Types */}
                    {strategy.stages.creativeStrategy.data.adTypes?.length > 0 && (
                      <div className="space-y-4 mb-6">
                        <label className="text-sm font-medium text-gray-700">Ad Types</label>
                        {strategy.stages.creativeStrategy.data.adTypes.map((adType, i) => (
                          <div key={i} className="border rounded-lg p-4 bg-gray-50">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-900">{adType.typeName}</h4>
                              {adType.typeKey && (
                                <Badge variant="primary">{adType.typeKey}</Badge>
                              )}
                            </div>
                            {adType.creatives && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                {adType.creatives.hook && (
                                  <div>
                                    <span className="text-gray-500">Hook:</span>
                                    <p className="mt-1 font-medium">{adType.creatives.hook}</p>
                                  </div>
                                )}
                                {adType.creatives.headline && (
                                  <div>
                                    <span className="text-gray-500">Headline:</span>
                                    <p className="mt-1 font-medium">{adType.creatives.headline}</p>
                                  </div>
                                )}
                                {adType.creatives.cta && (
                                  <div>
                                    <span className="text-gray-500">CTA:</span>
                                    <p className="mt-1 font-medium text-green-700">{adType.creatives.cta}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Creative Plan */}
                    {strategy.stages.creativeStrategy.data.creativePlan?.length > 0 && (
                      <div className="mb-6">
                        <label className="text-sm font-medium text-gray-700 block mb-2">Creative Plan</label>
                        <div className="space-y-3">
                          {strategy.stages.creativeStrategy.data.creativePlan.map((plan, i) => (
                            <div key={i} className="p-3 bg-yellow-50 rounded-lg">
                              <h4 className="font-medium text-yellow-900">{plan.stage || plan.name}</h4>
                              {plan.deliverables?.length > 0 && (
                                <ul className="mt-2 text-sm text-yellow-800">
                                  {plan.deliverables.map((d, j) => (
                                    <li key={j} className="flex items-center gap-2">
                                      <CheckCircle className="w-4 h-4 text-yellow-500" />
                                      {d}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Additional Notes */}
                    {strategy.stages.creativeStrategy.data.additionalNotes && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">Additional Notes</label>
                        <p className="text-gray-700 whitespace-pre-wrap p-3 bg-gray-50 rounded-lg">
                          {strategy.stages.creativeStrategy.data.additionalNotes}
                        </p>
                      </div>
                    )}
                  </CardBody>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="space-y-6">
          {/* Task Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">{pendingTasks.length}</p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">In Progress</p>
                    <p className="text-2xl font-bold text-blue-600">{inProgressTasks.length}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Play className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{completedTasks.length}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Tasks List */}
          {filteredTasks.length === 0 ? (
            <Card>
              <CardBody className="text-center py-12">
                <ClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No tasks assigned to you for this project</p>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <Card key={task._id} className="hover:shadow-md transition-shadow">
                  <CardBody className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getTaskTypeBadge(task.taskType)}
                          {getStatusBadge(task.status)}
                        </div>
                        <h3 className="font-semibold text-gray-900">{task.taskTitle}</h3>
                        {task.dueDate && (
                          <p className="text-sm text-gray-500 mt-1">
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </p>
                        )}

                        {/* Strategy Context Preview */}
                        {task.strategyContext && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {task.strategyContext.platform && (
                                <div>
                                  <span className="text-gray-500">Platform:</span>{' '}
                                  <span className="font-medium">{task.strategyContext.platform}</span>
                                </div>
                              )}
                              {task.strategyContext.hook && (
                                <div>
                                  <span className="text-gray-500">Hook:</span>{' '}
                                  <span className="font-medium">{task.strategyContext.hook.substring(0, 30)}...</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        onClick={() => navigate(`/dashboard/tasks/${task._id}`)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Task
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}