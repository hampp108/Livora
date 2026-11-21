import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { LivoraWordmark } from '../LivoraWordmark';
import { AuthShowcaseScene } from './AuthShowcaseScene';

interface ForgotPasswordPageProps {
  onGoLogin: () => void;
  onBackToLanding: () => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  onGoLogin,
  onBackToLanding,
}) => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const res = await resetPassword(email, newPassword);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? 'Unable to reset password.');
      return;
    }
    setCompleted(true);
  };

  return (
    <div className="min-h-screen bg-[#F4F0E8] text-[#30332F] grid grid-cols-1 lg:grid-cols-12">
      <div className="lg:col-span-7 relative min-h-[300px] lg:min-h-screen">
        <AuthShowcaseScene
          headline="Restore access to your studio."
          subcopy="Your architectural layouts, custom room finishes, and lighting presets remain safely preserved."
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

      <div className="lg:col-span-5 flex flex-col justify-center px-6 sm:px-12 lg:px-14 py-12 bg-[#FBF9F4] border-l border-[#E0D6C5]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="max-w-md w-full mx-auto space-y-6"
        >
          <div className="space-y-2">
            <LivoraWordmark theme="light" size="md" showSublabel />
            <h1 className="font-display text-3xl text-[#30332F] pt-3">Reset your password</h1>
            <p className="text-sm text-[#61645C]">
              Enter your registered email address and choose a new password for your workspace.
            </p>
          </div>

          {completed ? (
            <div className="p-6 rounded-xl bg-[#EDF1EA] border border-[#CBD4C4] space-y-4">
              <div className="flex items-center gap-2.5 text-[#4B6342]">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-semibold">Password updated</span>
              </div>
              <p className="text-xs text-[#52554F] leading-relaxed">
                Your studio password for <strong>{email}</strong> has been updated. You can now sign in with your new credentials.
              </p>
              <button
                type="button"
                onClick={onGoLogin}
                className="w-full py-2.5 px-4 bg-[#30332F] hover:bg-[#434742] text-[#FFFFFF] text-xs font-medium rounded-lg inline-flex items-center justify-center gap-2"
              >
                <span>Return to Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="fp-email"
                  className="block text-xs font-medium text-[#30332F] mb-1.5"
                >
                  Account email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#83857C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="fp-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@studio.com"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-[#D8C9B5] rounded-lg focus:outline-none focus:border-[#5D6B53]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="fp-new-pass"
                  className="block text-xs font-medium text-[#30332F] mb-1.5"
                >
                  New password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#83857C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="fp-new-pass"
                    type={showNew ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-[#FFFFFF] border border-[#D8C9B5] rounded-lg focus:outline-none focus:border-[#5D6B53]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    aria-label={showNew ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#787A72]"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="fp-confirm-pass"
                  className="block text-xs font-medium text-[#30332F] mb-1.5"
                >
                  Confirm new password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#83857C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="fp-confirm-pass"
                    type={showNew ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-[#FFFFFF] border border-[#D8C9B5] rounded-lg focus:outline-none focus:border-[#5D6B53]"
                  />
                </div>
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
                <span>{submitting ? 'Updating...' : 'Update Password'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          <p className="text-center text-xs text-[#61645C]">
            Remembered your password?{' '}
            <button
              type="button"
              onClick={onGoLogin}
              className="font-semibold text-[#30332F] hover:text-[#5D6B53] underline underline-offset-2"
            >
              Back to Sign In
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
};
