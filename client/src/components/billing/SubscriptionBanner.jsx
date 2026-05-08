import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, X, Calendar, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import billingService, { getDaysRemaining } from '@/services/billingService';

/**
 * Subscription Banner Component
 *
 * Shows a warning banner when subscription is close to expiry
 * Displayed at the top of the dashboard
 */
export default function SubscriptionBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await billingService.getSubscription();
      setSubscriptionData(response.data);
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't show if loading or no data
  if (loading || !subscriptionData?.organization) {
    return null;
  }

  const org = subscriptionData.organization;
  const daysRemaining = getDaysRemaining(org.currentPeriodEnd);
  const isCanceled = org.canceledAt;
  const isSuspended = org.isSuspended;

  // Don't show if dismissed, suspended, or more than 7 days remaining
  if (dismissed || isSuspended || daysRemaining > 7 || daysRemaining === null) {
    return null;
  }

  // Don't show if canceled (they already know)
  if (isCanceled) {
    return null;
  }

  // Determine banner style based on urgency
  const isUrgent = daysRemaining <= 1;
  const isWarning = daysRemaining <= 3;

  const bannerStyles = {
    urgent: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-orange-50 border-orange-200 text-orange-800',
    notice: 'bg-yellow-50 border-yellow-200 text-yellow-800'
  };

  const iconStyles = {
    urgent: 'text-red-500',
    warning: 'text-orange-500',
    notice: 'text-yellow-500'
  };

  const buttonStyles = {
    urgent: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-orange-600 hover:bg-orange-700 text-white',
    notice: 'bg-yellow-600 hover:bg-yellow-700 text-white'
  };

  const style = isUrgent ? 'urgent' : isWarning ? 'warning' : 'notice';

  const getMessage = () => {
    if (daysRemaining === 0) {
      return 'Your subscription expires today!';
    }
    if (daysRemaining === 1) {
      return 'Your subscription expires tomorrow!';
    }
    return `Your subscription expires in ${daysRemaining} days`;
  };

  return (
    <div className={cn(
      'border-b px-4 py-3',
      bannerStyles[style]
    )}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className={cn('h-5 w-5 flex-shrink-0', iconStyles[style])} />
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <span className="font-medium">
              {getMessage()}
            </span>
            <div className="flex items-center gap-1 text-sm opacity-75">
              <Calendar className="h-4 w-4" />
              <span>
                Expires: {org.currentPeriodEnd
                  ? new Date(org.currentPeriodEnd).toLocaleDateString()
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/billing"
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
              buttonStyles[style]
            )}
          >
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Renew Now</span>
            <span className="sm:hidden">Renew</span>
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="rounded-lg p-1.5 hover:bg-black/5 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}