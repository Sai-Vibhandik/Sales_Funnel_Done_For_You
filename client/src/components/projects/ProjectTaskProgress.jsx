import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { taskService } from '@/services/api';
import { Card, CardBody, CardHeader, Spinner, Badge } from '@/components/ui';
import TaskProgressTimeline from '@/components/tasks/TaskProgressTimeline';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Palette,
  Video,
  Layout,
  Code,
  ChevronDown,
  ChevronUp,
  Eye,
  User
} from 'lucide-react';

// Task type configuration
const TASK_TYPE_CONFIG = {
  content_creation: { label: 'Content Creation', icon: FileText, color: 'blue' },
  graphic_design: { label: 'Graphic Design', icon: Palette, color: 'purple' },
  video_editing: { label: 'Video Editing', icon: Video, color: 'pink' },
  landing_page_design: { label: 'Landing Page Design', icon: Layout, color: 'orange' },
  landing_page_development: { label: 'Landing Page Development', icon: Code, color: 'green' }
};

// Status configuration
const STATUS_CONFIG = {
  // Content workflow
  content_pending: { label: 'Pending Content', color: 'yellow', icon: Clock },
  content_submitted: { label: 'Content Submitted', color: 'blue', icon: Clock },
  content_final_approved: { label: 'Content Approved', color: 'green', icon: CheckCircle },
  content_rejected: { label: 'Content Rejected', color: 'red', icon: XCircle },
  // Design workflow
  design_pending: { label: 'Pending Design', color: 'yellow', icon: Clock },
  design_submitted: { label: 'Design Submitted', color: 'blue', icon: Clock },
  design_approved: { label: 'Design Approved', color: 'purple', icon: CheckCircle },
  design_rejected: { label: 'Design Rejected', color: 'red', icon: XCircle },
  // Development workflow
  development_pending: { label: 'Pending Development', color: 'yellow', icon: Clock },
  development_submitted: { label: 'Development Submitted', color: 'blue', icon: Clock },
  development_approved: { label: 'Development Approved', color: 'green', icon: CheckCircle },
  // Final
  final_approved: { label: 'Completed', color: 'green', icon: CheckCircle },
  // Legacy
  todo: { label: 'To Do', color: 'gray', icon: Clock },
  in_progress: { label: 'In Progress', color: 'blue', icon: Clock },
  submitted: { label: 'Submitted', color: 'blue', icon: Clock },
  approved_by_tester: { label: 'Approved by Tester', color: 'purple', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'red', icon: XCircle }
};

// Role labels
const ROLE_LABELS = {
  admin: 'Admin',
  performance_marketer: 'Performance Marketer',
  content_creator: 'Content Creator',
  content_writer: 'Content Planner',
  graphic_designer: 'Graphic Designer',
  video_editor: 'Video Editor',
  ui_ux_designer: 'UI/UX Designer',
  developer: 'Developer',
  tester: 'Tester'
};

