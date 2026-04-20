import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { projectService, taskService } from '@/services/api';
import { Card, CardBody, Badge, Spinner, Button } from '@/components/ui';
import {
  Palette,
  FolderKanban,
  Clock,
  Send,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Upload,
  Edit,
  ChevronRight,
  PieChart as PieChartIcon,
  BarChart3,
  AlertCircle,
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
import { STATUS_CONFIG, getStatusConfig, CHART_COLORS } from '@/constants/taskStatuses';
import { EmptyState } from '@/components/ui';
import { RefreshCw } from 'lucide-react';

// Stat Card Component (matching Admin dashboard style)
function StatCard({ title, value, change, changeType, icon: Icon, iconBg }) {
  const isPositive = changeType === 'positive';
  return (
    <div className="stat-card-enhanced">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {change && (
            <div className="flex items-center gap-1 mt-2">
              {isPositive ? (
                <ArrowUpRight size={16} className="text-green-500" />
              ) : (
                <ArrowDownRight size={16} className="text-red-500" />
              )}
              <span className={cn('text-sm font-medium', isPositive ? 'text-green-600' : 'text-red-600')}>
                {change}
              </span>
              <span className="text-xs text-gray-400">vs last week</span>
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-2xl', iconBg)}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );
}

// Task Card Component with hover effects
function TaskCard({ task, onClick }) {
  // For UI/UX Designer, development_pending for landing_page_design means their work is complete
  // Show "Completed" status instead of "Pending"
  const getDisplayStatus = () => {
    if (task.status === 'development_pending' && task.taskType === 'landing_page_design') {
      return {
        label: 'Completed',
        bgColor: 'bg-emerald-100',
        textColor: 'text-emerald-800'
      };
    }
    return getStatusConfig(task.status);
  };

  const statusConfig = getDisplayStatus();

  return (
    <div
      onClick={onClick}
      className="project-card-enhanced cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={`${statusConfig.bgColor} ${statusConfig.textColor}`}>
              {statusConfig.label}
            </Badge>
            {task.creativeType && (
              <Badge variant="outline" className="text-xs">
                {task.creativeType}
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 truncate">
            {task.creativeName || task.taskTitle || 'Design Task'}
          </h3>
          <p className="text-sm text-gray-500 truncate">
            {task.projectId?.projectName || task.projectId?.businessName || 'Unknown Project'}
          </p>
        </div>
      </div>

      {/* Show rejection reason if rejected */}
      {['design_rejected', 'rejected'].includes(task.status) && task.rejectionNote && (
        <div className="mb-3 p-2 bg-red-50 rounded-lg border border-red-200">
          <p className="text-xs text-red-700 line-clamp-2">
            <span className="font-medium">Rejection Reason:</span> {task.rejectionNote}
          </p>
          {task.rejectionReason && (
            <p className="text-xs text-red-600 mt-1">
              <span className="font-medium">Category:</span> {task.rejectionReason}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <Clock size={14} />
          <span>{formatDate(task.updatedAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          <ChevronRight size={16} className="text-gray-400" />
        </div>
      </div>
    </div>
  );
}

export default function UIDesignerDashboard({ user }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({
    totalTasks: 0,
    pendingDesigns: 0,
    reviewDesigns: 0,
    approvedDesigns: 0,
    rejectedDesigns: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch tasks and projects in parallel
      const [tasksRes, projectsRes] = await Promise.all([
        taskService.getMyRoleTasks ? taskService.getMyRoleTasks() : taskService.getMyTasks(),
        projectService.getProjects({ limit: 50 }),
      ]);

      const assignedTasks = tasksRes.data || [];
      const assignedProjects = projectsRes.data || [];

      setTasks(assignedTasks);
      setProjects(assignedProjects);
      calculateStats(assignedTasks);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (taskList) => {
    // Tasks waiting for designer to start (design_pending, todo, in_progress)
    const pendingDesigns = taskList.filter(t =>
      ['design_pending', 'todo', 'in_progress'].includes(t.status)
    ).length;

    // Tasks under review:
    // - design_submitted = waiting for tester review
    // - design_approved = tester approved, waiting for marketer final approval
    const reviewDesigns = taskList.filter(t =>
      ['design_submitted', 'design_approved'].includes(t.status)
    ).length;

    // Tasks fully approved:
    // - final_approved = fully approved (graphic designs, video edits)
    // - development_pending = landing page designs approved by marketer, now with developer
    // For UI/UX designer, development_pending means their design work is complete and approved
    const approvedDesigns = taskList.filter(t =>
      t.status === 'final_approved' ||
      (t.status === 'development_pending' && t.taskType === 'landing_page_design')
    ).length;

    // Tasks rejected
    const rejectedDesigns = taskList.filter(t =>
      ['design_rejected', 'rejected'].includes(t.status)
    ).length;

    setStats({
      totalTasks: taskList.length,
      pendingDesigns,
      reviewDesigns,
      approvedDesigns,
      rejectedDesigns,
    });
  };

  // Prepare pie chart data for task status distribution (Pending, Review, Approved, Rejected)
  const getTaskStatusData = () => {
    const data = [
      { name: 'Pending', value: stats.pendingDesigns, color: CHART_COLORS.pending },
      { name: 'Review', value: stats.reviewDesigns, color: CHART_COLORS.review },
      { name: 'Approved', value: stats.approvedDesigns, color: CHART_COLORS.approved },
      { name: 'Rejected', value: stats.rejectedDesigns, color: CHART_COLORS.rejected },
    ];
    return data.filter(item => item.value > 0);
  };

  // Prepare bar chart data - tasks per project with proper status breakdown
  const getTasksPerProjectData = () => {
    const projectTaskCount = {};

    // Group tasks by project and count by status
    tasks.forEach(task => {
      const projectId = task.projectId?._id || task.projectId;
      const projectName = task.projectId?.projectName || task.projectId?.businessName || 'Unknown';

      if (!projectTaskCount[projectId]) {
        projectTaskCount[projectId] = {
          name: projectName.length > 15 ? projectName.substring(0, 15) + '...' : projectName,
          fullName: projectName,
          total: 0,
          approved: 0,
          review: 0,
          pending: 0,
          rejected: 0,
        };
      }

      projectTaskCount[projectId].total++;

      // Categorize by status - from designer's perspective
      // Workflow: design_pending → design_submitted → design_approved (tester approved) → final_approved (marketer approved)
      // For landing page designs: design_approved → development_pending (marketer approved, now with developer)
      if (task.status === 'final_approved') {
        // Final approval by marketer - designer's work is complete
        projectTaskCount[projectId].approved++;
      } else if (task.status === 'development_pending' && task.taskType === 'landing_page_design') {
        // Landing page design approved by marketer, now in development - designer's work is complete
        projectTaskCount[projectId].approved++;
      } else if (['design_submitted', 'design_approved'].includes(task.status)) {
        // Under review: design_submitted = tester reviewing, design_approved = marketer reviewing
        projectTaskCount[projectId].review++;
      } else if (['design_rejected', 'rejected'].includes(task.status)) {
        // Needs revision
        projectTaskCount[projectId].rejected++;
      } else {
        // design_pending, todo, in_progress, or other statuses - needs to be designed
        projectTaskCount[projectId].pending++;
      }
    });

    // Convert to array and limit to top 5 projects
    return Object.values(projectTaskCount)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map(item => ({
        name: item.name,
        fullName: item.fullName,
        approved: item.approved,
        review: item.review,
        pending: item.pending,
        rejected: item.rejected,
      }));
  };

  // Get recent tasks for task overview section
  const getRecentTasks = () => {
    return [...tasks]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 6);
  };

  // Get tasks needing attention (rejected or in review)
  const getTasksNeedingAttention = () => {
    return tasks.filter(t =>
      ['design_rejected', 'rejected', 'design_submitted'].includes(t.status)
    ).slice(0, 3);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <EmptyState
          icon={AlertCircle}
          title="Failed to Load Dashboard"
          description={error}
          action={
            <Button onClick={fetchDashboardData}>
              <RefreshCw size={16} className="mr-2" />
              Try Again
            </Button>
          }
        />
      </div>
    );
  }

  const taskStatusData = getTaskStatusData();
  const tasksPerProjectData = getTasksPerProjectData();
  const recentTasks = getRecentTasks();

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600">
            <Palette size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">UI/UX Designer Dashboard</h1>
            <p className="text-gray-500 mt-1">
              Welcome back, {user?.name?.split(' ')[0] || 'Designer'}! Here's your design work overview.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/dashboard/projects')}>
            <FolderKanban size={18} className="mr-2" />
            Projects
          </Button>
          <Button onClick={() => navigate('/dashboard/tasks')}>
            <Clock size={18} className="mr-2" />
            My Tasks
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard
          title="Total Tasks"
          value={String(stats.totalTasks)}
          icon={FolderKanban}
          iconBg="bg-gradient-to-br from-purple-400 to-purple-600"
        />
        <StatCard
          title="Pending"
          value={String(stats.pendingDesigns)}
          change={stats.pendingDesigns > 0 ? `${stats.pendingDesigns} awaiting` : null}
          changeType="neutral"
          icon={Clock}
          iconBg="bg-gradient-to-br from-yellow-400 to-yellow-600"
        />
        <StatCard
          title="Under Review"
          value={String(stats.reviewDesigns)}
          change={stats.reviewDesigns > 0 ? 'With tester' : null}
          changeType="neutral"
          icon={Eye}
          iconBg="bg-gradient-to-br from-blue-400 to-blue-600"
        />
        <StatCard
          title="Approved"
          value={String(stats.approvedDesigns)}
          change={stats.approvedDesigns > 0 ? '+this week' : null}
          changeType="positive"
          icon={CheckCircle}
          iconBg="bg-gradient-to-br from-green-400 to-green-600"
        />
        <StatCard
          title="Rejected"
          value={String(stats.rejectedDesigns)}
          change={stats.rejectedDesigns > 0 ? 'Needs revision' : null}
          changeType="negative"
          icon={XCircle}
          iconBg="bg-gradient-to-br from-red-400 to-red-600"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart - Task Status Distribution */}
        <div className="lg:col-span-1 chart-container-enhanced">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-400 to-purple-500">
              <PieChartIcon size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Design Progress</h3>
              <p className="text-sm text-gray-500">Pending, Review, Approved & Rejected</p>
            </div>
          </div>

          {/* Custom legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4">
            {taskStatusData.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-gray-500">{item.name}</span>
                <span className="text-xs font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>

          {taskStatusData.length > 0 ? (
            <div className="h-52">
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
            <div className="h-52 flex items-center justify-center text-sm text-gray-400">
              <div className="text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No design tasks yet</p>
              </div>
            </div>
          )}
        </div>

        {/* Bar Chart - Tasks per Project */}
        <div className="lg:col-span-2 chart-container-enhanced">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500">
                <BarChart3 size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Tasks by Project</h3>
                <p className="text-sm text-gray-500">Status breakdown</p>
              </div>
            </div>
          </div>

          {tasksPerProjectData.length > 0 ? (
            <div style={{ height: `${Math.max(tasksPerProjectData.length * 42 + 60, 180)}px` }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={tasksPerProjectData}
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
                    width={100}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      const labels = {
                        approved: 'Approved',
                        review: 'Under Review',
                        pending: 'Pending',
                        rejected: 'Rejected'
                      };
                      return [`${value} task${value !== 1 ? 's' : ''}`, labels[name] || name];
                    }}
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
                  <Bar dataKey="approved" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="review" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="pending" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="rejected" stackId="a" fill="#EF4444" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">
              <div className="text-center">
                <FolderKanban className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No project data available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Overview Section */}
      <div className="chart-container-enhanced">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-400 to-purple-500">
              <Palette size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Recent Design Tasks</h3>
              <p className="text-sm text-gray-500">Your assigned design work</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/tasks')}>
            View All Tasks
            <ChevronRight size={16} className="ml-1" />
          </Button>
        </div>

        {recentTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentTasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onClick={() => navigate(`/dashboard/tasks/${task._id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Palette className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Design Tasks</h4>
            <p className="text-sm text-gray-500 mb-4">
              You haven't been assigned any design tasks yet. Tasks will appear here once they're created.
            </p>
            <Button variant="outline" onClick={() => navigate('/dashboard/projects')}>
              Browse Projects
            </Button>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/dashboard/tasks')}
          className="p-4 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl text-white text-left hover:shadow-lg transition-all duration-200"
        >
          <Clock size={24} className="mb-2" />
          <p className="font-semibold">View All Tasks</p>
          <p className="text-sm text-white/80 mt-1">See all your design assignments</p>
        </button>
        <button
          onClick={() => navigate('/dashboard/projects')}
          className="enhanced-card p-4 text-gray-900 text-left"
        >
          <FolderKanban size={24} className="mb-2 text-primary-500" />
          <p className="font-semibold">My Projects</p>
          <p className="text-sm text-gray-500 mt-1">View assigned projects</p>
        </button>
        <button
          onClick={() => navigate('/dashboard/creatives')}
          className="enhanced-card p-4 text-gray-900 text-left"
        >
          <Upload size={24} className="mb-2 text-green-500" />
          <p className="font-semibold">Upload Design</p>
          <p className="text-sm text-gray-500 mt-1">Submit your design work</p>
        </button>
      </div>

      {/* Rejected Tasks Alert (if any) */}
      {stats.rejectedDesigns > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="font-medium text-red-900">Rejected Designs Need Attention</p>
              <p className="text-sm text-red-600">
                You have {stats.rejectedDesigns} design{stats.rejectedDesigns !== 1 ? 's' : ''} that need{stats.rejectedDesigns === 1 ? 's' : ''} revision.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard/tasks?status=rejected')}
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            View Rejected
            <ChevronRight size={16} className="ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}