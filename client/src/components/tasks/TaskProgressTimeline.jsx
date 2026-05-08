import { useMemo } from 'react';
import { CheckCircle, Clock, User, AlertCircle, ArrowRight } from 'lucide-react';

// Stage display configuration
const STAGE_CONFIG = {
  created: {
    label: 'Task Created',
    icon: CheckCircle,
    color: 'gray',
    description: 'Task was created'
  },
  assigned: {
    label: 'Assigned',
    icon: User,
    color: 'blue',
    description: 'Task assigned to team member'
  },
  content_pending: {
    label: 'Content Pending',
    icon: Clock,
    color: 'yellow',
    description: 'Waiting for content creation'
  },
  content_submitted: {
    label: 'Content Submitted',
    icon: CheckCircle,
    color: 'blue',
    description: 'Content submitted for review'
  },
  content_approved: {
    label: 'Content Approved',
    icon: CheckCircle,
    color: 'green',
    description: 'Content approved by tester'
  },
  content_rejected: {
    label: 'Content Rejected',
    icon: AlertCircle,
    color: 'red',
    description: 'Content needs revision'
  },
  design_pending: {
    label: 'Design Pending',
    icon: Clock,
    color: 'yellow',
    description: 'Waiting for design work'
  },
  design_submitted: {
    label: 'Design Submitted',
    icon: CheckCircle,
    color: 'blue',
    description: 'Design submitted for review'
  },
  design_approved: {
    label: 'Design Approved',
    icon: CheckCircle,
    color: 'green',
    description: 'Design approved by tester'
  },
  design_rejected: {
    label: 'Design Rejected',
    icon: AlertCircle,
    color: 'red',
    description: 'Design needs revision'
  },
  development_pending: {
    label: 'Development Pending',
    icon: Clock,
    color: 'yellow',
    description: 'Waiting for development'
  },
  development_submitted: {
    label: 'Development Submitted',
    icon: CheckCircle,
    color: 'blue',
    description: 'Development submitted for review'
  },
  development_approved: {
    label: 'Development Approved',
    icon: CheckCircle,
    color: 'green',
    description: 'Development approved by tester'
  },
  marketer_review: {
    label: 'Marketer Review',
    icon: Clock,
    color: 'purple',
    description: 'Awaiting marketer approval'
  },
  final_approved: {
    label: 'Completed',
    icon: CheckCircle,
    color: 'green',
    description: 'Task fully approved'
  },
  rejected: {
    label: 'Rejected',
    icon: AlertCircle,
    color: 'red',
    description: 'Task rejected'
  }
};

// Action labels
const ACTION_LABELS = {
  created: 'Created',
  assigned: 'Assigned',
  submitted: 'Submitted',
  reviewed: 'Reviewed',
  approved: 'Approved',
  rejected: 'Rejected',
  resubmitted: 'Resubmitted',
  completed: 'Completed'
};

// Role labels for display
const ROLE_LABELS = {
  admin: 'Admin',
  performance_marketer: 'Performance Marketer',
  content_creator: 'Content Creator',
  content_writer: 'Content Writer',
  graphic_designer: 'Graphic Designer',
  video_editor: 'Video Editor',
  ui_ux_designer: 'UI/UX Designer',
  developer: 'Developer',
  tester: 'Tester'
};

// Format duration in human-readable format
function formatDuration(ms) {
  if (!ms) return null;

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  } else if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}

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

