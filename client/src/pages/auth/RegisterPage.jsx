import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Button, Input, Card, CardBody, Spinner } from '@/components/ui';
import { Check, ArrowLeft } from 'lucide-react';
import growthValleyLogo from '@/assets/growth-valley-logo.webp';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get plan from URL
  const planIdFromUrl = searchParams.get('plan');
  const cycleFromUrl = searchParams.get('cycle');

  // Fetch plans on mount
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/plans/public`);
        const data = await response.json();
        if (data.success && data.data) {
          const activePlans = data.data.filter(p => p.isActive && p.isPublic);
          setPlans(activePlans);

          // If plan ID is in URL, auto-select it
          if (planIdFromUrl) {
            const plan = activePlans.find(p => p._id === planIdFromUrl);
            if (plan) {
              setSelectedPlan(plan);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch plans:', error);
      } finally {
        setPlansLoading(false);
      }
    };
    fetchPlans();

    if (cycleFromUrl) {
      setBillingCycle(cycleFromUrl);
    }
  }, [planIdFromUrl, cycleFromUrl]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        role: 'admin',
      });
      toast.success('Account created successfully! Now set up your organization.');

      const planData = selectedPlan ? {
        id: selectedPlan._id,
        _id: selectedPlan._id,
        name: selectedPlan.displayName || selectedPlan.name,
        slug: selectedPlan.slug,
        tier: selectedPlan.tier,
        monthlyPrice: selectedPlan.monthlyPrice || 0,
        yearlyPrice: selectedPlan.yearlyPrice || 0,
        price: billingCycle === 'monthly' ? selectedPlan.monthlyPrice : selectedPlan.yearlyPrice,
        billingCycle: billingCycle,
        currency: selectedPlan.currency,
        limits: selectedPlan.limits,
        features: selectedPlan.features,
        trialDays: selectedPlan.trialDays || 0,
      } : null;

      // Store selected plan in sessionStorage to survive redirects
      if (planData) {
        sessionStorage.setItem('selectedPlan', JSON.stringify(planData));
      }

      // Pass selected plan to onboarding
      navigate('/onboarding', {
        state: {
          selectedPlan: planData
        }
      });
    } catch (error) {
      toast.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to get plan features
  const getPlanFeatures = (plan) => {
    const features = [];
    if (plan.limits) {
      if (plan.limits.maxUsers === -1) features.push('Unlimited Team Members');
      else if (plan.limits.maxUsers) features.push(`Up to ${plan.limits.maxUsers} Team Members`);
      if (plan.limits.maxProjects === -1) features.push('Unlimited Projects');
      else if (plan.limits.maxProjects) features.push(`${plan.limits.maxProjects} Projects`);
    }
    if (plan.features) {
      if (plan.features.prioritySupport) features.push('Priority Support');
      if (plan.features.analytics) features.push('Advanced Analytics');
    }
    if (plan.featureList && plan.featureList.length > 0) {
      plan.featureList.slice(0, 3).forEach(f => {
        if (f.included !== false) {
          features.push(f.name + (f.limit && f.limit !== -1 ? ` (${f.limit})` : ''));
        }
      });
    }
    return features.slice(0, 5);
  };

  // Show loading spinner while fetching plans
  if (plansLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back to Landing */}
        <Link
          to="/"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <div className="text-center mb-8">
          <img
            src={growthValleyLogo}
            alt="Growth Valley"
            className="mx-auto h-16 w-auto rounded-xl object-contain"
          />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Create Your Account</h1>
          <p className="mt-2 text-gray-600">Join Growth Valley and get your dedicated marketing team</p>
        </div>

        {/* If plan selected from landing page, show summary and form directly */}
        {planIdFromUrl && selectedPlan ? (
          <>
            {/* Selected Plan Summary */}
            <Card className="mb-6">
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Selected Plan: {selectedPlan.displayName || selectedPlan.name}</h3>
                    <p className="text-sm text-gray-500">
                      {selectedPlan.currency?.symbol || '₹'}{billingCycle === 'monthly' ? selectedPlan.monthlyPrice : selectedPlan.yearlyPrice} / {billingCycle === 'monthly' ? 'month' : 'year'}
                    </p>
                  </div>
                  <Link
                    to="/"
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    Change Plan
                  </Link>
                </div>
              </CardBody>
            </Card>

            {/* Registration Form */}
            <Card>
              <CardBody className="p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Create your account</h2>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <Input
                    label="Full Name"
                    type="text"
                    placeholder="John Doe"
                    error={errors.name?.message}
                    {...register('name')}
                  />

                  <Input
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    error={errors.email?.message}
                    {...register('email')}
                  />

                  <Input
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    error={errors.password?.message}
                    {...register('password')}
                  />

                  <Input
                    label="Confirm Password"
                    type="password"
                    placeholder="••••••••"
                    error={errors.confirmPassword?.message}
                    {...register('confirmPassword')}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    loading={loading}
                  >
                    Create Account
                  </Button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Sign in
                  </Link>
                </p>
              </CardBody>
            </Card>
          </>
        ) : (
          /* No plan from URL - show plan selection first */
          <>
            {/* Selected Plan Summary */}
            {selectedPlan && (
              <Card className="mb-6">
                <CardBody className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">Selected Plan: {selectedPlan.displayName || selectedPlan.name}</h3>
                      <p className="text-sm text-gray-500">
                        ₹{billingCycle === 'monthly' ? selectedPlan.monthlyPrice : selectedPlan.yearlyPrice} / {billingCycle === 'monthly' ? 'month' : 'year'}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedPlan(null)}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      Change Plan
                    </button>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Plan Selection (if no plan selected) */}
            {!selectedPlan && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose Your Plan</h2>

                {/* Billing Toggle */}
                <div className="flex items-center justify-center mb-6">
                  <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
                    Monthly
                  </span>
                  <button
                    onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                    className="mx-4 relative w-14 h-7 bg-gray-300 rounded-full transition-colors hover:bg-gray-400"
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                        billingCycle === 'yearly' ? 'translate-x-7' : ''
                      }`}
                    />
                  </button>
                  <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
                    Yearly <span className="text-green-600 font-semibold">Save 17%</span>
                  </span>
                </div>

                {/* Plans Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {plans.map((plan) => {
                    const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
                    const isPopular = plan.badge?.text || plan.name?.toLowerCase().includes('pro') || plan.name?.toLowerCase().includes('enterprise');
                    const planDisplayName = plan.displayName || plan.name;

                    return (
                      <div
                        key={plan._id}
                        onClick={() => setSelectedPlan(plan)}
                        className={`relative bg-white rounded-xl p-4 cursor-pointer border-2 transition-all ${
                          isPopular ? 'border-primary-600 ring-2 ring-primary-600/20' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {isPopular && (
                          <span className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full">
                            Popular
                          </span>
                        )}
                        <h3 className="font-semibold text-gray-900">{planDisplayName}</h3>
                        <div className="mt-2">
                          <span className="text-2xl font-bold text-gray-900">
                            {price === 0 ? 'Free' : `${plan.currency?.symbol || '₹'}${price}`}
                          </span>
                          <span className="text-gray-500 text-sm">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                        </div>
                        <div className="mt-3 space-y-1">
                          {getPlanFeatures(plan).map((feature, idx) => (
                            <div key={idx} className="flex items-center text-xs text-gray-600">
                              <Check className="w-3 h-3 text-green-500 mr-1" />
                              {feature}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-center text-sm text-gray-500 mt-4">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            )}

            {/* Registration Form (show after plan selection) */}
            {selectedPlan && (
              <Card>
                <CardBody className="p-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Create your account</h2>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input
                      label="Full Name"
                      type="text"
                      placeholder="John Doe"
                      error={errors.name?.message}
                      {...register('name')}
                    />

                    <Input
                      label="Email"
                      type="email"
                      placeholder="you@example.com"
                      error={errors.email?.message}
                      {...register('email')}
                    />

                    <Input
                      label="Password"
                      type="password"
                      placeholder="••••••••"
                      error={errors.password?.message}
                      {...register('password')}
                    />

                    <Input
                      label="Confirm Password"
                      type="password"
                      placeholder="••••••••"
                      error={errors.confirmPassword?.message}
                      {...register('confirmPassword')}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      loading={loading}
                    >
                      Create Account
                    </Button>
                  </form>

                  <p className="mt-6 text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link
                      to="/login"
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Sign in
                    </Link>
                  </p>
                </CardBody>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}