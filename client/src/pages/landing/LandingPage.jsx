import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { motion, useAnimation, useInView, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Zap,
  Target,
  TrendingUp,
  Users,
  Clock,
  Star,
  Play,
  Check,
  X,
  Crown,
  Rocket,
  Palette,
  Video,
  FileText,
  BarChart3,
  Shield,
  Cloud,
  Database,
  Layout,
  Settings,
  Smartphone,
  GitBranch,
  Menu,
  X as XClose
} from 'lucide-react';
import growthValleyLogo from '@/assets/growth-valley-logo.webp';
import { Spinner } from '@/components/ui';

export default function LandingPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredPlan, setHoveredPlan] = useState(null);
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasRedirected = useRef(false);

  // Smooth scroll function
  const smoothScrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offsetTop = element.offsetTop - 80; // 80px offset for fixed header
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  };

  // Handle navigation click
  const handleNavClick = (e, sectionId) => {
    e.preventDefault();
    smoothScrollToSection(sectionId);
    // Close mobile menu if open
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  // Redirect authenticated users with organization to dashboard
  useEffect(() => {
    if (!hasRedirected.current && isAuthenticated && !authLoading && user?.currentOrganization) {
      hasRedirected.current = true;
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, user?.currentOrganization, navigate]);

  // Fetch public plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/plans/public`);
        const data = await response.json();
        if (data.success && data.data) {
          setPlans(data.data.filter(p => p.isActive && p.isPublic));
        }
      } catch (error) {
        console.error('Failed to fetch plans:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  // Don't render if loading or if authenticated with organization (will redirect)
  if (authLoading || (isAuthenticated && user?.currentOrganization)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleSelectPlan = (planId) => {
    const selectedPlanData = plans.find(p => p._id === planId);

    if (isAuthenticated && !user?.currentOrganization) {
      if (selectedPlanData) {
        sessionStorage.setItem('selectedPlan', JSON.stringify({
          id: selectedPlanData._id,
          _id: selectedPlanData._id,
          name: selectedPlanData.displayName || selectedPlanData.name,
          slug: selectedPlanData.slug,
          tier: selectedPlanData.tier,
          monthlyPrice: selectedPlanData.monthlyPrice || 0,
          yearlyPrice: selectedPlanData.yearlyPrice || 0,
          price: billingCycle === 'yearly' ? selectedPlanData.yearlyPrice : selectedPlanData.monthlyPrice,
          billingCycle: billingCycle,
          currency: selectedPlanData.currency,
          limits: selectedPlanData.limits,
          features: selectedPlanData.features,
          trialDays: selectedPlanData.trialDays || 0,
        }));
      }
      navigate(`/onboarding?plan=${planId}&cycle=${billingCycle}`);
    } else {
      navigate(`/register?plan=${planId}&cycle=${billingCycle}`);
    }
  };

  const getPlanFeatures = (plan) => {
    const features = [];

    if (plan.features) {
      if (plan.features.analytics) features.push('Advanced Analytics Dashboard');
      if (plan.features.prioritySupport) features.push('24/7 Priority Support');
      if (plan.features.customDomain) features.push('Custom Domain Support');
      if (plan.features.apiAccess) features.push('Full API Access');
      if (plan.features.whiteLabel) features.push('White-label Branding');
      if (plan.features.teamManagement) features.push('Team Management');
      if (plan.features.integrations) features.push('Third-party Integrations');
      if (plan.features.exportData) features.push('Data Export');
      if (plan.features.auditLogs) features.push('Audit Logs');
      if (plan.features.sso) features.push('SSO Integration');
    }

    if (plan.limits) {
      if (plan.limits.maxUsers === -1) {
        features.push('Unlimited Team Members');
      } else if (plan.limits.maxUsers) {
        features.push(`Up to ${plan.limits.maxUsers} Team Members`);
      }
      if (plan.limits.maxProjects === -1) {
        features.push('Unlimited Projects');
      } else if (plan.limits.maxProjects) {
        features.push(`Up to ${plan.limits.maxProjects} Projects`);
      }
      if (plan.limits.storage === -1) {
        features.push('Unlimited Storage');
      } else if (plan.limits.storage) {
        features.push(`${plan.limits.storage}GB Storage`);
      }
      if (plan.limits.apiCalls === -1) {
        features.push('Unlimited API Calls');
      } else if (plan.limits.apiCalls) {
        features.push(`${plan.limits.apiCalls.toLocaleString()} API Calls/month`);
      }
    }

    if (plan.featureList && plan.featureList.length > 0) {
      plan.featureList.forEach(f => {
        if (f.included !== false) {
          features.push(f.name + (f.limit ? ` (${f.limit === -1 ? 'Unlimited' : f.limit})` : ''));
        }
      });
    }

    return features.slice(0, 8);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse animation-delay-4000"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-gray-900/80 backdrop-blur-xl border-b border-gray-800 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center"
            >
              <Link to="/" className="cursor-pointer">
                <img
                  src={growthValleyLogo}
                  alt="Growth Valley"
                  className="h-32 w-auto rounded-lg object-contain"
                />
              </Link>
            </motion.div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <motion.a
                key="features"
                href="#features"
                onClick={(e) => handleNavClick(e, 'features')}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-gray-300 hover:text-white transition relative group cursor-pointer"
              >
                Features
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary-500 transition-all duration-300 group-hover:w-full"></span>
              </motion.a>
              <motion.a
                key="how-it-works"
                href="#how-it-works"
                onClick={(e) => handleNavClick(e, 'how-it-works')}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-gray-300 hover:text-white transition relative group cursor-pointer"
              >
                How it Works
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary-500 transition-all duration-300 group-hover:w-full"></span>
              </motion.a>
              <motion.a
                key="pricing"
                href="#pricing"
                onClick={(e) => handleNavClick(e, 'pricing')}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-gray-300 hover:text-white transition relative group cursor-pointer"
              >
                Pricing
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary-500 transition-all duration-300 group-hover:w-full"></span>
              </motion.a>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Link
                  to="/login"
                  className="text-gray-300 hover:text-white font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition cursor-pointer"
                >
                  Log in
                </Link>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <a
                  href="#pricing"
                  onClick={(e) => handleNavClick(e, 'pricing')}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition shadow-lg shadow-primary-500/25 cursor-pointer"
                >
                  Start Free Trial
                </a>
              </motion.div>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white p-2"
            >
              {mobileMenuOpen ? <XClose className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-gray-900/95 backdrop-blur-xl border-b border-gray-800"
            >
              <div className="px-4 py-4 space-y-3">
                <a
                  href="#features"
                  onClick={(e) => handleNavClick(e, 'features')}
                  className="block text-gray-300 hover:text-white py-2 transition"
                >
                  Features
                </a>
                <a
                  href="#how-it-works"
                  onClick={(e) => handleNavClick(e, 'how-it-works')}
                  className="block text-gray-300 hover:text-white py-2 transition"
                >
                  How it Works
                </a>
                <a
                  href="#pricing"
                  onClick={(e) => handleNavClick(e, 'pricing')}
                  className="block text-gray-300 hover:text-white py-2 transition"
                >
                  Pricing
                </a>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-gray-300 hover:text-white py-2 transition"
                >
                  Log in
                </Link>
                <a
                  href="#pricing"
                  onClick={(e) => handleNavClick(e, 'pricing')}
                  className="block bg-primary-600 text-white px-4 py-2 rounded-lg text-center"
                >
                  Start Free Trial
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, type: 'spring' }}
              className="inline-flex items-center px-4 py-2 bg-primary-500/10 backdrop-blur-sm rounded-full text-primary-400 text-sm font-medium mb-6 border border-primary-500/20"
            >
              <Rocket className="w-4 h-4 mr-2 animate-pulse" />
              Launch Your SaaS in Days, Not Months
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight"
            >
              <span className="text-white">
                All-in-One SaaS Platform
              </span>
              <br />
              <span className="text-primary-500">
                for Modern Businesses
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-6 text-xl text-gray-400 max-w-3xl mx-auto"
            >
              Powerful dashboard, team collaboration, analytics, and automation tools — 
              everything you need to scale your business efficiently.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <a
                  href="#pricing"
                  onClick={(e) => handleNavClick(e, 'pricing')}
                  className="inline-flex items-center justify-center px-8 py-4 bg-primary-600 text-white rounded-lg font-semibold text-lg hover:bg-primary-700 transition shadow-lg shadow-primary-500/25"
                >
                  Start Now
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition" />
                </a>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <a
                  href="#features"
                  onClick={(e) => handleNavClick(e, 'features')}
                  className="inline-flex items-center justify-center px-8 py-4 bg-gray-800 text-white rounded-lg font-semibold text-lg border border-gray-700 hover:bg-gray-750 transition"
                >
                  Watch Demo
                  <Play className="ml-2 w-5 h-5" />
                </a>
              </motion.div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="mt-4 text-sm text-gray-500"
            >
              No credit card required • Cancel anytime
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Everything You Need to Scale
            </h2>
            <p className="mt-4 text-xl text-gray-400">
              Powerful features designed for growing businesses
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 relative bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Get Started in Minutes
            </h2>
            <p className="mt-4 text-xl text-gray-400">
              Simple setup, powerful results
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <StepCard key={index} {...step} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-xl text-gray-400">
              Choose the plan that fits your business
            </p>

            {/* Billing Toggle */}
            <div className="mt-8 flex items-center justify-center">
              <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-white' : 'text-gray-500'}`}>
                Monthly
              </span>
              <motion.button
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                className="mx-4 relative w-14 h-7 bg-gray-700 rounded-full transition-colors hover:bg-gray-600"
                whileTap={{ scale: 0.95 }}
              >
                <motion.span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-primary-600 rounded-full shadow-lg`}
                  animate={{ x: billingCycle === 'yearly' ? 28 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </motion.button>
              <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-white' : 'text-gray-500'}`}>
                Yearly
                <span className="ml-1 text-green-400 font-semibold">Save 17%</span>
              </span>
            </div>
          </motion.div>

          {/* Pricing Cards */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">Plans available soon. Please contact us for pricing.</p>
              <Link
                to="/register"
                className="mt-4 inline-flex items-center text-primary-400 hover:text-primary-300 font-medium"
              >
                Contact Us <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan, index) => (
                <PricingCard
                  key={plan._id}
                  plan={plan}
                  index={index}
                  billingCycle={billingCycle}
                  features={getPlanFeatures(plan)}
                  onSelect={handleSelectPlan}
                  isHovered={hoveredPlan === plan._id}
                  onHover={setHoveredPlan}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Loved by Businesses Worldwide
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard key={index} {...testimonial} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Frequently Asked Questions
            </h2>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <FAQItem key={index} {...faq} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="relative bg-gradient-to-r from-primary-600 to-primary-700 rounded-3xl p-12 text-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to Scale Your Business?
              </h2>
              <p className="text-xl text-primary-100 mb-8">
                Join thousands of businesses using GrowthValley
              </p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <a
                  href="#pricing"
                  onClick={(e) => handleNavClick(e, 'pricing')}
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary-600 rounded-lg font-semibold text-lg hover:bg-gray-100 transition shadow-lg"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </a>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <img
                src={growthValleyLogo}
                alt="Growth Valley"
                className="h-32 w-auto rounded-lg object-contain mb-4"
              />
              <p className="text-sm text-gray-400">
                The all-in-one SaaS platform for modern businesses.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" onClick={(e) => handleNavClick(e, 'features')} className="text-gray-400 hover:text-white transition cursor-pointer">Features</a></li>
                <li><a href="#pricing" onClick={(e) => handleNavClick(e, 'pricing')} className="text-gray-400 hover:text-white transition cursor-pointer">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-white transition">About Us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition">Careers</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-white transition">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition">Terms of Service</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition">Security</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition">GDPR</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} GrowthValley. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Feature Card Component
function FeatureCard({ icon: Icon, title, description, index }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ scale: 1.05, y: -5, transition: { duration: 0.2, ease: 'easeOut' } }}
      className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-primary-500/50"
    >
      <motion.div
        whileHover={{ rotate: 360 }}
        transition={{ duration: 0.5 }}
        className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center mb-4 border border-primary-500/30"
      >
        <Icon className="w-6 h-6 text-primary-400" />
      </motion.div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </motion.div>
  );
}

