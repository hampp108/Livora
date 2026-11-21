import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { LivoraWordmark } from '../LivoraWordmark';
import { AuthShowcaseScene } from './AuthShowcaseScene';

interface RegisterPageProps {
  onSuccess: () => void;
  onGoLogin: () => void;
  onBackToLanding: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onSuccess,
  onGoLogin,
  onBackToLanding,
}) => {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordChecks = useMemo(
    () => ({
      minLength: password.length >= 8,
      hasLetterAndNum: /[A-Za-z]/.test(password) && /[0-9]/.test(password),
      matches: password.length > 0 && password === confirmPassword,
    }),
    [password, confirmPassword],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (fullName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!passwordChecks.minLength) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!passwordChecks.matches) {
      setError('Password and confirmation do not match.');
      return;
    }
    if (!acceptTerms) {
      setError('Please accept the Livora workspace terms to continue.');
      return;
    }

    setSubmitting(true);
    const res = await signUp(fullName, email, password);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? 'Unable to create account.');
      return;
    }
    onSuccess();
  };

  return (
    <div className="min-h-screen bg-[#F4F0E8] text-[#30332F] grid grid-cols-1 lg:grid-cols-12">
      {/* Left 3D Bedroom Showcase */}
      <div className="lg:col-span-7 relative min-h-[320px] lg:min-h-screen">
        <AuthShowcaseScene
          headline="Create your space. Start imagining."
          subcopy="Design realistic 3D rooms, tailor wood, stone, and upholstery materials, and plan budgets in real time."
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

      {/* Right Registration Form */}
      <div className="lg:col-span-5 flex flex-col justify-center px-6 sm:px-12 lg:px-14 py-10 bg-[#FBF9F4] border-l border-[#E0D6C5]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="max-w-md w-full mx-auto space-y-6"
        >
          <div className="space-y-2">
            <LivoraWordmark theme="light" size="md" showSublabel />
            <h1 className="font-display text-3xl text-[#30332F] pt-3">
              Create your space. Start imagining.
            </h1>
            <p className="text-sm text-[#61645C]">
              Set up your personal design studio to save 3D rooms and material palettes.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="reg-name"
                className="block text-xs font-medium text-[#30332F] mb-1.5"
              >
                Full name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#83857C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="reg-name"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ananya Sharma"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-[#D8C9B5] rounded-lg focus:outline-none focus:border-[#5D6B53]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-email"
                className="block text-xs font-medium text-[#30332F] mb-1.5"
              >
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#83857C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ananya@atelier.in"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-[#D8C9B5] rounded-lg focus:outline-none focus:border-[#5D6B53]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-password"
                className="block text-xs font-medium text-[#30332F] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#83857C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-[#FFFFFF] border border-[#D8C9B5] rounded-lg focus:outline-none focus:border-[#5D6B53]"
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

            <div>
              <label
                htmlFor="reg-confirm"
                className="block text-xs font-medium text-[#30332F] mb-1.5"
              >
                Confirm password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#83857C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="reg-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-[#FFFFFF] border border-[#D8C9B5] rounded-lg focus:outline-none focus:border-[#5D6B53]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide confirmation' : 'Show confirmation'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#787A72] hover:text-[#30332F]"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password strength & validation cues */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div
                className={`inline-flex items-center gap-1.5 ${
                  passwordChecks.minLength ? 'text-[#4B6342]' : 'text-[#84867E]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>8+ characters</span>
              </div>
              <div
                className={`inline-flex items-center gap-1.5 ${
                  passwordChecks.hasLetterAndNum ? 'text-[#4B6342]' : 'text-[#84867E]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Letters & numbers</span>
              </div>
              <div
                className={`inline-flex items-center gap-1.5 ${
                  passwordChecks.matches ? 'text-[#4B6342]' : 'text-[#84867E]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Passwords match</span>
              </div>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-[#545751] cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="w-4 h-4 rounded accent-[#5D6B53] mt-0.5"
              />
              <span>
                I agree to store my 3D room projects locally inside this browser workspace.
              </span>
            </label>

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
              <span>{submitting ? 'Creating Studio...' : 'Create Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-center text-xs text-[#61645C] pt-1">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onGoLogin}
              className="font-semibold text-[#30332F] hover:text-[#5D6B53] underline underline-offset-2"
            >
              Sign in
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
};
