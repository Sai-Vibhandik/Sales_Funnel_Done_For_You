// import { useState, useEffect } from 'react';
// import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from 'zod';
// import { toast } from 'sonner';
// import { useAuth } from '@/context/AuthContext';
// import organizationService from '@/services/organizationService';
// import { Button, Input, Card, CardBody, Spinner } from '@/components/ui';
// import { CheckoutModal } from '@/components/billing';
// import { Check, ArrowLeft, CreditCard } from 'lucide-react';
// import { Link } from 'react-router-dom';

// const organizationSchema = z.object({
//   name: z.string().min(2, 'Organization name must be at least 2 characters').max(100, 'Organization name too long'),
//   description: z.string().max(500, 'Description too long').optional(),
// });

// export default function OnboardingPage() {
//   const [loading, setLoading] = useState(false);
//   const [selectedPlan, setSelectedPlan] = useState(null);
//   const [planLoading, setPlanLoading] = useState(true);
//   const [showCheckout, setShowCheckout] = useState(false);
//   const [organizationData, setOrganizationData] = useState(null);
//   const { user } = useAuth();
//   const navigate = useNavigate();
//   const location = useLocation();
//   const [searchParams] = useSearchParams();

//   const {
//     register,
//     handleSubmit,
//     formState: { errors },
//   } = useForm({
//     resolver: zodResolver(organizationSchema),
//     defaultValues: {
//       name: '',
//       description: '',
//     },
//   });

//   useEffect(() => {
//     // Check if a plan was passed from registration (via navigate state)
//     if (location.state?.selectedPlan) {
//       setSelectedPlan(location.state.selectedPlan);
//       setPlanLoading(false);
//       return;
//     }

//     // Check sessionStorage for plan data (survives redirects)
//     const storedPlan = sessionStorage.getItem('selectedPlan');
//     if (storedPlan) {
//       try {
//         const planData = JSON.parse(storedPlan);
//         setSelectedPlan(planData);
//         sessionStorage.removeItem('selectedPlan'); // Clean up
//         setPlanLoading(false);
//         return;
//       } catch (e) {
//         console.error('Failed to parse stored plan:', e);
//       }
//     }

//     // Check if plan is passed via URL params (for authenticated users without org)
//     const planIdFromUrl = searchParams.get('plan');
//     const cycleFromUrl = searchParams.get('cycle');

//     if (planIdFromUrl) {
//       // Fetch plan details from API
//       const fetchPlan = async () => {
//         try {
//           const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/plans/public/${planIdFromUrl}`);
//           const data = await response.json();
//           if (data.success && data.data) {
//             const plan = data.data;
//             setSelectedPlan({
//               id: plan._id,
//               _id: plan._id,
//               name: plan.displayName || plan.name,
//               slug: plan.slug,
//               tier: plan.tier,
//               monthlyPrice: plan.monthlyPrice,
//               yearlyPrice: plan.yearlyPrice,
//               price: cycleFromUrl === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice,
//               billingCycle: cycleFromUrl || 'monthly',
//               currency: plan.currency,
//               limits: plan.limits,
//               features: plan.features,
//             });
//           }
//         } catch (error) {
//           console.error('Failed to fetch plan:', error);
//         } finally {
//           setPlanLoading(false);
//         }
//       };
//       fetchPlan();
//     } else {
//       setPlanLoading(false);
//     }
//   }, [location.state, searchParams]);

//   // Check if plan is paid (requires payment)
//   const isPaidPlan = selectedPlan && (
//     (typeof selectedPlan.monthlyPrice === 'number' && selectedPlan.monthlyPrice > 0) ||
//     (typeof selectedPlan.yearlyPrice === 'number' && selectedPlan.yearlyPrice > 0)
//   );

//   const handleCreateOrganization = async (data) => {
//     // ============================================
//     // PAYMENT CHECKOUT - TEMPORARILY DISABLED FOR TESTING
//     // TODO: Re-enable when Razorpay/Stripe APIs are configured
//     // ============================================
//     // if (isPaidPlan) {
//     //   setOrganizationData(data);
//     //   setShowCheckout(true);
//     //   return;
//     // }

//     // Create organization directly (payment verification disabled for testing)
//     await createOrganization(data);
//   };

//   const createOrganization = async (data, paymentData = null) => {
//     setLoading(true);
//     try {
//       const payload = {
//         name: data.name,
//         description: data.description,
//         planId: selectedPlan?.id || selectedPlan?._id || null,
//         planName: selectedPlan?.name || 'Free',
//         billingCycle: selectedPlan?.billingCycle || 'monthly',
//       };