export default function TaskProgressTimeline({ task, compact = false }) {
  const progressHistory = task?.progressHistory || [];

  // Calculate current stage info
  const currentStage = useMemo(() => {
    if (progressHistory.length === 0) return null;
    return progressHistory[progressHistory.length - 1];
  }, [progressHistory]);

  // Get unique stages (merge similar stages for cleaner display)
  const displayStages = useMemo(() => {
    if (progressHistory.length === 0) return [];

    // Group by unique stage (take the latest entry for each stage)
    const stageMap = new Map();
    progressHistory.forEach(entry => {
      // For this display, we want to show the progression through stages
      // So we keep the first occurrence of each "major" stage
      const stageKey = entry.stage;
      if (!stageMap.has(stageKey)) {
        stageMap.set(stageKey, entry);
      }
    });

    return Array.from(stageMap.values());
  }, [progressHistory]);

  // Get stage config with fallback
  const getStageConfig = (stage) => {
    return STAGE_CONFIG[stage] || {
      label: stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      icon: Clock,
      color: 'gray',
      description: ''
    };
  };

  if (compact) {
    // Compact version for cards/lists
    return (
      <div className="space-y-2">
        {progressHistory.length === 0 ? (
          <div className="text-sm text-gray-500 italic">No progress recorded</div>
        ) : (
          <>
            {/* Current Status */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Current:</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                ${currentStage?.stage === 'final_approved' ? 'bg-green-100 text-green-800' :
                  currentStage?.stage?.includes('rejected') ? 'bg-red-100 text-red-800' :
                  currentStage?.stage?.includes('approved') ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'}`}>
                {getStageConfig(currentStage?.stage).label}
              </span>
            </div>

            {/* Last action */}
            {currentStage && (
              <div className="text-xs text-gray-500">
                {currentStage.actor?.name && (
                  <span>by {currentStage.actor.name} </span>
                )}
                <span>{formatDate(currentStage.timestamp)}</span>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Full timeline display
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Task Progress</h3>
      </div>

     {progressHistory.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
    <Clock className="w-8 h-8 mb-2 text-gray-300" />
    <p className="text-sm">No progress recorded yet</p>
  </div>
) : (
  <>
    <div className="divide-y divide-gray-100">
      {progressHistory.map((entry, index) => {
        const config = getStageConfig(entry.stage);
        const Icon = config.icon;
        const isLast = index === progressHistory.length - 1;
        const duration = entry.durationFromPrevious
          ? formatDuration(entry.durationFromPrevious)
          : null;

        const iconColor = {
          green: 'bg-green-100 text-green-600',
          blue: 'bg-blue-100 text-blue-600',
          red: 'bg-red-100 text-red-600',
          yellow: 'bg-yellow-100 text-yellow-600',
          purple: 'bg-purple-100 text-purple-600',
        }[config.color] ?? 'bg-gray-100 text-gray-500';

        const actionColor =
          entry.action === 'approved' || entry.action === 'completed'
            ? 'bg-green-100 text-green-700'
            : entry.action === 'rejected'
            ? 'bg-red-100 text-red-700'
            : entry.action === 'submitted'
            ? 'bg-blue-100 text-blue-700'
            : 'bg-gray-100 text-gray-600';

        return (
          <div
            key={index}
            className={`flex gap-3 px-4 py-3 ${isLast ? 'bg-blue-50/50' : ''}`}
          >
            {/* Left: icon + connector line */}
            <div className="flex flex-col items-center flex-shrink-0 w-8">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconColor}`}>
                <Icon className="w-4 h-4" />
              </div>
              {!isLast && (
                <div className="flex-1 w-px bg-gray-200 mt-1 min-h-[12px]" />
              )}
            </div>

            {/* Right: content */}
            <div className="flex-1 min-w-0 pb-1">
              {/* Title row */}
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-900">
                    {config.label}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${actionColor}`}>
                    {ACTION_LABELS[entry.action] || entry.action}
                  </span>
                </div>
                {isLast && (
                  <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full flex-shrink-0">
                    Current
                  </span>
                )}
              </div>

              {/* Meta: actor + timestamp — wraps on narrow screens */}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                {entry.actor?.name && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 flex-shrink-0" />
                    {entry.actor.name}
                    <span className="text-gray-400">
                      · {ROLE_LABELS[entry.actorRole] || entry.actorRole}
                    </span>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  {formatDate(entry.timestamp)}
                </span>
              </div>

              {/* Duration */}
              {duration && (
                <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                  <ArrowRight className="w-3 h-3 flex-shrink-0" />
                  {duration} since previous step
                </p>
              )}

              {/* Notes */}
              {entry.notes && (
                <p className="mt-2 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-md px-2.5 py-1.5 leading-relaxed">
                  {entry.notes}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>

    {/* Summary footer */}
    {progressHistory.length > 1 && (
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        <span>{progressHistory.length} steps total</span>
        <span>
          Total time:{' '}
          {formatDuration(
            new Date(progressHistory[progressHistory.length - 1].timestamp) -
              new Date(progressHistory[0].timestamp)
          )}
        </span>
      </div>
    )}
  </>
)}
    </div>
  );
}