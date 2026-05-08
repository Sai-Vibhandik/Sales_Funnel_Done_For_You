import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authService, projectService, notificationService, strategyService } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card, CardBody, Spinner, Button, Badge } from '@/components/ui';
import {
  TrendingUp,
  Users,
  FolderKanban,
  CheckCircle,
  Clock,
  ArrowUpRight,
  Bell,
  MoreHorizontal,
  ChevronRight,
  UserPlus,
  Settings,
  Activity,
  Briefcase,
  X,
  Eye,
  CheckSquare,
  AlertCircle,
  Shield,
  FileText,
  Image,
  Video,
  Layout,
  Code,
  Crown,
  PieChart as PieChartIcon,
  BarChart3,
  LayoutGrid,
  List,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { PROJECT_STATUS_CONFIG, getProjectStatusConfig } from '@/constants/taskStatuses';

// Modal Portal Component
function ModalPortal({ children }) {
  return ReactDOM.createPortal(children, document.body);
}

// Role icon mapping
const ROLE_ICONS = {
  admin: { icon: Crown, color: 'bg-red-100 text-red-600', gradient: 'from-red-400 to-red-600' },
  performance_marketer: { icon: TrendingUp, color: 'bg-blue-100 text-blue-600', gradient: 'from-blue-400 to-blue-600' },
  content_writer: { icon: FileText, color: 'bg-emerald-100 text-emerald-600', gradient: 'from-emerald-400 to-emerald-600' },
  graphic_designer: { icon: Image, color: 'bg-pink-100 text-pink-600', gradient: 'from-pink-400 to-pink-600' },
  video_editor: { icon: Video, color: 'bg-cyan-100 text-cyan-600', gradient: 'from-cyan-400 to-cyan-600' },
  ui_ux_designer: { icon: Layout, color: 'bg-purple-100 text-purple-600', gradient: 'from-purple-400 to-purple-600' },
  developer: { icon: Code, color: 'bg-green-100 text-green-600', gradient: 'from-green-400 to-green-600' },
  tester: { icon: CheckCircle, color: 'bg-orange-100 text-orange-600', gradient: 'from-orange-400 to-orange-600' },
};

const ROLE_LABELS = {
  admin: 'Admin',
  performance_marketer: 'Performance Marketer',
  content_writer: 'Content Planner',
  ui_ux_designer: 'UI/UX Designer',
  graphic_designer: 'Graphic Designer',
  video_editor: 'Video Editor',
  developer: 'Developer',
  tester: 'Tester',
};

const ROLE_BADGE_COLORS = {
  admin: 'bg-red-100 text-red-700',
  performance_marketer: 'bg-blue-100 text-blue-700',
  content_writer: 'bg-emerald-100 text-emerald-700',
  ui_ux_designer: 'bg-purple-100 text-purple-700',
  graphic_designer: 'bg-pink-100 text-pink-700',
  video_editor: 'bg-cyan-100 text-cyan-700',
  developer: 'bg-green-100 text-green-700',
  tester: 'bg-orange-100 text-orange-700',
};

// Per-role hex colors for bar chart
const ROLE_CHART_COLORS = {
  admin:                '#E24B4A',
  performance_marketer: '#378ADD',
  content_writer:       '#1D9E75',
  ui_ux_designer:       '#7F77DD',
  graphic_designer:     '#D4537E',
  video_editor:         '#06B6D4',
  developer:            '#639922',
  tester:               '#BA7517',
};

const AVAILABILITY_COLORS = {
  available: 'bg-green-500',
  busy: 'bg-yellow-500',
  offline: 'bg-gray-400',
};

// Role Icon Component
function RoleIcon({ role, size = 'md', showLabel = false }) {
  const config = ROLE_ICONS[role] || ROLE_ICONS.admin;
  const Icon = config.icon;
  const sizes = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12' };
  const iconSizes = { sm: 16, md: 20, lg: 24 };
  return (
    <div className="flex items-center gap-2">
      <div className={cn(sizes[size], 'rounded-xl flex items-center justify-center', config.color)}>
        <Icon size={iconSizes[size]} />
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-gray-700">
          {role?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </span>
      )}
    </div>
  );
}