//       // Include payment data if available (for paid plans)
//       if (paymentData) {
//         payload.payment = {
//           orderId: paymentData.razorpay_order_id || paymentData.orderId,
//           paymentId: paymentData.razorpay_payment_id || paymentData.paymentId,
//           signature: paymentData.razorpay_signature || paymentData.signature,
//           provider: 'razorpay', // Default to razorpay for now
//         };
//       }

//       const response = await organizationService.createOrganization(payload);

//       if (response && response.success) {
//         toast.success('Organization created successfully! Redirecting...');
//         localStorage.removeItem('user');
//         sessionStorage.removeItem('selectedPlan'); // Clean up
//         setTimeout(() => {
//           window.location.href = '/';
//         }, 1000);
//       } else {
//         toast.error(response?.message || 'Failed to create organization');
//         setLoading(false);
//       }
//     } catch (error) {
//       console.error('Organization creation error:', error);
//       const errorMessage = error?.message || 'Failed to create organization';
//       toast.error(errorMessage);
//       setLoading(false);
//     }
//   };

//   const handleCheckoutSuccess = async (paymentData) => {
//     // Payment successful - now create the organization
//     setShowCheckout(false);
//     toast.success('Payment successful! Creating your organization...');

//     if (organizationData) {
//       await createOrganization(organizationData, paymentData);
//     }
//   };

//   const handleCheckoutCancel = () => {
//     setShowCheckout(false);
//     setOrganizationData(null);
//   };

//   if (planLoading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center">
//         <Spinner size="lg" />
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50">
//       {/* Header */}
//       <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
//         <div className="max-w-4xl mx-auto px-4 py-3">
//           <div className="flex items-center gap-2">
//             <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
//               <span className="text-white font-bold text-sm">GV</span>
//             </div>
//             <span className="font-semibold text-gray-900">Growth Valley</span>
//           </div>
//         </div>
//       </div>

//       <div className="pt-20 pb-12 px-4">
//         <div className="max-w-lg mx-auto">
//           <Card>
//             <CardBody className="p-8">
//               <div className="text-center mb-6">
//                 <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Organization</h2>
//                 <p className="text-gray-600">This will be your agency's workspace name</p>
//               </div>

//               {/* Selected Plan Summary */}
//               {selectedPlan && (
//                 <div className="bg-primary-50 rounded-lg p-4 mb-6">
//                   <div className="flex items-center justify-between">
//                     <div>
//                       <p className="text-sm text-gray-600">Selected Plan</p>
//                       <p className="font-semibold text-primary-600">{selectedPlan.name}</p>
//                       {selectedPlan.monthlyPrice > 0 && (
//                         <p className="text-sm text-gray-500">
//                           {selectedPlan.currency?.symbol || '₹'}{selectedPlan.price}/{selectedPlan.billingCycle === 'monthly' ? 'month' : 'year'}
//                         </p>
//                       )}
//                       {selectedPlan.monthlyPrice === 0 && (
//                         <p className="text-sm text-green-600 font-medium">Free Plan</p>
//                       )}
//                     </div>
//                     <Link
//                       to="/"
//                       className="text-sm text-primary-600 hover:text-primary-700 font-medium"
//                     >
//                       Change Plan
//                     </Link>
//                   </div>
//                 </div>
//               )}

//               {/* Payment Required Notice for Paid Plans - TEMPORARILY DISABLED */}
//               {/* {isPaidPlan && !showCheckout && (
//                 <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
//                   <div className="flex items-start gap-3">
//                     <CreditCard className="h-5 w-5 text-amber-600 mt-0.5" />
//                     <div>
//                       <p className="font-medium text-amber-800">Payment Required</p>
//                       <p className="text-sm text-amber-700 mt-1">
//                         This plan requires payment. After entering your organization name,
//                         you'll be prompted to complete payment before your organization is created.
//                       </p>
//                     </div>
//                   </div>
//                 </div>
//               )} */}

//               <form onSubmit={handleSubmit(handleCreateOrganization)} className="space-y-4">
//                 <Input
//                   label="Organization Name"
//                   placeholder="e.g., Acme Marketing Agency"
//                   error={errors.name?.message}
//                   {...register('name')}
//                 />

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">
//                     Description (Optional)
//                   </label>
//                   <textarea
//                     placeholder="Brief description of your organization"
//                     rows={3}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
//                     {...register('description')}
//                   />
//                   {errors.description && (
//                     <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
//                   )}
//                 </div>

//                 <Button
//                   type="submit"
//                   className="w-full"
//                   size="lg"
//                   loading={loading}
//                 >
//                   Create Organization
//                 </Button>
//               </form>

