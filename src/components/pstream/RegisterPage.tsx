/* PStream Register Page — Full registration with OTP verification */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { registerUser, verifyOtp, type RegisterResponse, type VerifyOtpResponse } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  User,
  CheckCircle2,
  Sparkles,
  PartyPopper,
  Play,
} from 'lucide-react';

type RegisterStep = 'phone' | 'otp-verify' | 'details' | 'success';

export default function RegisterPage() {
  const { state, dispatch, navigate } = useAppStore();

  // Form state
  const [step, setStep] = useState<RegisterStep>('phone');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpHint, setOtpHint] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [regData, setRegData] = useState<{ userId: string; password: string } | null>(null);

  // Refs
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Focus phone input on mount
  useEffect(() => {
    if (phoneInputRef.current) {
      phoneInputRef.current.focus();
    }
  }, []);

  // Resend timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const strengthColors = ['', '#E50914', '#F97316', '#EAB308', '#22C55E', '#10B981'];

  // Format phone number
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw.length <= 12) {
      setPhone(formatPhone(raw));
    }
  };

  // Step 1: Register phone
  const handleRegisterPhone = useCallback(async () => {
    const rawPhone = phone.replace(/\D/g, '');
    if (rawPhone.length < 9) {
      dispatch({ type: 'LOGIN_FAIL', payload: 'Please enter a valid phone number' });
      return;
    }

    dispatch({ type: 'REGISTER_REQUEST' });

    try {
      const result: RegisterResponse = await registerUser({
        phone: rawPhone,
        name: 'User',
        password: 'temp_pass_123',
      });
      setOtpHint(result.otp || '');
      setResendTimer(60);
      setRegData({ userId: result.userId, password: 'temp_pass_123' });
      setStep('otp-verify');
    } catch (err) {
      dispatch({ type: 'LOGIN_FAIL', payload: err instanceof Error ? err.message : 'Registration failed' });
    }
  }, [phone, dispatch]);

  // Step 2: Verify OTP
  const handleVerifyOtp = useCallback(async () => {
    if (otpCode.length !== 6) {
      dispatch({ type: 'LOGIN_FAIL', payload: 'Please enter the complete 6-digit code' });
      return;
    }

    const rawPhone = phone.replace(/\D/g, '');
    dispatch({ type: 'LOGIN_REQUEST' });

    try {
      const result: VerifyOtpResponse = await verifyOtp({ phone: rawPhone, otp: otpCode });
      // Instead of auto-login, proceed to details step with the user data
      dispatch({
        type: 'REGISTER_SUCCESS',
        payload: { user: result.user },
      });
      setStep('details');
    } catch (err) {
      dispatch({ type: 'LOGIN_FAIL', payload: err instanceof Error ? err.message : 'OTP verification failed' });
    }
  }, [phone, otpCode, dispatch]);

  // Resend OTP
  const handleResendOtp = useCallback(async () => {
    if (resendTimer > 0) return;
    setOtpCode('');
    await handleRegisterPhone();
  }, [resendTimer, handleRegisterPhone]);

  // Step 3: Complete profile & login
  const handleCompleteRegistration = useCallback(async () => {
    if (!fullName.trim()) {
      dispatch({ type: 'LOGIN_FAIL', payload: 'Please enter your full name' });
      return;
    }
    if (password.length < 6) {
      dispatch({ type: 'LOGIN_FAIL', payload: 'Password must be at least 6 characters' });
      return;
    }
    if (password !== confirmPassword) {
      dispatch({ type: 'LOGIN_FAIL', payload: 'Passwords do not match' });
      return;
    }
    if (!agreeTerms) {
      dispatch({ type: 'LOGIN_FAIL', payload: 'Please agree to the Terms of Service and Privacy Policy' });
      return;
    }

    dispatch({ type: 'LOGIN_REQUEST' });

    try {
      const rawPhone = phone.replace(/\D/g, '');
      // Re-register with full details (will update existing)
      const result: RegisterResponse = await registerUser({
        phone: rawPhone,
        name: fullName.trim(),
        email: email.trim() || undefined,
        password,
      });
      // Then verify OTP to get session
      const otpResult: VerifyOtpResponse = await verifyOtp({ phone: rawPhone, otp: result.otp || '' });
      dispatch({ type: 'VERIFY_OTP_SUCCESS', payload: otpResult });
      setStep('success');
    } catch (err) {
      dispatch({ type: 'LOGIN_FAIL', payload: err instanceof Error ? err.message : 'Failed to complete registration' });
    }
  }, [fullName, email, password, confirmPassword, agreeTerms, phone, dispatch]);

  const isLoading = state.auth.isLoading;
  const error = state.auth.error;

  // ─── Animations ──────────────────────────────────────────────
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.2 },
    },
  };

  const inputVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: 0.1 + i * 0.08, duration: 0.3 },
    }),
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <button
            onClick={() => navigate('home')}
            className="inline-flex items-center gap-2 mb-6 group"
          >
            <div className="bg-[#E50914] rounded-lg w-10 h-10 flex items-center justify-center shadow-lg shadow-[#E50914]/30 group-hover:shadow-[#E50914]/50 transition-shadow">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="text-white font-bold text-2xl tracking-tight">PStream</span>
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            {step === 'success'
              ? 'Welcome to PStream!'
              : step === 'otp-verify'
                ? 'Verify Your Phone'
                : step === 'details'
                  ? 'Complete Your Profile'
                  : 'Create Your Account'}
          </h1>
          <p className="text-white/50 mt-2 text-sm">
            {step === 'success'
              ? 'Start streaming with your free trial'
              : step === 'otp-verify'
                ? 'Enter the 6-digit code sent to your phone'
                : step === 'details'
                  ? 'Almost there! Set up your profile'
                  : 'Get 1-day free trial when you sign up'}
          </p>
        </motion.div>

        {/* Error message */}
        <AnimatePresence>
          {error && step !== 'success' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-[#E50914]/10 border border-[#E50914]/30 rounded-lg flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-[#E50914] mt-0.5 shrink-0" />
              <p className="text-sm text-[#E50914]/90">{error}</p>
              <button
                onClick={() => dispatch({ type: 'CLEAR_AUTH_ERROR' })}
                className="ml-auto text-[#E50914]/60 hover:text-[#E50914] text-xs"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OTP Hint (dev mode) */}
        {otpHint && step === 'otp-verify' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
          >
            <p className="text-xs text-yellow-500/90">
              <span className="font-semibold">Demo OTP:</span> {otpHint}
            </p>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {/* ─── STEP 1: Phone Input ──────────────────────────── */}
          {step === 'phone' && (
            <motion.div
              key="phone-step"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-[#141414] rounded-2xl p-6 md:p-8 shadow-2xl border border-white/5"
            >
              {/* Free trial badge */}
              <motion.div
                custom={0}
                variants={inputVariants}
                initial="hidden"
                animate="visible"
                className="flex items-center gap-2 mb-6 p-3 bg-[#E50914]/5 border border-[#E50914]/20 rounded-xl"
              >
                <Sparkles className="w-5 h-5 text-[#E50914] shrink-0" />
                <p className="text-sm text-[#E50914]/90">
                  Get <span className="font-bold">1-day free trial</span> on registration!
                </p>
              </motion.div>

              <motion.div
                key="phone-input"
                custom={1}
                variants={inputVariants}
                initial="hidden"
                animate="visible"
                className="space-y-2"
              >
                <Label htmlFor="reg-phone" className="text-white/80 text-sm">
                  Phone Number <span className="text-[#E50914]">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="reg-phone"
                    ref={phoneInputRef}
                    type="tel"
                    placeholder="256 700 000 000"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-lg focus:border-[#E50914] focus:ring-[#E50914]/20"
                  />
                </div>
                <p className="text-xs text-white/30">Uganda format: 256XXXXXXXXX</p>
              </motion.div>

              {/* Continue button */}
              <motion.div
                custom={2}
                variants={inputVariants}
                initial="hidden"
                animate="visible"
                className="mt-6"
              >
                <Button
                  onClick={handleRegisterPhone}
                  disabled={isLoading || phone.replace(/\D/g, '').length < 9}
                  className="w-full h-12 bg-[#E50914] hover:bg-[#E50914]/90 text-white rounded-lg gap-2 font-semibold shadow-lg shadow-[#E50914]/20 hover:shadow-[#E50914]/40 transition-all"
                  size="lg"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5" />
                  )}
                  Continue
                </Button>
              </motion.div>

              {/* Sign in link */}
              <motion.div
                custom={3}
                variants={inputVariants}
                initial="hidden"
                animate="visible"
                className="mt-6 text-center"
              >
                <p className="text-sm text-white/50">
                  Already have an account?{' '}
                  <button
                    onClick={() => navigate('login')}
                    className="text-[#E50914] hover:text-[#E50914]/80 font-medium transition-colors"
                  >
                    Sign In
                  </button>
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* ─── STEP 2: OTP Verification ─────────────────────── */}
          {step === 'otp-verify' && (
            <motion.div
              key="otp-step"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-[#141414] rounded-2xl p-6 md:p-8 shadow-2xl border border-white/5"
            >
              {/* Back button */}
              <button
                onClick={() => {
                  setStep('phone');
                  setOtpCode('');
                  dispatch({ type: 'CLEAR_AUTH_ERROR' });
                }}
                className="flex items-center gap-1 text-white/50 hover:text-white text-sm mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              {/* Shield icon */}
              <div className="flex justify-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                  className="w-16 h-16 rounded-full bg-[#E50914]/10 flex items-center justify-center"
                >
                  <ShieldCheck className="w-8 h-8 text-[#E50914]" />
                </motion.div>
              </div>

              <div className="text-center mb-6">
                <p className="text-white/60 text-sm">
                  We sent a 6-digit code to
                </p>
                <p className="text-white font-semibold mt-1">
                  {phone || 'your phone number'}
                </p>
              </div>

              {/* OTP Input */}
              <div className="flex justify-center mb-6">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={setOtpCode}
                  onComplete={handleVerifyOtp}
                  containerClassName="gap-1"
                >
                  <InputOTPGroup>
                    <InputOTPSlot
                      index={0}
                      className="w-11 h-13 md:w-13 md:h-14 bg-white/5 border-white/15 rounded-lg text-white text-xl data-[active=true]:border-[#E50914] data-[active=true]:ring-[#E50914]/20"
                    />
                    <InputOTPSlot
                      index={1}
                      className="w-11 h-13 md:w-13 md:h-14 bg-white/5 border-white/15 rounded-lg text-white text-xl data-[active=true]:border-[#E50914] data-[active=true]:ring-[#E50914]/20"
                    />
                    <InputOTPSlot
                      index={2}
                      className="w-11 h-13 md:w-13 md:h-14 bg-white/5 border-white/15 rounded-lg text-white text-xl data-[active=true]:border-[#E50914] data-[active=true]:ring-[#E50914]/20"
                    />
                  </InputOTPGroup>
                  <InputOTPSeparator className="text-white/20 mx-1" />
                  <InputOTPGroup>
                    <InputOTPSlot
                      index={3}
                      className="w-11 h-13 md:w-13 md:h-14 bg-white/5 border-white/15 rounded-lg text-white text-xl data-[active=true]:border-[#E50914] data-[active=true]:ring-[#E50914]/20"
                    />
                    <InputOTPSlot
                      index={4}
                      className="w-11 h-13 md:w-13 md:h-14 bg-white/5 border-white/15 rounded-lg text-white text-xl data-[active=true]:border-[#E50914] data-[active=true]:ring-[#E50914]/20"
                    />
                    <InputOTPSlot
                      index={5}
                      className="w-11 h-13 md:w-13 md:h-14 bg-white/5 border-white/15 rounded-lg text-white text-xl data-[active=true]:border-[#E50914] data-[active=true]:ring-[#E50914]/20"
                    />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {/* Verify button */}
              <Button
                onClick={handleVerifyOtp}
                disabled={isLoading || otpCode.length !== 6}
                className="w-full h-12 bg-[#E50914] hover:bg-[#E50914]/90 text-white rounded-lg gap-2 font-semibold shadow-lg shadow-[#E50914]/20"
                size="lg"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-5 h-5" />
                )}
                Verify Code
              </Button>

              {/* Resend */}
              <div className="mt-4 text-center">
                <p className="text-sm text-white/40">
                  Didn&apos;t receive the code?{' '}
                  {resendTimer > 0 ? (
                    <span className="text-white/60">
                      Resend in {resendTimer}s
                    </span>
                  ) : (
                    <button
                      onClick={handleResendOtp}
                      disabled={isLoading}
                      className="text-[#E50914] hover:text-[#E50914]/80 font-medium transition-colors disabled:opacity-50"
                    >
                      Resend Code
                    </button>
                  )}
                </p>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 3: Profile Details ──────────────────────── */}
          {step === 'details' && (
            <motion.div
              key="details-step"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-[#141414] rounded-2xl p-6 md:p-8 shadow-2xl border border-white/5"
            >
              {/* Full name */}
              <motion.div custom={0} variants={inputVariants} initial="hidden" animate="visible" className="space-y-2">
                <Label htmlFor="full-name" className="text-white/80 text-sm">
                  Full Name <span className="text-[#E50914]">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="full-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-lg focus:border-[#E50914] focus:ring-[#E50914]/20"
                  />
                </div>
              </motion.div>

              {/* Email */}
              <motion.div custom={1} variants={inputVariants} initial="hidden" animate="visible" className="space-y-2 mt-4">
                <Label htmlFor="reg-email" className="text-white/80 text-sm">
                  Email <span className="text-white/30">(optional)</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-lg focus:border-[#E50914] focus:ring-[#E50914]/20"
                  />
                </div>
              </motion.div>

              {/* Password */}
              <motion.div custom={2} variants={inputVariants} initial="hidden" animate="visible" className="space-y-2 mt-4">
                <Label htmlFor="reg-password" className="text-white/80 text-sm">
                  Password <span className="text-[#E50914]">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-lg focus:border-[#E50914] focus:ring-[#E50914]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength indicator */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-1 flex-1 rounded-full transition-all duration-300"
                          style={{
                            backgroundColor: i < passwordStrength
                              ? strengthColors[passwordStrength]
                              : 'rgba(255,255,255,0.1)',
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: strengthColors[passwordStrength] || 'rgba(255,255,255,0.3)' }}>
                      {strengthLabels[passwordStrength]}
                    </p>
                  </div>
                )}
              </motion.div>

              {/* Confirm Password */}
              <motion.div custom={3} variants={inputVariants} initial="hidden" animate="visible" className="space-y-2 mt-4">
                <Label htmlFor="confirm-password" className="text-white/80 text-sm">
                  Confirm Password <span className="text-[#E50914]">*</span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-lg focus:border-[#E50914] focus:ring-[#E50914]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <p className="text-xs text-[#E50914]/80">Passwords do not match</p>
                )}
                {confirmPassword.length > 0 && password === confirmPassword && (
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Passwords match
                  </p>
                )}
              </motion.div>

              {/* Terms checkbox */}
              <motion.div custom={4} variants={inputVariants} initial="hidden" animate="visible" className="mt-5">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="agree-terms"
                    checked={agreeTerms}
                    onCheckedChange={(checked) => setAgreeTerms(checked === true)}
                    className="mt-0.5 border-white/20 data-[state=checked]:bg-[#E50914] data-[state=checked]:border-[#E50914]"
                  />
                  <Label htmlFor="agree-terms" className="text-xs text-white/50 cursor-pointer leading-relaxed">
                    I agree to PStream&apos;s{' '}
                    <button className="text-[#E50914] hover:underline">Terms of Service</button>
                    {' '}and{' '}
                    <button className="text-[#E50914] hover:underline">Privacy Policy</button>
                  </Label>
                </div>
              </motion.div>

              {/* Create Account button */}
              <motion.div custom={5} variants={inputVariants} initial="hidden" animate="visible" className="mt-6">
                <Button
                  onClick={handleCompleteRegistration}
                  disabled={
                    isLoading ||
                    !fullName.trim() ||
                    password.length < 6 ||
                    password !== confirmPassword ||
                    !agreeTerms
                  }
                  className="w-full h-12 bg-[#E50914] hover:bg-[#E50914]/90 text-white rounded-lg gap-2 font-semibold shadow-lg shadow-[#E50914]/20 hover:shadow-[#E50914]/40 transition-all"
                  size="lg"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                  Create Account & Start Free Trial
                </Button>
              </motion.div>

              {/* Sign in link */}
              <motion.div custom={6} variants={inputVariants} initial="hidden" animate="visible" className="mt-6 text-center">
                <p className="text-sm text-white/50">
                  Already have an account?{' '}
                  <button
                    onClick={() => navigate('login')}
                    className="text-[#E50914] hover:text-[#E50914]/80 font-medium transition-colors"
                  >
                    Sign In
                  </button>
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* ─── STEP 4: Success ──────────────────────────────── */}
          {step === 'success' && (
            <motion.div
              key="success-step"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: 'spring', stiffness: 100 }}
              className="bg-[#141414] rounded-2xl p-8 md:p-10 shadow-2xl border border-white/5 text-center"
            >
              {/* Party animation */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
                className="flex justify-center mb-6"
              >
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-[#E50914]/15 flex items-center justify-center">
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                      }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <PartyPopper className="w-12 h-12 text-[#E50914]" />
                    </motion.div>
                  </div>
                  {/* Decorative circles */}
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                    className="absolute inset-0 rounded-full border-2 border-[#E50914]/20"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <h2 className="text-2xl font-bold text-white mb-2">
                  🎉 Welcome, {state.auth.user?.name || 'User'}!
                </h2>
                <p className="text-white/60 text-sm mb-2">
                  Your account has been created successfully
                </p>
                <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#E50914]/10 border border-[#E50914]/20 rounded-full mb-8">
                  <Sparkles className="w-4 h-4 text-[#E50914]" />
                  <span className="text-sm text-[#E50914] font-medium">
                    1-day free trial activated!
                  </span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Button
                  onClick={() => navigate('home')}
                  className="w-full h-12 bg-[#E50914] hover:bg-[#E50914]/90 text-white rounded-lg gap-2 font-semibold shadow-lg shadow-[#E50914]/20 hover:shadow-[#E50914]/40 transition-all"
                  size="lg"
                >
                  <Play className="w-5 h-5" />
                  Start Watching Now
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        {step !== 'success' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-xs text-white/20 mt-8"
          >
            By creating an account, you agree to PStream&apos;s Terms of Service and Privacy Policy
          </motion.p>
        )}
      </div>
    </div>
  );
}
