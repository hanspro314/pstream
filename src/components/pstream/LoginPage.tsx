/* PStream Login Page — Phone/Email login with OTP support */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { loginUser, sendOtp, verifyOtp, type LoginResponse, type SendOtpResponse, type VerifyOtpResponse } from '@/lib/api';
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
  ShieldCheck,
  AlertCircle,
  LogIn,
  KeyRound,
} from 'lucide-react';

type LoginStep = 'phone' | 'password' | 'otp-verify';

export default function LoginPage() {
  const { state, dispatch, navigate } = useAppStore();

  // Form state
  const [step, setStep] = useState<LoginStep>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loginMode, setLoginMode] = useState<'phone' | 'email'>('phone');
  const [otpHint, setOtpHint] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

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

  // Send OTP
  const handleSendOtp = useCallback(async () => {
    const rawPhone = phone.replace(/\D/g, '');
    if (rawPhone.length < 9) {
      dispatch({ type: 'LOGIN_FAIL', payload: 'Please enter a valid phone number' });
      return;
    }

    dispatch({ type: 'LOGIN_REQUEST' });

    try {
      const result = await sendOtp({ phone: rawPhone, purpose: 'login' });
      setOtpHint(result.otp || '');
      setResendTimer(60);
      setStep('otp-verify');
      dispatch({ type: 'SET_OTP_SENT', payload: { phone: rawPhone, expiry: result.otpExpiry } });
    } catch (err) {
      dispatch({ type: 'LOGIN_FAIL', payload: err instanceof Error ? err.message : 'Failed to send OTP' });
    }
  }, [phone, dispatch]);

  // Login with password
  const handlePasswordLogin = useCallback(async () => {
    if (loginMode === 'email') {
      if (!email.trim()) {
        dispatch({ type: 'LOGIN_FAIL', payload: 'Please enter your email' });
        return;
      }
      if (!password) {
        dispatch({ type: 'LOGIN_FAIL', payload: 'Please enter your password' });
        return;
      }

      dispatch({ type: 'LOGIN_REQUEST' });
      try {
        const result: LoginResponse = await loginUser({ email: email.trim(), password });
        dispatch({ type: 'LOGIN_SUCCESS', payload: result });
        navigate('home');
      } catch (err) {
        dispatch({ type: 'LOGIN_FAIL', payload: err instanceof Error ? err.message : 'Login failed' });
      }
    } else {
      const rawPhone = phone.replace(/\D/g, '');
      if (rawPhone.length < 9) {
        dispatch({ type: 'LOGIN_FAIL', payload: 'Please enter a valid phone number' });
        return;
      }
      if (!password) {
        dispatch({ type: 'LOGIN_FAIL', payload: 'Please enter your password' });
        return;
      }

      dispatch({ type: 'LOGIN_REQUEST' });
      try {
        const result: LoginResponse = await loginUser({ phone: rawPhone, password });
        dispatch({ type: 'LOGIN_SUCCESS', payload: result });
        navigate('home');
      } catch (err) {
        dispatch({ type: 'LOGIN_FAIL', payload: err instanceof Error ? err.message : 'Login failed' });
      }
    }
  }, [phone, email, password, loginMode, dispatch, navigate]);

  // Verify OTP
  const handleVerifyOtp = useCallback(async () => {
    if (otpCode.length !== 6) {
      dispatch({ type: 'LOGIN_FAIL', payload: 'Please enter the complete 6-digit code' });
      return;
    }

    const rawPhone = phone.replace(/\D/g, '');
    dispatch({ type: 'LOGIN_REQUEST' });

    try {
      const result: VerifyOtpResponse = await verifyOtp({ phone: rawPhone, otp: otpCode });
      dispatch({ type: 'VERIFY_OTP_SUCCESS', payload: result });
      navigate('home');
    } catch (err) {
      dispatch({ type: 'LOGIN_FAIL', payload: err instanceof Error ? err.message : 'OTP verification failed' });
    }
  }, [phone, otpCode, dispatch, navigate]);

  // Resend OTP
  const handleResendOtp = useCallback(async () => {
    if (resendTimer > 0) return;
    setOtpCode('');
    await handleSendOtp();
  }, [resendTimer, handleSendOtp]);

  // Go to register
  const goToRegister = () => navigate('register');

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
            {step === 'otp-verify' ? 'Verify Your Phone' : 'Welcome Back'}
          </h1>
          <p className="text-white/50 mt-2 text-sm">
            {step === 'otp-verify'
              ? 'Enter the 6-digit code sent to your phone'
              : 'Sign in to continue watching'}
          </p>
        </motion.div>

        {/* Error message */}
        <AnimatePresence>
          {error && (
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
          {/* ─── STEP 1: Phone / Email Input ──────────────────── */}
          {step === 'phone' && (
            <motion.div
              key="phone-step"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-[#141414] rounded-2xl p-6 md:p-8 shadow-2xl border border-white/5"
            >
              {/* Login mode toggle */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setLoginMode('phone')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    loginMode === 'phone'
                      ? 'bg-[#E50914] text-white shadow-lg shadow-[#E50914]/20'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <Phone className="w-4 h-4" />
                  Phone
                </button>
                <button
                  onClick={() => setLoginMode('email')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    loginMode === 'email'
                      ? 'bg-[#E50914] text-white shadow-lg shadow-[#E50914]/20'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  Email
                </button>
              </div>

              {loginMode === 'phone' ? (
                <motion.div
                  key="phone-input"
                  custom={0}
                  variants={inputVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-white/80 text-sm">
                      Phone Number
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <Input
                        id="phone"
                        ref={phoneInputRef}
                        type="tel"
                        placeholder="256 700 000 000"
                        value={phone}
                        onChange={handlePhoneChange}
                        className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-lg focus:border-[#E50914] focus:ring-[#E50914]/20"
                      />
                    </div>
                    <p className="text-xs text-white/30">Uganda format: 256XXXXXXXXX</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="email-input"
                  custom={0}
                  variants={inputVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white/80 text-sm">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-lg focus:border-[#E50914] focus:ring-[#E50914]/20"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* OTP Login Button */}
              {loginMode === 'phone' && (
                <motion.div
                  custom={1}
                  variants={inputVariants}
                  initial="hidden"
                  animate="visible"
                  className="mt-4"
                >
                  <Button
                    onClick={handleSendOtp}
                    disabled={isLoading || phone.replace(/\D/g, '').length < 9}
                    className="w-full h-12 bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-lg gap-2"
                    variant="outline"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <KeyRound className="w-4 h-4" />
                    )}
                    Login with OTP
                  </Button>
                </motion.div>
              )}

              {/* Divider */}
              {loginMode === 'phone' && (
                <motion.div
                  custom={2}
                  variants={inputVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex items-center gap-3 my-5"
                >
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-white/30">or continue with password</span>
                  <div className="flex-1 h-px bg-white/10" />
                </motion.div>
              )}

              {/* Password field */}
              {loginMode === 'phone' ? (
                <motion.div
                  custom={3}
                  variants={inputVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white/80 text-sm">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handlePasswordLogin()}
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
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  custom={1}
                  variants={inputVariants}
                  initial="hidden"
                  animate="visible"
                  className="mt-4 space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="email-password" className="text-white/80 text-sm">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <Input
                        id="email-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handlePasswordLogin()}
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
                  </div>
                </motion.div>
              )}

              {/* Remember me & Forgot password */}
              <motion.div
                custom={4}
                variants={inputVariants}
                initial="hidden"
                animate="visible"
                className="flex items-center justify-between mt-4"
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    className="border-white/20 data-[state=checked]:bg-[#E50914] data-[state=checked]:border-[#E50914]"
                  />
                  <Label htmlFor="remember" className="text-xs text-white/50 cursor-pointer">
                    Remember me
                  </Label>
                </div>
                <button className="text-xs text-[#E50914] hover:text-[#E50914]/80 transition-colors">
                  Forgot password?
                </button>
              </motion.div>

              {/* Login button */}
              <motion.div
                custom={5}
                variants={inputVariants}
                initial="hidden"
                animate="visible"
                className="mt-6"
              >
                <Button
                  onClick={handlePasswordLogin}
                  disabled={isLoading}
                  className="w-full h-12 bg-[#E50914] hover:bg-[#E50914]/90 text-white rounded-lg gap-2 font-semibold shadow-lg shadow-[#E50914]/20 hover:shadow-[#E50914]/40 transition-all"
                  size="lg"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <LogIn className="w-5 h-5" />
                  )}
                  Sign In
                </Button>
              </motion.div>

              {/* Sign up link */}
              <motion.div
                custom={6}
                variants={inputVariants}
                initial="hidden"
                animate="visible"
                className="mt-6 text-center"
              >
                <p className="text-sm text-white/50">
                  Don&apos;t have an account?{' '}
                  <button
                    onClick={goToRegister}
                    className="text-[#E50914] hover:text-[#E50914]/80 font-medium transition-colors"
                  >
                    Sign Up Free
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
        </AnimatePresence>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-white/20 mt-8"
        >
          By signing in, you agree to PStream&apos;s Terms of Service and Privacy Policy
        </motion.p>
      </div>
    </div>
  );
}
