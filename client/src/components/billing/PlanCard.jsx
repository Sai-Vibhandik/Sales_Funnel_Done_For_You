import { useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/services/billingService';

/**
 * Plan Card Component
 *
 * Displays a pricing plan card with features and CTA button.
 */
export function PlanCard({
  plan,
  currentPlan = false,
  onSelect,
  billingPeriod = 'monthly',
  isLoading = false,
  highlightColor
}) {
  const [isHovered, setIsHovered] = useState(false);

  const isPopular = plan.tier === 'pro' || plan.badge?.text;
  const price = billingPeriod === 'yearly' && plan.yearlyPrice
    ? plan.yearlyPrice
    : plan.monthlyPrice;
  const monthlyEquivalent = billingPeriod === 'yearly' && plan.yearlyPrice
    ? Math.round(plan.yearlyPrice / 12)
    : plan.monthlyPrice;

  const features = plan.formatFeatureList ? plan.formatFeatureList() : [];

  return (
    <div
      className={cn(
        'relative rounded-2xl border-2 p-6 transition-all duration-300',
        currentPlan
          ? 'border-primary-500 bg-primary-50/50 shadow-lg'
          : isPopular
          ? 'border-primary-500 bg-white shadow-xl scale-105'
          : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow-lg'
      )}
      style={highlightColor && isPopular ? { borderColor: highlightColor } : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Popular Badge */}
      {isPopular && (
        <div
          className="absolute -top-4 left-1/2 -translate-x-1/2"
          style={{ color: highlightColor || '#6366f1' }}
        >
          <div className="flex items-center gap-1 rounded-full bg-primary-500 px-4 py-1 text-sm font-semibold text-white">
            <Sparkles className="h-4 w-4" />
            {plan.badge?.text || 'Most Popular'}
          </div>
        </div>
      )}

      {/* Current Plan Badge */}
      {currentPlan && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <div className="rounded-full bg-green-500 px-4 py-1 text-sm font-semibold text-white">
            Current Plan
          </div>
        </div>
      )}

      {/* Plan Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
        {plan.description && (
          <p className="mt-2 text-sm text-gray-500">{plan.description}</p>
        )}
      </div>

      {/* Price */}
      <div className="mt-6 text-center">
        <div className="flex items-baseline justify-center">
          <span className="text-4xl font-bold text-gray-900">
            {formatCurrency(price, plan.currency?.code || 'USD')}
          </span>
          {billingPeriod === 'yearly' && (
            <span className="ml-2 text-sm text-gray-500">
              /year
            </span>
          )}
          {billingPeriod === 'monthly' && (
            <span className="ml-2 text-sm text-gray-500">
              /month
            </span>
          )}
        </div>
        {billingPeriod === 'yearly' && plan.yearlyDiscount > 0 && (
          <div className="mt-1">
            <span className="text-sm text-green-600 font-medium">
              Save {plan.yearlyDiscount}% annually
            </span>
          </div>
        )}
        {billingPeriod === 'yearly' && plan.yearlyPrice && (
          <div className="mt-1 text-sm text-gray-500">
            {formatCurrency(monthlyEquivalent, plan.currency?.code || 'USD')}/month
          </div>
        )}
      </div>

      {/* Features List */}
      <ul className="mt-6 space-y-3">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <Check
              className={cn(
                'h-5 w-5 flex-shrink-0',
                feature.highlighted ? 'text-primary-500' : 'text-gray-400'
              )}
            />
            <span
              className={cn(
                'text-sm',
                feature.highlighted ? 'font-medium text-gray-900' : 'text-gray-600'
              )}
            >
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <div className="mt-8">
        <button
          onClick={() => !currentPlan && onSelect?.(plan)}
          disabled={currentPlan || isLoading}
          className={cn(
            'w-full rounded-lg py-3 text-center font-semibold transition-all',
            currentPlan
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
              : isPopular
              ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-md hover:shadow-lg'
              : 'bg-gray-900 text-white hover:bg-gray-800'
          )}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing...
            </span>
          ) : currentPlan ? (
            'Current Plan'
          ) : (
            'Select Plan'
          )}
        </button>
      </div>

      {/* Trial info */}
      {plan.trialDays > 0 && !currentPlan && (
        <p className="mt-3 text-center text-sm text-gray-500">
          {plan.trialDays} day free trial included
        </p>
      )}
    </div>
  );
}

export default PlanCard;