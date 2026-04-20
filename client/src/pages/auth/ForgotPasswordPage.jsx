import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { Button, Input, Card, CardBody } from '@/components/ui';
import api from '@/services/api';
import growthValleyLogo from '@/assets/growth-valley-logo.webp';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      await api.post('/auth/forgot-password', { email: data.email });
      setSubmittedEmail(data.email);
      setSubmitted(true);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error) {
      console.error('Forgot password error:', error);
      // Even if there's an error, show success for security
      // (don't reveal if email exists or not)
      setSubmittedEmail(data.email);
      setSubmitted(true);
      toast.success('If that email exists, a password reset link has been sent.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <img
              src={growthValleyLogo}
              alt="Growth Valley"
              className="mx-auto h-16 w-auto rounded-xl object-contain"
            />
            <p className="mt-4 text-gray-600">Performance Marketer Dashboard</p>
          </div>

          <Card>
            <CardBody className="p-8">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Mail className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Check Your Email</h2>
                <p className="text-gray-600 mb-4">
                  If an account exists with <span className="font-medium">{submittedEmail}</span>,
                  you'll receive a password reset link shortly.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Didn't receive the email? Check your spam folder or try again.
                </p>

                <Button
                  variant="outline"
                  onClick={() => setSubmitted(false)}
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Try another email
                </Button>
              </div>
            </CardBody>
          </Card>

          <p className="mt-6 text-center text-sm text-gray-600">
            Remember your password?{' '}
            <Link
              to="/login"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Back to login
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center mb-4">
            <span className="text-white font-bold text-xl">GV</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Growth Valley</h1>
          <p className="mt-2 text-gray-600">Performance Marketer Dashboard</p>
        </div>

        <Card>
          <CardBody className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Forgot Your Password?</h2>
              <p className="text-gray-600 mt-2">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                {...register('email')}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>
          </CardBody>
        </Card>

        <p className="mt-6 text-center text-sm text-gray-600">
          Remember your password?{' '}
          <Link
            to="/login"
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}