// Step Card Component
function StepCard({ number, title, description, index }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="text-center"
    >
      <motion.div
        whileHover={{ scale: 1.1, rotate: 360 }}
        transition={{ duration: 0.5 }}
        className="w-20 h-20 bg-primary-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 shadow-lg shadow-primary-500/25"
      >
        {number}
      </motion.div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </motion.div>
  );
}

// Pricing Card Component
function PricingCard({ plan, index, billingCycle, features, onSelect, isHovered, onHover }) {
  const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
  const isPopular = plan.badge?.text || plan.name?.toLowerCase().includes('pro') || plan.name?.toLowerCase().includes('enterprise');
  const planDisplayName = plan.displayName || plan.name;
  const currencySymbol = plan.currency?.symbol || '₹';
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -10, transition: { duration: 0.2, ease: 'easeOut' } }}
      onHoverStart={() => onHover(plan._id)}
      onHoverEnd={() => onHover(null)}
      className={`relative bg-gray-800/50 backdrop-blur-sm rounded-2xl flex flex-col border ${
        isPopular ? 'border-primary-500 shadow-lg shadow-primary-500/25' : 'border-gray-700 hover:border-primary-500/50'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg"
          >
            Most Popular
          </motion.span>
        </div>
      )}

      <div className="p-6 flex-1">
        <div className="text-center mb-4">
          <h3 className="text-xl font-bold text-white">{planDisplayName}</h3>
          {plan.description && (
            <p className="text-gray-400 mt-1 text-sm">{plan.description}</p>
          )}
        </div>

        <div className="text-center mb-6">
          <motion.span
            key={price}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="text-5xl font-bold text-white"
          >
            {price === 0 ? 'Free' : `${currencySymbol}${price}`}
          </motion.span>
          {price > 0 && (
            <span className="text-gray-400">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
          )}
          {billingCycle === 'yearly' && plan.monthlyPrice > 0 && plan.yearlyPrice > 0 && (
            <div className="text-sm text-green-400 font-medium mt-1">
              Save {currencySymbol}{(plan.monthlyPrice * 12) - (plan.yearlyPrice || 0)}/year
            </div>
          )}
        </div>

        <div className="space-y-3 mb-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={isHovered ? { opacity: 1, x: 0 } : { opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center"
            >
              <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
              <span className="text-gray-300 text-sm">{feature}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="p-6 pt-0">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(plan._id)}
          className={`w-full py-3 px-6 rounded-lg font-semibold transition ${
            isPopular
              ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/25'
              : 'bg-gray-700 text-white hover:bg-gray-600'
          }`}
        >
          Start Free Trial
        </motion.button>
      </div>
    </motion.div>
  );
}

// Testimonial Card Component
function TestimonialCard({ name, role, content, index }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -5, transition: { duration: 0.2, ease: 'easeOut' } }}
      className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-primary-500/50"
    >
      <div className="flex items-center gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
        ))}
      </div>
      <p className="text-gray-300 mb-4">{content}</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold">
          {name[0]}
        </div>
        <div>
          <div className="font-semibold text-white">{name}</div>
          <div className="text-sm text-gray-400">{role}</div>
        </div>
      </div>
    </motion.div>
  );
}

// FAQ Item Component
function FAQItem({ question, answer, index }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-6 text-left"
      >
        <span className="text-lg font-medium text-white">{question}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="text-primary-400"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="px-6 pb-6"
          >
            <p className="text-gray-400">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Data arrays
const features = [
  { icon: Layout, title: "Modern Dashboard", description: "Intuitive, customizable dashboard with real-time metrics, KPIs, and beautiful visualizations." },
  { icon: Users, title: "Team Collaboration", description: "Invite team members, set roles & permissions, and collaborate seamlessly in real-time." },
  { icon: BarChart3, title: "Advanced Analytics", description: "Deep insights into user behavior, revenue trends, and business performance metrics." },
  { icon: Cloud, title: "Cloud Storage", description: "Secure, scalable cloud storage for all your business data and files." },
  { icon: Database, title: "Data Management", description: "Powerful data import/export, backup, and management tools." },
  { icon: Shield, title: "Enterprise Security", description: "Bank-level encryption, SSO, 2FA, and compliance with industry standards." },
  { icon: Smartphone, title: "Mobile Ready", description: "Fully responsive design that works perfectly on any device." },
  { icon: Settings, title: "Custom Workflows", description: "Build custom automations and workflows without writing code." },
  { icon: GitBranch, title: "Version Control", description: "Track changes, rollback updates, and maintain audit trails." }
];

const steps = [
  { number: 1, title: "Sign Up Free", description: "Create your account in 30 seconds. No credit card required for the 14-day trial." },
  { number: 2, title: "Set Up Your Workspace", description: "Invite your team, customize settings, and connect your tools." },
  { number: 3, title: "Start Scaling", description: "Access all features, track analytics, and grow your business." }
];

const testimonials = [
  { name: "Sarah Johnson", role: "CEO, TechStartup", content: "GrowthValley has transformed how we manage our business. The analytics and team collaboration features are game-changing." },
  { name: "Michael Chen", role: "CTO, InnovateLabs", content: "The best SaaS platform we've used. Incredible performance, amazing support, and constant updates." },
  { name: "Emily Rodriguez", role: "Product Manager, FutureSoft", content: "Our team productivity increased by 200% after switching to GrowthValley. Highly recommended!" }
];

const faqs = [
  { question: "Do I need a credit card to start the free trial?", answer: "No! You can start your 14-day free trial without providing any payment information. If you love the platform, you can upgrade anytime." },
  { question: "Can I switch plans later?", answer: "Absolutely! You can upgrade, downgrade, or cancel your plan at any time. Changes take effect immediately." },
  { question: "Is my data secure?", answer: "Yes, we use bank-level 256-bit encryption, regular security audits, and comply with GDPR and CCPA regulations." },
  { question: "Do you offer API access?", answer: "Yes, all plans include API access. Higher-tier plans come with increased rate limits and dedicated API support." },
  { question: "What kind of support do you offer?", answer: "All plans include email support. Premium plans include priority support, dedicated account manager, and 24/7 phone support." },
  { question: "Can I bring my existing data?", answer: "Yes! We provide data import tools and migration support to help you seamlessly transition to GrowthValley." }
];