import { cn } from '@/lib/utils';
import { getUsagePercentage, getUsageColor } from '@/services/billingService';
import {
  Users,
  FolderKanban,
  Globe,
  HardDrive,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

/**
 * Usage Meter Component
 *
 * Displays a progress bar for usage limits with icons.
 */
export function UsageMeter({
  type,
  used,
  limit,
  label,
  showIcon = true,
  size = 'default',
  showRemaining = true,
  unlimitedLabel = 'Unlimited'
}) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : getUsagePercentage(used, limit);
  const colorClass = getUsageColor(percentage);
  const remaining = isUnlimited ? null : limit - used;

  const icons = {
    users: Users,
    projects: FolderKanban,
    landingPages: Globe,
    storage: HardDrive,
    aiCalls: Sparkles
  };

  const Icon = icons[type] || Sparkles;

  const sizeClasses = {
    small: 'text-xs',
    default: 'text-sm',
    large: 'text-base'
  };

  const barHeight = {
    small: 'h-1.5',
    default: 'h-2',
    large: 'h-3'
  };

  // Format storage values
  const formatValue = (value, isStorage = false) => {
    if (isStorage) {
      if (value >= 1024) {
        return `${(value / 1024).toFixed(1)} GB`;
      }
      return `${value} MB`;
    }
    return value.toLocaleString();
  };

  const isStorage = type === 'storage';
  const isWarning = percentage >= 80;
  const isExceeded = percentage >= 100;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showIcon && (
            <div className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              isExceeded ? 'bg-red-100 text-red-600' :
              isWarning ? 'bg-orange-100 text-orange-600' :
              'bg-primary-100 text-primary-600'
            )}>
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div>
            <div className={cn('font-medium text-gray-900', sizeClasses[size])}>
              {label || type.charAt(0).toUpperCase() + type.slice(1)}
            </div>
            <div className={cn('text-gray-500', sizeClasses[size])}>
              {isUnlimited ? (
                <span className="text-green-600">{unlimitedLabel}</span>
              ) : (
                <>
                  {formatValue(used, isStorage)} / {formatValue(limit, isStorage)}
                  {type === 'aiCalls' && (
                    <span className="ml-1">this month</span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Percentage Badge */}
        {!isUnlimited && (
          <div className={cn(
            'rounded-full px-2 py-1 text-xs font-medium',
            isExceeded ? 'bg-red-100 text-red-700' :
            isWarning ? 'bg-orange-100 text-orange-700' :
            'bg-gray-100 text-gray-700'
          )}>
            {percentage}%
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {!isUnlimited && (
        <div className="mt-3">
          <div className={cn('w-full rounded-full bg-gray-100', barHeight[size])}>
            <div
              className={cn(
                'rounded-full transition-all duration-300',
                barHeight[size],
                isExceeded ? 'bg-red-500' :
                isWarning ? 'bg-orange-500' :
                'bg-primary-500'
              )}
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </div>
        </div>
      )}

      {/* Remaining / Warning */}
      {!isUnlimited && showRemaining && (
        <div className="mt-2">
          {isExceeded ? (
            <div className="flex items-center gap-1 text-xs text-red-600">
              <AlertTriangle className="h-3 w-3" />
              Limit exceeded - upgrade required
            </div>
          ) : isWarning ? (
            <div className="flex items-center gap-1 text-xs text-orange-600">
              <AlertTriangle className="h-3 w-3" />
              {remaining} {type === 'aiCalls' ? 'calls' : type} remaining
            </div>
          ) : (
            <div className="text-xs text-gray-500">
              {remaining} remaining
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Usage Summary Grid
 *
 * Displays all usage meters in a grid layout.
 */
export function UsageSummary({ usage, planLimits }) {
  const meters = [
    {
      type: 'users',
      used: usage?.usersCount || 0,
      limit: planLimits?.maxUsers || -1,
      label: 'Team Members'
    },
    {
      type: 'projects',
      used: usage?.projectsCount || 0,
      limit: planLimits?.maxProjects || -1,
      label: 'Projects'
    },
    {
      type: 'storage',
      used: usage?.storageUsedMB || 0,
      limit: planLimits?.storageLimitMB || -1,
      label: 'Storage'
    },
    // {
    //   type: 'aiCalls',
    //   used: usage?.aiCallsThisMonth || 0,
    //   limit: planLimits?.aiCallsPerMonth || -1,
    //   label: 'AI Calls'
    // }
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {meters.map((meter) => (
        <UsageMeter
          key={meter.type}
          type={meter.type}
          used={meter.used}
          limit={meter.limit}
          label={meter.label}
        />
      ))}
    </div>
  );
}

export default UsageMeter;