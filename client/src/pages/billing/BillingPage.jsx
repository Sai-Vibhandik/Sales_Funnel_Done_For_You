import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  CreditCard,
  Download,
  ExternalLink,
  Settings,
  TrendingUp,
  Users,
  FolderKanban,
  Globe,
  HardDrive,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import billingService, {
  formatCurrency,
  getStatusColor,
  isSubscriptionActive,
  getDaysRemaining
} from '@/services/billingService';
import { PlanCard, UsageMeter, PaymentHistory, CheckoutModal } from '@/components/billing';

/**
 * Billing Page Component
 *
 * Displays current subscription, usage, invoices, and plan management.
 */
export default function BillingPage() {
  // ADD THIS before return (after derived values like currentPlan)


  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [usage, setUsage] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subRes, plansRes, usageRes, invoicesRes] = await Promise.all([
        billingService.getSubscription().catch(() => ({ data: null })),
        billingService.getPlans().catch(() => ({ data: [] })),
        billingService.getUsage().catch(() => ({ data: null })),
        billingService.getInvoices(10).catch(() => ({ data: [] }))
      ]);

      setSubscription(subRes.data);
      setPlans(plansRes.data || []);
      setUsage(usageRes.data);
      setInvoices(invoicesRes.data || []);
    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  // Handle plan selection
  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setShowCheckout(true);
  };

  // Handle checkout success
  const handleCheckoutSuccess = () => {
    setShowCheckout(false);
    toast.success('Subscription activated successfully!');
    fetchData();
  };

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access at the end of your billing period.')) {
      return;
    }

    try {
      setActionLoading(true);
      await billingService.cancelSubscription({ cancelImmediately: false });
      toast.success('Subscription will be canceled at the end of the billing period');
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to cancel subscription');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle subscription reactivation
  const handleReactivateSubscription = async () => {
    try {
      setActionLoading(true);
      await billingService.reactivateSubscription();
      toast.success('Subscription reactivated successfully');
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to reactivate subscription');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle billing portal
  const handleOpenPortal = async () => {
    try {
      const result = await billingService.createPortalSession(
        window.location.origin + '/dashboard/billing'
      );
      if (result.data?.url) {
        window.open(result.data.url, '_blank');
      }
    } catch (error) {
      toast.error('Failed to open billing portal');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const currentPlan = plans.find(p => p.slug === subscription?.organization?.plan);
  const isActive = isSubscriptionActive(subscription?.organization?.subscriptionStatus);
  const daysRemaining = getDaysRemaining(subscription?.organization?.currentPeriodEnd);
  const isCanceled = subscription?.organization?.canceledAt;
const sortedPlans = [...plans];

// Find popular plan (assumes plan.isPopular === true)
const middleIndex = Math.floor(sortedPlans.length / 2);
const popularIndex = sortedPlans.findIndex(p => p.isPopular);

if (popularIndex !== -1) {
  const [popularPlan] = sortedPlans.splice(popularIndex, 1);
  sortedPlans.splice(middleIndex, 0, popularPlan);
}
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your subscription, view usage, and access invoices
        </p>
      </div>

      {/* Current Plan Card */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
        </div>

        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Plan Info */}
            <div className="flex items-center gap-4">
              <div className={cn(
                'flex h-14 w-14 items-center justify-center rounded-xl',
                isActive ? 'bg-primary-100' : 'bg-gray-100'
              )}>
                <CreditCard className={cn(
                  'h-7 w-7',
                  isActive ? 'text-primary-600' : 'text-gray-400'
                )} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-gray-900">
                    {subscription?.organization?.planName || 'Free Plan'}
                  </h3>
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                    getStatusColor(subscription?.organization?.subscriptionStatus || 'inactive')
                  )}>
                    {subscription?.organization?.subscriptionStatus || 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {isCanceled ? (
                    <span className="text-orange-600">
                      Cancels on {new Date(subscription?.organization?.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  ) : isActive ? (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Renews {new Date(subscription?.organization?.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  ) : subscription?.organization?.trialEndsAt ? (
                    <span className="text-blue-600">
                      Trial ends {new Date(subscription?.organization?.trialEndsAt).toLocaleDateString()}
                    </span>
                  ) : (
                    'No active subscription'
                  )}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              {isActive && !isCanceled && (
                <>
                  <button
                    onClick={() => navigate('/dashboard/billing/plans')}
                    className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Change Plan
                  </button>
                  <button
                    onClick={handleCancelSubscription}
                    disabled={actionLoading}
                    className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel Subscription
                  </button>
                </>
              )}
              {isCanceled && (
                <button
                  onClick={handleReactivateSubscription}
                  disabled={actionLoading}
                  className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Reactivate Subscription
                </button>
              )}
              {!isActive && !subscription?.organization?.trialEndsAt && (
                <button
                  onClick={() => navigate('/dashboard/billing/plans')}
                  className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Subscribe Now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Usage Section */}
      {usage && (
        <div className="mb-8 rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Usage This Month</h2>
          </div>
          <div className="p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
              <UsageMeter
                type="users"
                used={usage.usage?.users?.used || 0}
                limit={usage.usage?.users?.limit || -1}
                label="Team Members"
              />
              <UsageMeter
                type="projects"
                used={usage.usage?.projects?.used || 0}
                limit={usage.usage?.projects?.limit || -1}
                label="Projects"
              />
              {/* <UsageMeter
                type="storage"
                used={usage.usage?.storage?.usedMB || 0}
                limit={usage.usage?.storage?.limitMB || -1}
                label="Storage"
              />
              <UsageMeter
                type="aiCalls"
                used={usage.usage?.aiCalls?.used || 0}
                limit={usage.usage?.aiCalls?.limit || -1}
                label="AI Calls"
              /> */}
            </div>
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Available Plans</h2>
          <div className="flex items-center gap-2">
            <span className={cn(
              'rounded-full px-3 py-1 text-sm font-medium transition-all',
              billingPeriod === 'monthly'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600'
            )}>
              Monthly
            </span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                billingPeriod === 'yearly' ? 'bg-primary-600' : 'bg-gray-200'
              )}
            >
              <span className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                billingPeriod === 'yearly' ? 'translate-x-6' : 'translate-x-1'
              )} />
            </button>
            <span className={cn(
              'rounded-full px-3 py-1 text-sm font-medium transition-all',
              billingPeriod === 'yearly'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600'
            )}>
              Yearly
              {billingPeriod === 'yearly' && (
                <span className="ml-1 text-green-600">(Save 20%)</span>
              )}
            </span>
          </div>
        </div>
        <div className="p-6">
  <div className="flex justify-center">
     <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 justify-items-center">
      {sortedPlans.map((plan) => (
        <PlanCard
          key={plan._id || plan.id}
          plan={plan}
          currentPlan={plan.slug === subscription?.organization?.plan}
          billingPeriod={billingPeriod}
          onSelect={handleSelectPlan}
          highlightColor={plan.highlightColor}
          isCenter={plan.isPopular} // 👈 IMPORTANT
        />
      ))}
    </div>
    </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
          {subscription?.organization?.subscriptionProvider === 'stripe' && (
            <button
              onClick={handleOpenPortal}
              className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Manage Payment Methods
            </button>
          )}
        </div>
        <div className="p-6">
          <PaymentHistory invoices={invoices} />
        </div>
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        plan={selectedPlan}
        billingPeriod={billingPeriod}
        organization={subscription?.organization}
        onSuccess={handleCheckoutSuccess}
        onCancel={() => setShowCheckout(false)}
      />
    </div>
  );
}