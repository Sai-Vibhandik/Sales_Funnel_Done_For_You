import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, CheckCircle, AlertCircle, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import billingService, { formatCurrency } from '@/services/billingService';

/**
 * Checkout Modal Component
 *
 * Handles checkout flow for both Stripe and Razorpay payment gateways.
 * Uses modal/overlay approach for seamless UX.
 */
export function CheckoutModal({
  isOpen,
  onClose,
  plan,
  billingPeriod = 'monthly',
  organization,
  onSuccess,
  onCancel
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, loading, success, error

  // Provider preference - can be 'stripe' or 'razorpay'
  const [provider, setProvider] = useState('stripe');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setError(null);
      setCheckoutData(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  // Initialize checkout when modal opens
  const initializeCheckout = useCallback(async () => {
    if (!plan || !isOpen) return;

    setIsLoading(true);
    setError(null);

    try {
      // Use createInitialCheckout if no organization (for new users during onboarding)
      // Use createCheckout if organization exists (for existing org admins)
      const hasOrganization = organization && organization._id;

      const checkoutFn = hasOrganization
        ? billingService.createCheckout
        : billingService.createInitialCheckout;

      const result = await checkoutFn({
        planId: plan._id || plan.id,
        billingPeriod,
        provider
      });

      setCheckoutData(result.data);

      if (result.data.provider === 'stripe') {
        // Redirect to Stripe checkout
        if (result.data.url) {
          window.location.href = result.data.url;
        }
      } else if (result.data.provider === 'razorpay') {
        // Initialize Razorpay checkout
        initializeRazorpay(result.data);
      }

      setStatus('loading');
    } catch (err) {
      setError(err.message || 'Failed to initialize checkout');
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [plan, billingPeriod, provider, isOpen, organization]);

  // Initialize Razorpay checkout
  const initializeRazorpay = (data) => {
    // Check if Razorpay script is loaded
    if (!window.Razorpay) {
      loadRazorpayScript().then(() => {
        openRazorpayCheckout(data);
      });
    } else {
      openRazorpayCheckout(data);
    }
  };

  // Load Razorpay script
  const loadRazorpayScript = () => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  };

  // Open Razorpay checkout
  const openRazorpayCheckout = (data) => {
    const options = {
      key: data.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: data.amount,
      currency: data.currency || 'INR',
      name: organization?.name || 'Subscription',
      description: `${plan.name} - ${billingPeriod}ly`,
      order_id: data.orderId,
      handler: async (response) => {
        // Payment successful
        setStatus('success');
        onSuccess?.(response);
      },
      prefill: data.prefill || {},
      theme: {
        color: '#6366f1'
      },
      modal: {
        ondismiss: () => {
          setStatus('idle');
          onCancel?.();
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (response) => {
      setError(response.error.description || 'Payment failed');
      setStatus('error');
    });
    rzp.open();
  };

  // Handle manual Stripe checkout
  const handleStripeCheckout = () => {
    initializeCheckout();
  };

  // Handle Razorpay checkout
  const handleRazorpayCheckout = () => {
    initializeCheckout();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md transform rounded-2xl bg-white p-6 shadow-xl transition-all">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
              <CreditCard className="h-6 w-6 text-primary-600" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              {status === 'success' ? 'Payment Successful!' :
               status === 'error' ? 'Payment Failed' :
               'Complete Your Subscription'}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {status === 'success' ? 'Your subscription has been activated' :
               status === 'error' ? 'There was an issue with your payment' :
               `Subscribe to ${plan?.name} plan`}
            </p>
          </div>

          {/* Plan Summary */}
          {plan && status === 'idle' && (
            <div className="mt-6 rounded-lg bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{plan.name}</p>
                  <p className="text-sm text-gray-500">
                    {billingPeriod === 'yearly' ? 'Billed yearly' : 'Billed monthly'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(
                      billingPeriod === 'yearly' && plan.yearlyPrice
                        ? plan.yearlyPrice
                        : plan.monthlyPrice,
                      plan.currency?.code || 'USD'
                    )}
                  </p>
                  {billingPeriod === 'yearly' && plan.yearlyDiscount > 0 && (
                    <p className="text-xs text-green-600">
                      Save {plan.yearlyDiscount}%
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Provider Selection */}
          {status === 'idle' && (
            <div className="mt-6 space-y-4">
              <p className="text-sm font-medium text-gray-700">Select Payment Method</p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setProvider('stripe')}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg border-2 p-3 transition-all',
                    provider === 'stripe'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <svg className="h-6 w-8" viewBox="0 0 32 24" fill="none">
                    <path
                      d="M4 4a4 4 0 014-4h20a4 4 0 014 4v16a4 4 0 01-4 4H8a4 4 0 01-4-4V4z"
                      fill="#635BFF"
                    />
                    <path
                      d="M15.5 8.5c0-.828.672-1.5 1.5-1.5h2c.828 0 1.5.672 1.5 1.5v.5h-5v-.5z"
                      fill="#fff"
                    />
                    <path
                      d="M14 11a2 2 0 100 4h4a1 1 0 110 2h-5v2h5a2 2 0 100-4h-4a1 1 0 110-2h5V9h-5v2z"
                      fill="#fff"
                    />
                  </svg>
                  <span className="font-medium">Credit Card</span>
                </button>

                <button
                  onClick={() => setProvider('razorpay')}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg border-2 p-3 transition-all',
                    provider === 'razorpay'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <svg className="h-6 w-6" viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="14" fill="#528FF0"/>
                    <path d="M10 16l4 4 8-8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span className="font-medium">UPI/Netbanking</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Success Message */}
          {status === 'success' && (
            <div className="mt-6 flex items-center justify-center">
              <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                <CheckCircle className="h-4 w-4" />
                Payment completed successfully
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6">
            {status === 'idle' && (
              <button
                onClick={initializeCheckout}
                disabled={isLoading}
                className={cn(
                  'w-full rounded-lg py-3 font-semibold text-white transition-all',
                  isLoading
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700'
                )}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  `Pay ${formatCurrency(
                    billingPeriod === 'yearly' && plan?.yearlyPrice
                      ? plan.yearlyPrice
                      : plan?.monthlyPrice || 0,
                    plan?.currency?.code || 'USD'
                  )}`
                )}
              </button>
            )}

            {status === 'error' && (
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-gray-300 py-2 font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={initializeCheckout}
                  className="flex-1 rounded-lg bg-primary-600 py-2 font-medium text-white hover:bg-primary-700"
                >
                  Try Again
                </button>
              </div>
            )}

            {status === 'success' && (
              <button
                onClick={onClose}
                className="w-full rounded-lg bg-green-600 py-3 font-semibold text-white hover:bg-green-700"
              >
                Done
              </button>
            )}
          </div>

          {/* Terms */}
          {status === 'idle' && (
            <p className="mt-4 text-center text-xs text-gray-500">
              By subscribing, you agree to our Terms of Service and Privacy Policy.
              Your subscription will auto-renew {billingPeriod === 'yearly' ? 'yearly' : 'monthly'}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default CheckoutModal;