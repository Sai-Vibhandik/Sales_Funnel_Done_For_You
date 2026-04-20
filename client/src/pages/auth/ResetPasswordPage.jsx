import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { Button, Input, Card, CardBody } from '@/components/ui';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import growthValleyLogo from '@/assets/growth-valley-logo.webp';

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [validToken, setValidToken] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { token } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    // Verify token exists (basic check)
    if (token && token.length > 0) {
      setValidToken(true);
    }
    setVerifying(false);
  }, [token]);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const response = await api.put(`/auth/reset-password/${token}`, {
        password: data.password,
      });

      setSuccess(true);
      toast.success('Password reset successful!');

      // Auto-login after successful reset
      if (response.token && response.data) {
        localStorage.setItem('token', response.token);
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error(error.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!validToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card>
            <CardBody className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Reset Link</h2>
              <p className="text-gray-600 mb-6">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Link to="/forgot-password">
                <Button variant="primary" className="w-full">
                  Request New Reset Link
                </Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <img
              src={growthValleyLogo}
              alt="Growth Valley"
              className="mx-auto h-16 w-auto rounded-xl object-contain"
            />
          </div>

          <Card>
            <CardBody className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Password Reset!</h2>
              <p className="text-gray-600 mb-4">
                Your password has been successfully reset. You will be redirected to the dashboard shortly.
              </p>
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-600" />
            </CardBody>
          </Card>

          <p className="mt-6 text-center text-sm text-gray-600">
            <Link
              to="/login"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Go to login
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
          <img
            src={growthValleyLogo}
            alt="Growth Valley"
            className="mx-auto h-16 w-auto rounded-xl object-contain"
          />
          <p className="mt-4 text-gray-600">Performance Marketer Dashboard</p>
        </div>

        <Card>
          <CardBody className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Set New Password</h2>
              <p className="text-gray-600 mt-2">
                Enter your new password below.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="relative">
                <Input
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  error={errors.password?.message}
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              <div className="relative">
                <Input
                  label="Confirm New Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Resetting password...
                  </>
                ) : (
                  'Reset Password'
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