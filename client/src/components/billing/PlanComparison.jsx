import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

/**
 * Plan Comparison Table Component
 *
 * Displays a side-by-side comparison of plan features.
 */
export function PlanComparison({
  plans = [],
  currentPlan = null,
  onSelectPlan,
  billingPeriod = 'monthly'
}) {
  if (!plans.length) return null;

  // Get all unique features across all plans
  const allFeatures = [
    { key: 'maxUsers', label: 'Team Members', type: 'limit' },
    { key: 'maxProjects', label: 'Projects', type: 'limit' },
    { key: 'maxLandingPages', label: 'Landing Pages', type: 'limit' },
    { key: 'storageLimitMB', label: 'Storage', type: 'storage' },
    { key: 'aiCallsPerMonth', label: 'AI Calls/month', type: 'limit' },
    { key: 'customDomains', label: 'Custom Domains', type: 'limit' },
    { key: 'analytics', label: 'Advanced Analytics', type: 'boolean' },
    { key: 'whiteLabel', label: 'White-label Branding', type: 'boolean' },
    { key: 'prioritySupport', label: 'Priority Support', type: 'boolean' },
    { key: 'customDomain', label: 'Custom Domain', type: 'boolean' },
    { key: 'exportData', label: 'Export Data', type: 'boolean' },
    { key: 'apiAccess', label: 'API Access', type: 'boolean' },
    { key: 'sso', label: 'SSO Integration', type: 'boolean' },
    { key: 'advancedReports', label: 'Advanced Reports', type: 'boolean' },
    { key: 'teamRoles', label: 'Team Roles', type: 'boolean' },
    { key: 'auditLogs', label: 'Audit Logs', type: 'boolean' }
  ];

  // Format limit values
  const formatLimit = (value, type) => {
    if (value === -1 || value === undefined) return 'Unlimited';
    if (type === 'storage') {
      return value >= 1024 ? `${value / 1024} GB` : `${value} MB`;
    }
    return value.toLocaleString();
  };

  // Format price
  const formatPrice = (plan) => {
    const price = billingPeriod === 'yearly' && plan.yearlyPrice
      ? plan.yearlyPrice
      : plan.monthlyPrice;
    return plan.monthlyPrice === 0 ? 'Free' : `$${(price / 100).toFixed(2)}`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px]">
        <thead>
          <tr>
            <th className="p-4 text-left text-sm font-medium text-gray-500">
              Features
            </th>
            {plans.map((plan) => (
              <th
                key={plan._id || plan.id}
                className={cn(
                  'p-4 text-center',
                  currentPlan === plan.slug && 'bg-primary-50'
                )}
              >
                <div className="space-y-1">
                  <div className="font-semibold text-gray-900">{plan.name}</div>
                  <div className="text-sm text-gray-500">
                    {formatPrice(plan)}
                    {plan.monthlyPrice > 0 && (
                      <span className="text-xs">
                        /{billingPeriod === 'yearly' ? 'year' : 'month'}
                      </span>
                    )}
                  </div>
                  {currentPlan === plan.slug && (
                    <span className="inline-block rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                      Current
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {/* Limits Section */}
          {allFeatures
            .filter(f => f.type === 'limit' || f.type === 'storage')
            .map((feature) => (
              <tr key={feature.key} className="hover:bg-gray-50">
                <td className="p-4 text-sm text-gray-700">
                  {feature.label}
                </td>
                {plans.map((plan) => (
                  <td
                    key={plan._id || plan.id}
                    className={cn(
                      'p-4 text-center',
                      currentPlan === plan.slug && 'bg-primary-50/50'
                    )}
                  >
                    <span className="text-sm font-medium text-gray-900">
                      {formatLimit(
                        plan.limits?.[feature.key],
                        feature.type
                      )}
                    </span>
                  </td>
                ))}
              </tr>
            ))}

          {/* Features Section */}
          {allFeatures
            .filter(f => f.type === 'boolean')
            .map((feature) => (
              <tr key={feature.key} className="hover:bg-gray-50">
                <td className="p-4 text-sm text-gray-700">
                  {feature.label}
                </td>
                {plans.map((plan) => (
                  <td
                    key={plan._id || plan.id}
                    className={cn(
                      'p-4 text-center',
                      currentPlan === plan.slug && 'bg-primary-50/50'
                    )}
                  >
                    {plan.features?.[feature.key] ? (
                      <span className="inline-flex items-center justify-center rounded-full bg-green-100 p-1">
                        <Check className="h-4 w-4 text-green-600" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center rounded-full bg-gray-100 p-1">
                        <X className="h-4 w-4 text-gray-400" />
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}

          {/* Action Row */}
          <tr>
            <td className="p-4"></td>
            {plans.map((plan) => (
              <td
                key={plan._id || plan.id}
                className={cn(
                  'p-4 text-center',
                  currentPlan === plan.slug && 'bg-primary-50/50'
                )}
              >
                {currentPlan === plan.slug ? (
                  <span className="inline-block rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-500">
                    Current Plan
                  </span>
                ) : (
                  <button
                    onClick={() => onSelectPlan?.(plan)}
                    className={cn(
                      'inline-block rounded-lg px-4 py-2 text-sm font-semibold transition-all',
                      plan.tier === 'free'
                        ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    )}
                  >
                    {plan.tier === 'free' ? 'Downgrade' : 'Upgrade'}
                  </button>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/**
 * Compact Feature List Component
 *
 * Shows plan features in a compact card format.
 */
export function PlanFeaturesList({ plan, showLimits = true }) {
  const limitFeatures = [
    { key: 'maxUsers', label: 'Team Members' },
    { key: 'maxProjects', label: 'Projects' },
    { key: 'maxLandingPages', label: 'Landing Pages' },
    { key: 'storageLimitMB', label: 'Storage', format: (v) => v >= 1024 ? `${v/1024} GB` : `${v} MB` },
    { key: 'aiCallsPerMonth', label: 'AI Calls/mo' },
  ];

  const booleanFeatures = [
    { key: 'analytics', label: 'Analytics' },
    { key: 'whiteLabel', label: 'White-label' },
    { key: 'prioritySupport', label: 'Priority Support' },
    { key: 'apiAccess', label: 'API Access' },
    { key: 'sso', label: 'SSO' },
  ];

  return (
    <div className="space-y-3">
      {/* Limits */}
      {showLimits && (
        <div className="space-y-1.5">
          {limitFeatures.map(({ key, label, format }) => {
            const value = plan.limits?.[key];
            const displayValue = format ? format(value) : (value === -1 ? 'Unlimited' : value);
            return (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-900">{displayValue}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Boolean Features */}
      <div className="flex flex-wrap gap-2 pt-2">
        {booleanFeatures.map(({ key, label }) => (
          plan.features?.[key] && (
            <span
              key={key}
              className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700"
            >
              {label}
            </span>
          )
        ))}
      </div>
    </div>
  );
}

export default PlanComparison;