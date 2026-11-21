import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Info, Lock, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { LivoraWordmark } from '../LivoraWordmark';
import { AuthShowcaseScene } from './AuthShowcaseScene';

interface LoginPageProps {
  onSuccess: () => void;
  onGoRegister: () => void;
  onGoForgotPassword: () => void;
  onBackToLanding: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onSuccess,
  onGoRegister,
  onGoForgotPassword,
  onBackToLanding,
}) => {
  const { signIn, firebaseConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGoogleNote, setShowGoogleNote] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await signIn(email, password, rememberMe);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? 'Unable to sign in.');
      return;
    }
    onSuccess();
  };

  const fillDemoCredentials = () => {
    setEmail('studio@livora.design');
    setPassword('Livora@2026');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F4F0E8] text-[#30332F] grid grid-cols-1 lg:grid-cols-12">
      {/* Left 3D Bedroom Showcase */}
      <div className="lg:col-span-7 relative min-h-[320px] lg:min-h-screen">
        <AuthShowcaseScene
          headline="Welcome back to your creative space."
          subcopy="Step inside calibrated golden-hour lighting, tactile PBR fabrics, and custom architectural room plans."
        />
        <button
          type="button"
          onClick={onBackToLanding}
          className="absolute top-6 left-6 z-20 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#1F2220]/75 hover:bg-[#1F2220] text-[#F4F0E8] text-xs font-medium backdrop-blur-sm transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>
      </div>

      {/* Right Login Form */}
      <div className="lg:col-span-5 flex flex-col justify-center px-6 sm:px-12 lg:px-14 py-12 bg-[#FBF9F4] border-l border-[#E0D6C5]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="max-w-md w-full mx-auto space-y-7"
        >
          <div className="space-y-2">
            <LivoraWordmark theme="light" size="md" showSublabel />
            <h1 className="font-display text-3xl text-[#30332F] pt-3">Sign in to Livora</h1>
            <p className="text-sm text-[#61645C]">
              Access your saved 3D rooms, budget estimates, and material library.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-medium text-[#30332F] mb-1.5"
              >
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#83857C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@studio.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-[#D8C9B5] rounded-lg focus:outline-none focus:border-[#5D6B53] transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-medium text-[#30332F]"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={onGoForgotPassword}
                  className="text-xs font-medium text-[#5D6B53] hover:text-[#30332F] transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#83857C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-[#FFFFFF] border border-[#D8C9B5] rounded-lg focus:outline-none focus:border-[#5D6B53] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#787A72] hover:text-[#30332F]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="inline-flex items-center gap-2 text-xs text-[#545751] cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#5D6B53]"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={fillDemoCredentials}
                className="text-[11px] font-medium text-[#78816C] hover:text-[#30332F] underline underline-offset-2"
              >
                Use studio demo credentials
              </button>
            </div>

            {error && (
              <div
                role="alert"
                className="px-3.5 py-2.5 rounded-lg bg-[#F5E8E6] border border-[#DFB8B3] text-xs text-[#8B3228]"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-[#30332F] hover:bg-[#434742] disabled:opacity-60 text-[#FFFFFF] text-sm font-medium rounded-lg inline-flex items-center justify-center gap-2 transition-colors"
            >
              <span>{submitting ? 'Signing In...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-[#E0D6C5]" />
            <span className="shrink mx-3 text-[11px] uppercase tracking-[0.14em] text-[#8A877E]">
              or
            </span>
            <div className="flex-grow border-t border-[#E0D6C5]" />
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => setShowGoogleNote((v) => !v)}
              className="w-full py-2.5 px-4 bg-[#FFFFFF] hover:bg-[#F4F0E8] border border-[#D8C9B5] text-[#30332F] text-xs font-medium rounded-lg inline-flex items-center justify-center gap-2.5 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {showGoogleNote && (
              <div className="p-3 rounded-lg bg-[#F1ECE2] border border-[#DDD3C1] text-[11px] text-[#52554F] flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-[#5D6B53] shrink-0 mt-0.5" />
                <span>
                  {firebaseConfigured
                    ? 'Firebase client keys are present. Connect Firebase Auth GoogleAuthProvider to enable live OAuth sign-in.'
                    : 'Google Sign-In is optional and requires configuring VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, and VITE_FIREBASE_PROJECT_ID in .env. Use email and password above for immediate local workspace access.'}
                </span>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-[#61645C] pt-2">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={onGoRegister}
              className="font-semibold text-[#30332F] hover:text-[#5D6B53] underline underline-offset-2"
            >
              Create one.
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
};