// Team Member Card — fixed grid layout
function TeamMemberCard({ member, onClick }) {
  const roleConfig = ROLE_ICONS[member.role] || ROLE_ICONS.admin;
  const Icon = roleConfig.icon;
  return (
    <div onClick={onClick} className="team-member-card-enhanced cursor-pointer">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold text-xs sm:text-sm lg:text-base">
            {member.name?.charAt(0).toUpperCase()}
          </div>
          <div className={cn(
            'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-white',
            AVAILABILITY_COLORS[member.availability] || 'bg-gray-400'
          )} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{member.name}</h4>
          <p className="text-xs sm:text-sm text-gray-500 truncate">{member.email}</p>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          <div className={cn('p-1 sm:p-1.5 rounded-lg', roleConfig.color)}>
            <Icon size={12} className="sm:w-3.5 sm:h-3.5" />
          </div>
          <span className={cn(
            'text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg whitespace-nowrap',
            ROLE_BADGE_COLORS[member.role] || 'bg-gray-100 text-gray-700'
          )}>
            {ROLE_LABELS[member.role] || member.role}
          </span>
        </div>
      </div>
      {member.specialization && (
        <p className="mt-1.5 sm:mt-2 text-xs text-gray-400 pl-11 sm:pl-14">{member.specialization}</p>
      )}
    </div>
  );
}

// Project Card Component
function ProjectCard({ project, onClick }) {
  const statusConfig = getProjectStatusConfig(project.status);
  return (
    <div onClick={onClick} className="project-card-enhanced cursor-pointer">
      <div className="flex items-start justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{project.projectName || project.businessName}</h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{project.customerName}</p>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {project.isActive ? (
            <Badge className="bg-green-100 text-green-700 text-xs">Active</Badge>
          ) : (
            <Badge className="bg-gray-100 text-gray-600 text-xs">Inactive</Badge>
          )}
          <Badge className={cn('text-xs', statusConfig.bgColor, statusConfig.textColor)}>
            {statusConfig.label}
          </Badge>
        </div>
      </div>
      <div className="h-1.5 sm:h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${project.overallProgress}%`,
            background: project.overallProgress >= 100
              ? '#10B981'
              : 'linear-gradient(90deg, #FFC107 0%, #FFD54F 100%)'
          }}
        />
      </div>
      {project.industry && (
        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">Industry: {project.industry}</span>
        </div>
      )}
    </div>
  );
}