// Format date for display
function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function ProjectTaskProgress({ projectId, projectName }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [filter, setFilter] = useState('all'); // all, in_progress, completed

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await taskService.getProjectTasks(projectId);
      setTasks(response.data || []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskExpand = (taskId) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  // Group tasks by type
  const tasksByType = tasks.reduce((acc, task) => {
    const type = task.taskType || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(task);
    return acc;
  }, {});

  // Filter tasks
  const getFilteredTasks = () => {
    let filtered = tasks;
    if (filter === 'in_progress') {
      filtered = tasks.filter(t => !['final_approved', 'completed'].includes(t.status));
    } else if (filter === 'completed') {
      filtered = tasks.filter(t => ['final_approved', 'completed'].includes(t.status));
    }
    return filtered;
  };

  // Get current status for a task
  const getCurrentStatus = (task) => {
    const config = STATUS_CONFIG[task.status] || { label: task.status, color: 'gray', icon: AlertCircle };
    return config;
  };

  // Get current assignee info
  const getCurrentAssignee = (task) => {
    if (task.assignedTo) {
      return {
        name: task.assignedTo.name || 'Unknown',
        role: task.assignedRole
      };
    }
    // Check progress history for last actor
    if (task.progressHistory && task.progressHistory.length > 0) {
      const lastEntry = task.progressHistory[task.progressHistory.length - 1];
      if (lastEntry.actor) {
        return {
          name: lastEntry.actor.name || 'Unknown',
          role: lastEntry.actorRole
        };
      }
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardBody className="p-6 text-center">
          <Spinner size="lg" />
          <p className="mt-2 text-gray-500">Loading task progress...</p>
        </CardBody>
      </Card>
    );
  }

  const filteredTasks = getFilteredTasks();

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary-500 flex-shrink-0" />
          <span className="truncate">Task Progress & Workflow</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-primary-100 text-primary-700 font-medium'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({tasks.length})
          </button>
          <button
            onClick={() => setFilter('in_progress')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-lg transition-colors ${
              filter === 'in_progress'
                ? 'bg-yellow-100 text-yellow-700 font-medium'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            In Progress ({tasks.filter(t => !['final_approved', 'completed'].includes(t.status)).length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-lg transition-colors ${
              filter === 'completed'
                ? 'bg-green-100 text-green-700 font-medium'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Completed ({tasks.filter(t => ['final_approved', 'completed'].includes(t.status)).length})
          </button>
        </div>
      </CardHeader>
      <CardBody className="p-4">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No tasks found for this project</p>
            <p className="text-sm text-gray-400 mt-1">
              Tasks will appear here when created through the workflow stages
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const statusConfig = getCurrentStatus(task);
              const assignee = getCurrentAssignee(task);
              const taskTypeConfig = TASK_TYPE_CONFIG[task.taskType] || { label: task.taskType, icon: FileText, color: 'gray' };
              const TypeIcon = taskTypeConfig.icon;
              const StatusIcon = statusConfig.icon;
              const isExpanded = expandedTasks[task._id];

              return (
                <div
                  key={task._id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* Task Header - Always Visible */}
                  <button
                    onClick={() => toggleTaskExpand(task._id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${taskTypeConfig.color}-100`}>
                        <TypeIcon className={`w-5 h-5 text-${taskTypeConfig.color}-600`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{task.taskTitle}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={statusConfig.color === 'green' ? 'success' : statusConfig.color === 'red' ? 'danger' : statusConfig.color === 'purple' ? 'primary' : 'secondary'} className="text-xs">
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                          {assignee && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {assignee.name}
                              <span className="text-gray-400">({ROLE_LABELS[assignee.role] || assignee.role})</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Last update time */}
                      {task.progressHistory && task.progressHistory.length > 0 && (
                        <span className="text-xs text-gray-400 hidden sm:block">
                          Updated {formatDate(task.progressHistory[task.progressHistory.length - 1].timestamp)}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Content - Progress Timeline */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50 p-4">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Task Details */}
                        <div className="lg:col-span-1">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Task Details</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Type:</span>
                              <span className="text-gray-900">{taskTypeConfig.label}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Status:</span>
                              <span className="text-gray-900">{statusConfig.label}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Role:</span>
                              <span className="text-gray-900">{ROLE_LABELS[task.assignedRole] || task.assignedRole}</span>
                            </div>
                            {task.dueDate && (
                              <div className="flex justify-between">
                                <span className="text-gray-500">Due:</span>
                                <span className="text-gray-900">{new Date(task.dueDate).toLocaleDateString()}</span>
                              </div>
                            )}
                            <div className="pt-2">
                              <button
                                onClick={() => navigate(`/dashboard/tasks/${task._id}`)}
                                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                View Full Task
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Progress Timeline */}
                        <div className="lg:col-span-2">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Progress Timeline</h4>
                          <TaskProgressTimeline task={task} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}