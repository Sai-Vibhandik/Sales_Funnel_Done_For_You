import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import billingService, { formatCurrency } from '@/services/billingService';
import { PlanCard, PlanComparison, CheckoutModal } from '@/components/billing';

/**
 * Plans Page Component
 *
 * Public pricing page showing all available plans with comparison.
 */
export default function PlansPage() {
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [showComparison, setShowComparison] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);

  // Fetch plans on mount
  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const result = await billingService.getPlans();
      setPlans(result.data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const result = await billingService.getSubscription();
      setCurrentPlan(result.data?.organization?.plan);
    } catch (error) {
      // Not logged in or no subscription
      setCurrentPlan(null);
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
    navigate('/dashboard/billing');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Choose the perfect plan for your business. All plans include a 14-day free trial.
            </p>
          </div>

          {/* Billing Period Toggle */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <span className={cn(
              'text-sm font-medium',
              billingPeriod === 'monthly' ? 'text-gray-900' : 'text-gray-500'
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
              'text-sm font-medium',
              billingPeriod === 'yearly' ? 'text-gray-900' : 'text-gray-500'
            )}>
              Yearly
              <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Save 20%
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
<div className="flex justify-center mt-8 px-4">
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-fit">
          {plans.map((plan) => (
            <PlanCard
              key={plan._id || plan.id}
              plan={plan}
              currentPlan={plan.slug === currentPlan}
              billingPeriod={billingPeriod}
              onSelect={handleSelectPlan}
              highlightColor={plan.highlightColor}
            />
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium"
          >
            <HelpCircle className="h-5 w-5 mr-2" />
            {showComparison ? 'Hide' : 'Show'} plan comparison
          </button>
        </div>

        {showComparison && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Compare Plans</h2>
              <PlanComparison
                plans={plans}
                currentPlan={currentPlan}
                billingPeriod={billingPeriod}
                onSelectPlan={handleSelectPlan}
              />
            </div>
          </div>
        )}
      </div>

      {/* Features */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              Everything you need to grow
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              All plans include these essential features
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'AI-Powered Strategy',
                description: 'Generate comprehensive marketing strategies with AI assistance for every stage.'
              },
              {
                title: 'Team Collaboration',
                description: 'Invite team members, assign tasks, and collaborate in real-time.'
              },
              {
                title: 'Project Management',
                description: 'Organize projects with stages, track progress, and manage deliverables.'
              },
              {
                title: 'Asset Library',
                description: 'Store and manage all your creative assets in one centralized location.'
              },
              {
                title: 'Analytics Dashboard',
                description: 'Track performance metrics and gain insights across all your projects.'
              },
              {
                title: 'Priority Support',
                description: 'Get help when you need it with responsive customer support.'
              }
            ].map((feature, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100">
                  <Check className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          Frequently asked questions
        </h2>
        <div className="space-y-6">
          {[
            {
              question: 'Can I change plans at any time?',
              answer: 'Yes, you can upgrade or downgrade your plan at any time. Upgrades take effect immediately with prorated billing. Downgrades take effect at the end of your billing period.'
            },
            {
              question: 'What happens when my trial ends?',
              answer: 'After your 14-day trial, you\'ll be asked to choose a plan. Your data will be preserved, but access to premium features will be restricted until you subscribe.'
            },
            {
              question: 'Do you offer refunds?',
              answer: 'We offer a 30-day money-back guarantee. If you\'re not satisfied, contact our support team within 30 days for a full refund.'
            },
            {
              question: 'Can I cancel my subscription?',
              answer: 'Yes, you can cancel your subscription at any time. You\'ll continue to have access until the end of your billing period. We don\'t offer partial refunds for unused time.'
            },
            {
              question: 'What payment methods do you accept?',
              answer: 'We accept all major credit cards (Visa, Mastercard, American Express) via Stripe. For customers in India, we also support UPI, net banking, and wallets via Razorpay.'
            }
          ].map((faq, index) => (
            <div key={index} className="rounded-lg bg-white border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900">{faq.question}</h3>
              <p className="mt-2 text-gray-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl font-bold text-white">
            Ready to get started?
          </h2>
          <p className="mt-4 text-lg text-primary-100">
            Start your free trial today. No credit card required.
          </p>
          <button
            onClick={() => navigate('/register')}
            className="mt-8 inline-flex items-center rounded-lg bg-white px-6 py-3 font-semibold text-primary-600 hover:bg-primary-50"
          >
            Start Free Trial
          </button>
        </div>
      </div>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        plan={selectedPlan}
        billingPeriod={billingPeriod}
        onSuccess={handleCheckoutSuccess}
        onCancel={() => setShowCheckout(false)}
      />
    </div>
  );
}