// Project Row Component for List View
function ProjectRow({ project, onClick }) {
  const statusConfig = getProjectStatusConfig(project.status);
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{project.projectName || project.businessName}</h3>
          {project.isActive ? (
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full flex-shrink-0" />
          ) : (
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full flex-shrink-0" />
          )}
        </div>
        <p className="text-xs sm:text-sm text-gray-500 truncate">{project.customerName}</p>
      </div>
      <div className="hidden md:block w-32">
        <span className="text-sm text-gray-600">{project.industry || '-'}</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge className={cn('text-xs', statusConfig.bgColor, statusConfig.textColor)}>
          {statusConfig.label}
        </Badge>
      </div>
      <div className="hidden lg:flex items-center gap-3 w-40">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${project.overallProgress}%`,
              background: project.overallProgress >= 100
                ? '#10B981'
                : 'linear-gradient(90deg, #FFC107 0%, #FFD54F 100%)'
            }}
          />
        </div>
      </div>
      <ChevronRight size={18} className="text-gray-400 flex-shrink-0" />
    </div>
  );
}

// Strategy Detail Modal Component
function StrategyDetailModal({ strategy, onClose, onReview }) {
  const [reviewing, setReviewing] = useState(false);
  const handleReview = async () => {
    try {
      setReviewing(true);
      await strategyService.markReviewed(strategy.project._id);
      toast.success('Strategy marked as reviewed');
      onReview();
    } catch (error) {
      toast.error(error.message || 'Failed to mark as reviewed');
    } finally {
      setReviewing(false);
    }
  };
  if (!strategy) return null;
  return (
    <ModalPortal>
      <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none" aria-modal="true" role="dialog">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Strategy Review: {strategy.project.projectName || strategy.project.businessName}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Completed by: {strategy.completedBy?.name || 'Unknown'} • {formatDate(strategy.project.strategyCompletedAt)}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X size={20} className="text-gray-500" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Stage Progress</h3>
              <div className="grid grid-cols-6 gap-2">
                {strategy.project.stageStatus?.map((stage, index) => (
                  <div key={stage.key} className="text-center">
                    <div className={cn(
                      'w-8 h-8 rounded-full mx-auto flex items-center justify-center text-sm font-medium',
                      stage.isCompleted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                    )}>
                      {stage.isCompleted ? <CheckCircle size={16} /> : index + 1}
                    </div>
                    <p className="text-xs mt-1 text-gray-500 truncate">{stage.name.split(' ')[0]}</p>
                  </div>
                ))}
              </div>
            </div>
            {strategy.stages.marketResearch?.data && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Market Research</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {strategy.stages.marketResearch.data.avatar && (
                    <>
                      <div>
                        <span className="text-gray-500">Target Audience:</span>{' '}
                        <span className="text-gray-900">
                          {strategy.stages.marketResearch.data.avatar.ageRange}, {strategy.stages.marketResearch.data.avatar.profession}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Location:</span>{' '}
                        <span className="text-gray-900">{strategy.stages.marketResearch.data.avatar.location}</span>
                      </div>
                    </>
                  )}
                </div>
                {strategy.stages.marketResearch.data.painPoints?.length > 0 && (
                  <div className="mt-2">
                    <span className="text-gray-500 text-sm">Pain Points:</span>{' '}
                    <span className="text-gray-900 text-sm">{strategy.stages.marketResearch.data.painPoints.join(', ')}</span>
                  </div>
                )}
              </div>
            )}
            {strategy.stages.offerEngineering?.data && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Offer Engineering</h4>
                <div className="text-sm text-gray-700">
                  {strategy.stages.offerEngineering.data.headline && (
                    <p><span className="text-gray-500">Headline:</span> {strategy.stages.offerEngineering.data.headline}</p>
                  )}
                  {strategy.stages.offerEngineering.data.mainOffer && (
                    <p className="mt-1"><span className="text-gray-500">Main Offer:</span> {strategy.stages.offerEngineering.data.mainOffer}</p>
                  )}
                </div>
              </div>
            )}
            {strategy.stages.trafficStrategy?.data && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Traffic Strategy</h4>
                <div className="text-sm text-gray-700">
                  {strategy.stages.trafficStrategy.data.channels && (
                    <p>
                      <span className="text-gray-500">Channels:</span>{' '}
                      {Object.entries(strategy.stages.trafficStrategy.data.channels)
                        .filter(([_, v]) => v?.enabled)
                        .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
                        .join(', ') || 'None selected'}
                    </p>
                  )}
                </div>
              </div>
            )}
            {strategy.stages.landingPage?.data && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Landing Page</h4>
                <div className="text-sm text-gray-700">
                  {strategy.stages.landingPage.data.headline && (
                    <p><span className="text-gray-500">Headline:</span> {strategy.stages.landingPage.data.headline}</p>
                  )}
                  {strategy.stages.landingPage.data.subheadline && (
                    <p className="mt-1"><span className="text-gray-500">Subheadline:</span> {strategy.stages.landingPage.data.subheadline}</p>
                  )}
                </div>
              </div>
            )}
            {strategy.stages.creativeStrategy?.data && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Creative Strategy</h4>
                <div className="text-sm text-gray-700">
                  {strategy.stages.creativeStrategy.data.adTypes?.length > 0 && (
                    <p><span className="text-gray-500">Ad Types:</span> {strategy.stages.creativeStrategy.data.adTypes.map(at => at.typeName).join(', ')}</p>
                  )}
                  {strategy.stages.creativeStrategy.data.creativeBrief && (
                    <p className="mt-1"><span className="text-gray-500">Brief:</span> {strategy.stages.creativeStrategy.data.creativeBrief.substring(0, 100)}...</p>
                  )}
                </div>
              </div>
            )}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">Assigned Team</h4>
              <div className="flex flex-wrap gap-3">
                {strategy.project.assignedTeam?.performanceMarketer && (
                  <Badge className="bg-blue-100 text-blue-700">PM: {strategy.project.assignedTeam.performanceMarketer.name}</Badge>
                )}
                {strategy.project.assignedTeam?.uiUxDesigner && (
                  <Badge className="bg-purple-100 text-purple-700">UI/UX: {strategy.project.assignedTeam.uiUxDesigner.name}</Badge>
                )}
                {strategy.project.assignedTeam?.graphicDesigner && (
                  <Badge className="bg-pink-100 text-pink-700">Design: {strategy.project.assignedTeam.graphicDesigner.name}</Badge>
                )}
                {strategy.project.assignedTeam?.developer && (
                  <Badge className="bg-green-100 text-green-700">Dev: {strategy.project.assignedTeam.developer.name}</Badge>
                )}
                {strategy.project.assignedTeam?.tester && (
                  <Badge className="bg-orange-100 text-orange-700">QA: {strategy.project.assignedTeam.tester.name}</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={handleReview} loading={reviewing}>
              <CheckSquare size={16} className="mr-2" />
              Mark as Reviewed
            </Button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projectViewMode, setProjectViewMode] = useState('card');
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    pausedProjects: 0,
    recentProjects: [],
  });
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamStats, setTeamStats] = useState({ total: 0, byRole: {}, available: 0 });
  const [notifications, setNotifications] = useState([]);
  const [strategyNotifications, setStrategyNotifications] = useState([]);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, teamRes, notifRes] = await Promise.all([
        projectService.getDashboardStats(),
        authService.getTeamMembers(),
        notificationService.getNotifications({ limit: 10 })
      ]);

      setStats(dashboardRes.data);

      const members = teamRes.data || [];
      setTeamMembers(members);

      const teamByRole = {};
      let availableCount = 0;
      members.forEach(member => {
        teamByRole[member.role] = (teamByRole[member.role] || 0) + 1;
        if (member.availability === 'available') availableCount++;
      });

      setTeamStats({ total: members.length, byRole: teamByRole, available: availableCount });

      const allNotifications = notifRes.data || [];
      setNotifications(allNotifications);
      setStrategyNotifications(allNotifications.filter(n => n.type === 'strategy_completed'));
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewStrategy = async (notification) => {
    try {
      const response = await strategyService.getCompleteStrategy(notification.projectId._id);
      setSelectedStrategy(response.data);
    } catch (error) {
      toast.error('Failed to load strategy details');
    }
  };

  const handleMarkNotificationRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      setStrategyNotifications(prev => prev.filter(n => n._id !== notificationId));
    } catch (error) {
      console.error('Failed to mark notification as read');
    }
  };

  const handleStrategyReviewed = () => {
    setSelectedStrategy(null);
    fetchData();
  };

  // Pie chart: Active (In Progress), Completed, Paused, Archived
  const getTaskStatusData = () => {
    const active = stats.activeProjects || 0;
    const completed = stats.completedProjects || 0;
    const paused = stats.pausedProjects || 0;
    const archived = stats.archivedProjects || 0;

    const data = [
      { name: 'Active', value: active, color: '#378ADD' },
      { name: 'Completed', value: completed, color: '#1D9E75' },
      { name: 'Paused', value: paused, color: '#EF9F27' },
      { name: 'Archived', value: archived, color: '#6B7280' },
    ];

    return data.filter(item => item.value > 0);
  };

  // Bar chart: each role gets its own color
  const getTeamByRoleData = () => {
    const roleLabels = {
      admin:                'Admin',
      performance_marketer: 'Marketers',
      content_writer:       'Writers',
      ui_ux_designer:       'UI/UX',
      graphic_designer:     'Designers',
      video_editor:         'Video',
      developer:            'Developers',
      tester:               'Testers',
    };
    return Object.entries(teamStats.byRole).map(([role, count]) => ({
      name:  roleLabels[role] || role,
      count,
      color: ROLE_CHART_COLORS[role] || '#888780',
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const taskStatusData = getTaskStatusData();
  const teamByRoleData = getTeamByRoleData();

  return (
    <div className="space-y-4 sm:space-y-5 animate-fadeIn">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">
            Welcome back, {user?.name?.split(' ')[0] || 'Admin'}! Here's your team overview.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="outline" onClick={() => navigate('/dashboard/rejections')} className="flex-1 sm:flex-none">
            <AlertTriangle size={18} className="mr-2" />
            <span className="hidden sm:inline">Rejections</span>
            <span className="sm:hidden">Reject</span>
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard/team')} className="flex-1 sm:flex-none">
            <Users size={18} className="mr-2" />
            <span className="hidden sm:inline">Manage Team</span>
            <span className="sm:hidden">Team</span>
          </Button>
          <Button onClick={() => navigate('/dashboard/projects/new')} className="flex-1 sm:flex-none">
            <span className="mr-2">+</span> <span className="hidden sm:inline">New Project</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        <div className="stat-card-enhanced flex flex-col">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 font-medium">Total Projects</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{String(stats.totalProjects)}</p>
              <div className="flex items-center gap-1 mt-1 sm:mt-2">
                <ArrowUpRight size={14} className="text-green-500 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm font-medium text-green-600">+8%</span>
                <span className="text-xs text-gray-400 hidden sm:inline">vs last month</span>
              </div>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl flex-shrink-0 bg-gradient-to-br from-primary-400 to-primary-600">
              <FolderKanban size={20} className="text-white sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>
        <div className="stat-card-enhanced flex flex-col">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 font-medium">Active Projects</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{String(stats.activeProjects)}</p>
              <div className="flex items-center gap-1 mt-1 sm:mt-2">
                <ArrowUpRight size={14} className="text-green-500 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm font-medium text-green-600">+12%</span>
                <span className="text-xs text-gray-400 hidden sm:inline">vs last month</span>
              </div>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl flex-shrink-0 bg-gradient-to-br from-green-400 to-green-600">
              <Activity size={20} className="text-white sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>
        <div className="stat-card-enhanced flex flex-col">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 font-medium">Team Members</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{String(teamStats.total)}</p>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl flex-shrink-0 bg-gradient-to-br from-blue-400 to-blue-600">
              <Users size={20} className="text-white sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>
        <div className="stat-card-enhanced flex flex-col">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 font-medium">Available Members</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{String(teamStats.available)}</p>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl flex-shrink-0 bg-gradient-to-br from-purple-400 to-purple-600">
              <CheckCircle size={20} className="text-white sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">

        {/* ── Pie Chart ── */}
        <div className="lg:col-span-1 chart-container-enhanced h-full flex flex-col">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 flex-shrink-0">
            <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary-400 to-primary-500">
              <PieChartIcon size={18} className="text-white sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Projects overview</h3>
              <p className="text-xs sm:text-sm text-gray-500">Status distribution</p>
            </div>
          </div>

          {/* Custom legend */}
          <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1.5 sm:gap-y-2 mb-3 sm:mb-4 flex-shrink-0">
            {taskStatusData.map((item, i) => (
              <div key={i} className="flex items-center gap-1 sm:gap-1.5">
                <span
                  className="inline-block w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-gray-500">{item.name}</span>
                <span className="text-xs font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>

          {taskStatusData.length > 0 ? (
            <div className="flex-1 min-h-[180px] sm:min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={76}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {taskStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [value, name]}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '10px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      padding: '10px 14px',
                      fontSize: '13px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              No project data
            </div>
          )}
        </div>

        {/* ── Bar Chart ── */}
        <div className="lg:col-span-2 chart-container-enhanced h-full flex flex-col">
          <div className="flex items-center justify-between mb-4 sm:mb-6 flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-400 to-blue-500">
                <BarChart3 size={18} className="text-white sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Team distribution</h3>
                <p className="text-xs sm:text-sm text-gray-500">Members per role</p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{teamStats.total}</p>
              <p className="text-xs sm:text-sm text-gray-500">Total members</p>
            </div>
          </div>

          {teamByRoleData.length > 0 ? (
            <div className="flex-1 min-h-[180px] sm:min-h-[220px] -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={teamByRoleData}
                  layout="vertical"
                  barSize={22}
                  margin={{ left: 0, right: 28, top: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f0f0f0"
                    horizontal={false}
                    vertical={true}
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    width={88}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [`${value} member${value !== 1 ? 's' : ''}`, 'Count']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '10px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      padding: '10px 14px',
                      fontSize: '13px',
                    }}
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {teamByRoleData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              No team data available
            </div>
          )}
        </div>
      </div>

      {/* Projects and Team Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Recent Projects */}
        <div className="lg:col-span-2">
          <div className="chart-container-enhanced h-full flex flex-col relative">
            {/* View All - Top Right Corner */}
            <Link
              to="/dashboard/projects"
              className="absolute top-4 right-4 sm:top-5 sm:right-5 text-xs sm:text-sm text-primary-600 hover:text-primary-700 font-medium z-10"
            >
              View All
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-4 sm:mb-6 flex-shrink-0 pr-16 sm:pr-20">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">Recent Projects</h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">Latest project activity</p>
              </div>
              <div className="flex items-center bg-gray-100 rounded-lg p-1 flex-shrink-0">
                <button
                  onClick={() => setProjectViewMode('card')}
                  className={cn(
                    "flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all",
                    projectViewMode === 'card'
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <LayoutGrid size={14} className="sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
                <button
                  onClick={() => setProjectViewMode('list')}
                  className={cn(
                    "flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all",
                    projectViewMode === 'list'
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <List size={14} className="sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>
            </div>

            {stats.recentProjects.length === 0 ? (
              <div className="text-center py-6 sm:py-8 flex-1 flex flex-col items-center justify-center">
                <FolderKanban className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300" />
                <h4 className="mt-2 font-medium text-gray-900 text-sm sm:text-base">No projects yet</h4>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Create your first project to get started</p>
              </div>
            ) : projectViewMode === 'card' ? (
              <div className="space-y-3 sm:space-y-4 flex-1">
                {stats.recentProjects.slice(0, 5).map((project) => (
                  <ProjectCard
                    key={project._id}
                    project={project}
                    onClick={() => navigate(`/dashboard/projects/${project._id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2 flex-1">
                {stats.recentProjects.slice(0, 5).map((project) => (
                  <ProjectRow
                    key={project._id}
                    project={project}
                    onClick={() => navigate(`/dashboard/projects/${project._id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Team Members */}
        <div className="chart-container-enhanced h-full flex flex-col relative">
          {/* View All - Top Right Corner */}
          <button
            onClick={() => navigate('/dashboard/team')}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 text-xs sm:text-sm text-primary-600 hover:text-primary-700 font-medium z-10"
          >
            View All
          </button>
          <div className="flex items-center justify-between mb-4 sm:mb-6 flex-shrink-0 pr-16 sm:pr-20">
            <div>
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">Team Members</h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">Your team roster</p>
            </div>
          </div>

          {teamMembers.length === 0 ? (
            <div className="text-center py-6 sm:py-8 flex-1 flex flex-col items-center justify-center">
              <Users className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300" />
              <h4 className="mt-2 font-medium text-gray-900 text-sm sm:text-base">No team members</h4>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Add team members to get started</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3 flex-1">
              {teamMembers.slice(0, 5).map((member) => (
                <TeamMemberCard
                  key={member._id}
                  member={member}
                  onClick={() => navigate('/dashboard/team')}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        <button
          onClick={() => navigate('/dashboard/projects/new')}
          className="p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl sm:rounded-2xl text-white text-left hover:shadow-lg transition-all duration-200 flex flex-col min-h-[100px] sm:min-h-[120px]"
        >
          <FolderKanban size={20} className="mb-2 sm:mb-3 flex-shrink-0 sm:w-6 sm:h-6" />
          <p className="font-semibold text-sm sm:text-base">Create Project</p>
          <p className="text-xs sm:text-sm text-white/80 mt-0.5 sm:mt-1 line-clamp-2">Start a new client project</p>
        </button>
        <button
          onClick={() => navigate('/dashboard/team')}
          className="enhanced-card p-3 sm:p-4 lg:p-5 text-gray-900 text-left flex flex-col min-h-[100px] sm:min-h-[120px]"
        >
          <UserPlus size={20} className="mb-2 sm:mb-3 text-primary-500 flex-shrink-0 sm:w-6 sm:h-6" />
          <p className="font-semibold text-sm sm:text-base">Add Team Member</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 line-clamp-2">Invite new members</p>
        </button>
        <button
          onClick={() => navigate('/dashboard/rejections')}
          className="enhanced-card p-3 sm:p-4 lg:p-5 text-gray-900 text-left flex flex-col min-h-[100px] sm:min-h-[120px]"
        >
          <AlertTriangle size={20} className="mb-2 sm:mb-3 text-orange-500 flex-shrink-0 sm:w-6 sm:h-6" />
          <p className="font-semibold text-sm sm:text-base">Rejection Tracking</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 line-clamp-2">Monitor task rejections</p>
        </button>
        <button
          onClick={() => navigate('/dashboard/projects')}
          className="enhanced-card p-3 sm:p-4 lg:p-5 text-gray-900 text-left flex flex-col min-h-[100px] sm:min-h-[120px]"
        >
          <Briefcase size={20} className="mb-2 sm:mb-3 text-green-500 flex-shrink-0 sm:w-6 sm:h-6" />
          <p className="font-semibold text-sm sm:text-base">All Projects</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 line-clamp-2">View and manage projects</p>
        </button>
      </div>

      {/* Strategy Detail Modal */}
      {selectedStrategy && (
        <StrategyDetailModal
          strategy={selectedStrategy}
          onClose={() => setSelectedStrategy(null)}
          onReview={handleStrategyReviewed}
        />
      )}
    </div>
  );
}