//               {/* Free Plan Option - TEMPORARILY DISABLED */}
//               {/* {isPaidPlan && (
//                 <div className="mt-4 text-center">
//                   <p className="text-sm text-gray-500">
//                     Not ready to pay?{' '}
//                     <Link
//                       to="/onboarding"
//                       className="text-primary-600 hover:text-primary-700 font-medium"
//                     >
//                       Start with Free Plan
//                     </Link>
//                   </p>
//                 </div>
//               )} */}
//             </CardBody>
//           </Card>
//         </div>
//       </div>

//       {/* Checkout Modal */}
//       {selectedPlan && (
//         <CheckoutModal
//           isOpen={showCheckout}
//           onClose={() => setShowCheckout(false)}
//           plan={selectedPlan}
//           billingPeriod={selectedPlan.billingCycle || 'monthly'}
//           organization={{ name: organizationData?.name, owner: user }}
//           onSuccess={handleCheckoutSuccess}
//           onCancel={handleCheckoutCancel}
//         />
//       )}
//     </div>
//   );
// }



import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import organizationService from '@/services/organizationService';
import { createPaymentT3, verifyPaymentT3 } from '@/services/drMamataPaymentService';
import { Button, Input, Card, CardBody, Spinner } from '@/components/ui';
import { CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

const organizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(100, 'Too long'),

  description: z.string().max(500, 'Description too long').optional(),

  email: z.string().email('Enter a valid email'),

  mobile: z.string()
    .min(10, 'Mobile number must be at least 10 digits')
    .max(12, 'Mobile number must be at most 12 digits')
    .regex(/^[0-9]+$/, 'Mobile number must contain only digits'),

  address: z.string().min(1, 'Address is required'),

  city: z.string().min(1, 'City is required'),

  state: z.string().min(1, 'State is required'),

  pincode: z.string()
    .length(6, 'Pincode must be exactly 6 digits')
    .regex(/^[0-9]+$/, 'Pincode must contain only digits'),
});

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(true);
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

 const {
  register,
  handleSubmit,
  setValue,
  formState: { errors },
} = useForm({
  resolver: zodResolver(organizationSchema),
  defaultValues: {
    name: '',
    description: '',
    email: '',
    mobile: '', // ✅ FIXED (was phone)
    address: '',
    city: '',
    state: '',
    pincode: '',
  },
});

  useEffect(() => {
    if (user?.email) setValue('email', user.email);
    if (user?.phone || user?.mobile) setValue('phone', user.phone || user.mobile || '');
  }, [user]);

  // ─── Load plan ──────────────────────────────────────────────────────────────
  // Priority: location.state → sessionStorage → localStorage → URL params
  useEffect(() => {
    // 1. Passed directly via navigate(state)
    if (location.state?.selectedPlan) {
      setSelectedPlan(location.state.selectedPlan);
      setPlanLoading(false);
      return;
    }
  // 2. sessionStorage (legacy path)
    const storedPlanSession = sessionStorage.getItem('selectedPlan');
    if (storedPlanSession) {
      try {
        setSelectedPlan(JSON.parse(storedPlanSession));
        sessionStorage.removeItem('selectedPlan');
        setPlanLoading(false);
        return;
      } catch (e) { console.error(e); }
    }

    // 3. localStorage — set by CheckoutModal before redirecting to /register
    const storedPlanLocal = localStorage.getItem('selectedPlan');
    if (storedPlanLocal) {
      try {
        const parsed = JSON.parse(storedPlanLocal);
        setSelectedPlan(parsed);
        localStorage.removeItem('selectedPlan'); // clean up after reading
        setPlanLoading(false);
        return;
      } catch (e) { console.error(e); }
    }

    // 4. URL params (?plan=xxx&cycle=monthly)
    const planIdFromUrl = searchParams.get('plan');
    const cycleFromUrl = searchParams.get('cycle');
    if (planIdFromUrl) {
      (async () => {
        try {
          const res = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/plans/public/${planIdFromUrl}`
          );
          const data = await res.json();
          if (data.success && data.data) {
            const plan = data.data;
            setSelectedPlan({
              id: plan._id, _id: plan._id,
              name: plan.displayName || plan.name,
              slug: plan.slug, tier: plan.tier,
              monthlyPrice: plan.monthlyPrice,
              yearlyPrice: plan.yearlyPrice,
              price: cycleFromUrl === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice,
              billingCycle: cycleFromUrl || 'monthly',
              currency: plan.currency,
              limits: plan.limits, features: plan.features,
            });
          }
        } catch (err) {
          console.error('Failed to fetch plan:', err);
        } finally {
          setPlanLoading(false);
        }
      })();
    } else {
      setPlanLoading(false);
    }
  }, [location.state, searchParams]);
const handleNumericInput = (e) => {
  let value = e.target.value.replace(/\D/g, ''); // remove non-digits
  value = value.slice(0, 12); // max 12 digits
  e.target.value = value;
};
  const planPrice = Number(
    selectedPlan?.price ?? selectedPlan?.monthlyPrice ?? selectedPlan?.yearlyPrice ?? selectedPlan?.amount ?? 0
  );
  const isPaidPlan = selectedPlan != null && planPrice > 0;

  // ─── Create org ─────────────────────────────────────────────────────────────
  const createOrganization = async (formData) => {
    const response = await organizationService.createOrganization({
      name: formData.name,
      description: formData.description,
      planId: selectedPlan?.id || selectedPlan?._id || null,
      planName: selectedPlan?.name || 'Free',
    });
    if (response?.success) {
      toast.success('Organization created successfully! Redirecting...');
      localStorage.removeItem('user');
      setTimeout(() => { window.location.href = '/'; }, 1000);
    } else {
      throw new Error(response?.message || 'Failed to create organization');
    }
  };

  // ─── Submit ──────────────────────────────────────────────────────────────────
  const handleCreateOrganization = async (formData) => {
    setLoading(true);
    try {
      // FREE plan — skip payment
      if (!isPaidPlan) {
        await createOrganization(formData);
        return;
      }

      // PAID plan — load Razorpay SDK
      const sdkLoaded = await loadRazorpay();
      if (!sdkLoaded) {
        toast.error('Razorpay SDK failed to load. Check your internet connection.');
        setLoading(false);
        return;
      }

      // Build payload for drMamataPaymentService
      // const payload = {
      //   name:              formData.name,
      //   email:             formData.email,
      //   mobile:            formData.phone,
      //   address:           formData.address,
      //   city:              formData.city,
      //   state:             formData.state,
      //   pincode:           formData.pincode,
      //   country:           'India',
      //   plan_name:         selectedPlan?.name || 'Plan',
      //   amount:            planPrice.toString(),
      //   organization_name: formData.name,
      //   coupon_code:       null,
      // };
const payload = {
  name: formData.name,
  email: formData.email,
  mobile: formData.mobile,

  address: formData.address,
  city: formData.city,
  state: formData.state,
  pincode: formData.pincode,
  country: "India",

  // 🔥 REQUIRED FORMAT (IMPORTANT)
  book_type: "ebook",

  book_quantity: {
    ebook: 1,
    hardcopy: 0,
  },

  book_code: [selectedPlan._id],

  items: [
    {
      book_type: "e-book",
      book_name: selectedPlan.name,
      book_code: selectedPlan._id,
      quantity: 1,
      book_price: planPrice.toString(),
      currency: "INR",
      book_link: null,
    },
  ],

  book_name: selectedPlan.name,
  book_amount: planPrice.toString(),

  currency: "INR",
  coupon_code: null,

  // optional but useful
  reason: "saas_plan",
};
      console.log('🔵 createPaymentT3 payload:', payload);

      const orderData = await createPaymentT3(payload);
      console.log('🟢 createPaymentT3 response:', orderData);

      if (!orderData?.success) {
        toast.error(`Payment init failed: ${orderData?.message || 'Unknown error'}`);
        setLoading(false);
        return;
      }

      if (!orderData.key || !orderData.order_id || !orderData.amount) {
        toast.error('Incomplete response from payment server. Check console.');
        setLoading(false);
        return;
      }

      // Open Razorpay checkout
      const rzp = new window.Razorpay({
        key:         orderData.key,
        amount:      orderData.amount,
        currency:    orderData.currency || 'INR',
        // name:        'Dr Mamata Jain',
        description: selectedPlan?.name || 'Plan Purchase',
        order_id:    orderData.order_id,

        handler: async (response) => {
          try {
            toast.loading('Verifying payment...');
            const verifyData = await verifyPaymentT3({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              gateway:             'razorpay',
            });
            if (!verifyData?.success) throw new Error(verifyData?.message || 'Verification failed');
            toast.success('Payment verified! Creating your organization...');

            // Save payment to local database and create organization
            const token = localStorage.getItem('token');
            const saveRes = await fetch(`${API_URL}/payments/complete`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                userId: user?._id || null,
                selectedPlan: selectedPlan,
                organizationData: {
                  name: formData.name,
                  description: formData.description,
                  email: formData.email,
                  phone: formData.phone,
                  address: formData.address,
                  city: formData.city,
                  state: formData.state,
                  pincode: formData.pincode,
                },
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const saveData = await saveRes.json();
            if (!saveData.success) {
              console.error('Failed to save payment:', saveData);
              throw new Error('Payment saved to external server but failed to store locally. Please contact support.');
            }

            toast.success('Organization created successfully! Redirecting...');
            localStorage.removeItem('user');
            setTimeout(() => { window.location.href = '/'; }, 1000);
          } catch (err) {
            toast.error(err.message || 'Payment verification failed.');
            setLoading(false);
          }
        },

        modal: {
          ondismiss: () => {
            toast.error('Payment was cancelled.');
            setLoading(false);
          },
        },

        prefill: {
          name:    formData.name,
          email:   formData.email,
          contact: formData.phone,
        },

        theme: { color: '#3399cc' },
      });

      rzp.on('payment.failed', (response) => {
        toast.error(`Payment failed: ${response.error.description}`);
        setLoading(false);
      });

      rzp.open();

    } catch (err) {
      console.error('❌ Error:', err);
      toast.error(err.message || 'Something went wrong.');
      setLoading(false);
    }
  };

  if (planLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">GV</span>
            </div>
            <span className="font-semibold text-gray-900">Growth Valley</span>
          </div>
        </div>
      </div>

      <div className="pt-20 pb-12 px-4">
        <div className="max-w-lg mx-auto">
          <Card>
            <CardBody className="p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Organization</h2>
                <p className="text-gray-600">This will be your agency's workspace name</p>
              </div>

              {/* Plan summary */}
              {selectedPlan ? (
                <div className="bg-primary-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Selected Plan</p>
                      <p className="font-semibold text-primary-600">{selectedPlan.name}</p>
                      {isPaidPlan
                        ? <p className="text-sm text-gray-500">₹{planPrice}/{selectedPlan.billingCycle === 'monthly' ? 'month' : 'year'}</p>
                        : <p className="text-sm text-green-600 font-medium">Free Plan</p>
                      }
                    </div>
                    <Link to="/" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                      Change Plan
                    </Link>
                  </div>
                </div>
              ) : (
                // No plan detected — nudge user to go pick one
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-yellow-800">
                    No plan selected. You'll be set up on the <strong>Free plan</strong>.{' '}
                    <Link to="/" className="underline font-medium">Choose a paid plan</Link> if you'd like more features.
                  </p>
                </div>
              )}

              {isPaidPlan && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">Payment Required — ₹{planPrice}</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Fill in the details below. Razorpay will open when you click the button.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit(handleCreateOrganization)} className="space-y-4">

                <Input
                  label="Organization Name"
                  placeholder="e.g., Acme Marketing Agency"
                  error={errors.name?.message}
                  {...register('name')}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <textarea
                    placeholder="Brief description of your organization"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    {...register('description')}
                  />
                  {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>}
                </div>

                {/* Billing details — only shown for paid plans */}
                {isPaidPlan && (
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">Billing Details</p>
                    <div className="space-y-3">
                      <Input
                        label="Email *"
                        type="email"
                        placeholder="you@example.com"
                        error={errors.email?.message}
                        {...register('email')}
                      />
                     <Input
  label="Mobile *"
  type="tel"
  inputMode="numeric"
  pattern="[0-9]*"
  maxLength={12}
  placeholder="Enter 10-12 digits"
  error={errors.mobile?.message}
  {...register('mobile')}
  onInput={(e) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.slice(0, 12);
    e.target.value = value;
  }}
  onPaste={(e) => {
    const pasted = e.clipboardData.getData('text');
    if (!/^\d+$/.test(pasted)) {
      e.preventDefault();
    }
  }}
/>
                      <Input
                        label="Address *"
                        placeholder="Street address"
                        error={errors.address?.message}
                        {...register('address')}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="City *"
                          placeholder="City"
                          error={errors.city?.message}
                          {...register('city')}
                        />
                        <Input
                          label="State *"
                          placeholder="State"
                          error={errors.state?.message}
                          {...register('state')}
                        />
                      </div>
                      <Input
                        label="Pincode *"
                        placeholder="6-digit pincode"
                        error={errors.pincode?.message}
                        {...register('pincode')}
                      />
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg" loading={loading}>
                  {isPaidPlan ? `Pay ₹${planPrice} & Create Organization` : 'Create Organization'}
                </Button>
              </form>

              {isPaidPlan && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">
                    Not ready to pay?{' '}
                    <Link to="/onboarding" className="text-primary-600 hover:text-primary-700 font-medium">
                      Start with Free Plan
                    </Link>
                  </p>
                </div>
              )}

            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}