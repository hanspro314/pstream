/* PStream Token Entry Page — Activate access code to stream */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { redeemToken, checkTokenStatus, fetchAdminConfig } from '@/lib/api';
import { getStoredFingerprint, getDeviceInfo } from '@/lib/device-fingerprint';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  MessageCircle,
  Shield,
  Sparkles,
  Play,
  Download,
  Clock,
  Smartphone,
  Zap,
} from 'lucide-react';
import type { AdminConfig } from '@/lib/types';

export default function LoginPage() {
  const { state, dispatch, navigate } = useAppStore();

  // Form state
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [adminConfig, setAdminConfig] = useState<AdminConfig | null>(null);
  const [showHowTo, setShowHowTo] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const logoTapCount = useRef(0);
  const logoTapTimer = useRef<NodeJS.Timeout | null>(null);

  // Auto-login: check stored token session on mount
  useEffect(() => {
    const autoLogin = async () => {
      setIsValidating(true);
      try {
        const stored = localStorage.getItem('pstream_token_session');
        if (stored) {
          const session = JSON.parse(stored);
          if (session?.code) {
            const fingerprint = await getStoredFingerprint();
            const result = await checkTokenStatus(session.code, fingerprint);
            if (result.valid) {
              dispatch({
                type: 'SET_TOKEN_SESSION',
                payload: {
                  code: session.code,
                  tier: result.tier || session.tier,
                  expiresAt: result.expiresAt || session.expiresAt,
                  maxDownloads: result.maxDownloads || session.maxDownloads || 0,
                },
              });
              navigate('home');
              return;
            } else {
              // Token expired or revoked — clear it
              dispatch({ type: 'SET_TOKEN_SESSION', payload: null });
              setError(result.reason || 'Your access code has expired or been deactivated.');
            }
          }
        }
      } catch {
        // Silently fail validation — show entry form
      }
      setIsValidating(false);
    };
    autoLogin();
  }, [dispatch, navigate]);

  // Fetch admin config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await fetchAdminConfig();
        setAdminConfig(config);
        dispatch({ type: 'SET_ADMIN_CONFIG', payload: config });
      } catch {
        // Use defaults if config fetch fails
      }
    };
    loadConfig();
  }, [dispatch]);

  // Focus input after validation
  useEffect(() => {
    if (!isValidating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isValidating]);

  // Format code input — uppercase, allow dash separator
  const formatCode = (value: string) => {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 8) return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
    return cleaned;
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value);
    setCode(formatted);
    if (error) setError(null);
  };

  // Activate token
  const handleActivate = useCallback(async () => {
    const cleanCode = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (cleanCode.length < 4) {
      setError('Please enter a valid access code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fingerprint = await getStoredFingerprint();
      const deviceInfo = getDeviceInfo();
      const result = await redeemToken({
        code: cleanCode,
        fingerprint,
        deviceInfo,
      });

      // Store session
      dispatch({
        type: 'SET_TOKEN_SESSION',
        payload: {
          code: result.code,
          tier: result.tier,
          expiresAt: result.expiresAt,
          maxDownloads: result.maxDownloads,
        },
      });

      // Dispatch mock login success
      const planName = result.tier === 'download' ? 'Stream + Download' : result.tier === 'trial' ? 'Trial' : 'Stream';
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: {
            id: 'token-user',
            name: 'PStream User',
            phone: '',
            email: 'user@pstream.ug',
            avatar: '',
            isSubscribed: true,
            isVerified: true,
            freeTrialActive: result.tier === 'trial',
            freeTrialExpiry: Date.now() + 7 * 86400000,
            subscriptionExpiry: new Date(result.expiresAt).getTime(),
            plan: result.tier === 'trial' ? 'weekly' : result.tier,
            createdAt: Date.now(),
            lastLogin: Date.now(),
          },
          token: 'token-session',
        },
      });

      setSuccess(true);

      // Navigate to home after a short delay
      setTimeout(() => {
        navigate('home');
      }, 800);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Activation failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [code, dispatch, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleActivate();
    }
  };

  // Hidden admin access: tap PStream logo 5 times quickly
  const handleLogoTap = () => {
    logoTapCount.current += 1;
    if (logoTapTimer.current) clearTimeout(logoTapTimer.current);
    logoTapTimer.current = setTimeout(() => { logoTapCount.current = 0; }, 2000);

    if (logoTapCount.current >= 5) {
      logoTapCount.current = 0;
      navigate('admin');
    }
  };

  const whatsappNumber = adminConfig?.whatsapp || '256 700 000 000';
  const currency = adminConfig?.currency || 'UGX';
  const streamPrice = adminConfig?.streamPrice || 2000;
  const downloadPrice = adminConfig?.downloadPrice || 3500;
  const trialEnabled = adminConfig?.trialEnabled ?? true;
  const trialHours = adminConfig?.trialDurationHours || 24;

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

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.4 },
    }),
  };

  // ─── Validating / Loading Screen ─────────────────────────────
  if (isValidating) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-2 border-[#E50914]/30 rounded-full" />
            <div className="absolute inset-0 border-2 border-transparent border-t-[#E50914] rounded-full animate-spin" />
          </div>
          <p className="text-white/50 text-sm">Checking your session...</p>
        </motion.div>
      </div>
    );
  }

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
          <div
            className="inline-flex items-center gap-3 mb-4 cursor-pointer select-none"
            onClick={handleLogoTap}
            role="button"
            tabIndex={0}
          >
            <div className="bg-[#E50914] rounded-xl w-12 h-12 flex items-center justify-center shadow-lg shadow-[#E50914]/30">
              <Play className="text-white w-6 h-6 ml-0.5" />
            </div>
            <span className="text-white font-bold text-3xl tracking-tight">PStream</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            {success ? 'Welcome to PStream!' : 'Activate Your Access'}
          </h1>
          <p className="text-white/50 mt-2 text-sm">
            {success
              ? 'Your access code has been activated'
              : 'Enter your access code to start watching'}
          </p>
        </motion.div>

        {/* Error message */}
        <AnimatePresence>
          {error && !success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-[#E50914]/10 border border-[#E50914]/30 rounded-xl flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-[#E50914] mt-0.5 shrink-0" />
              <p className="text-sm text-[#E50914]/90 flex-1">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-[#E50914]/60 hover:text-[#E50914] text-xs shrink-0"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success message */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3"
            >
              <CheckCircle2 className="w-6 h-6 text-green-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-400">Access Activated!</p>
                <p className="text-xs text-green-400/60 mt-0.5">Redirecting you to the home page...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {!success && (
            <motion.div
              key="token-form"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-[#141414] rounded-2xl p-6 md:p-8 shadow-2xl border border-white/5"
            >
              {/* Code Input */}
              <motion.div custom={0} variants={fadeIn} initial="hidden" animate="visible" className="space-y-3">
                <label htmlFor="access-code" className="text-white/80 text-sm font-medium block">
                  Access Code
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#E50914]" />
                  <Input
                    id="access-code"
                    ref={inputRef}
                    type="text"
                    placeholder="e.g. PS-A3K7X9"
                    value={code}
                    onChange={handleCodeChange}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    maxLength={10}
                    className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-white/25 rounded-xl text-lg font-mono tracking-widest text-center focus:border-[#E50914] focus:ring-[#E50914]/20 transition-all disabled:opacity-50"
                  />
                </div>
                <p className="text-xs text-white/30 text-center">
                  Enter the code you received via WhatsApp
                </p>
              </motion.div>

              {/* Activate Button */}
              <motion.div custom={1} variants={fadeIn} initial="hidden" animate="visible" className="mt-6">
                <Button
                  onClick={handleActivate}
                  disabled={isLoading || code.replace(/[^A-Za-z0-9]/g, '').length < 4}
                  className="w-full h-14 bg-[#E50914] hover:bg-[#E50914]/90 text-white rounded-xl gap-2 font-semibold text-base shadow-lg shadow-[#E50914]/20 hover:shadow-[#E50914]/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Activate Access
                    </>
                  )}
                </Button>
              </motion.div>

              {/* Pricing Info */}
              {adminConfig && (
                <motion.div custom={2} variants={fadeIn} initial="hidden" animate="visible" className="mt-6">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                      <div className="flex justify-center mb-1.5">
                        <div className="w-8 h-8 rounded-lg bg-[#E50914]/10 flex items-center justify-center">
                          <Play className="w-4 h-4 text-[#E50914]" />
                        </div>
                      </div>
                      <p className="text-white font-bold text-sm">{currency} {streamPrice.toLocaleString()}</p>
                      <p className="text-white/40 text-[10px] mt-0.5">Stream Only</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 text-center border border-[#E50914]/20">
                      <div className="flex justify-center mb-1.5">
                        <div className="w-8 h-8 rounded-lg bg-[#E50914]/15 flex items-center justify-center">
                          <Download className="w-4 h-4 text-[#E50914]" />
                        </div>
                      </div>
                      <p className="text-white font-bold text-sm">{currency} {downloadPrice.toLocaleString()}</p>
                      <p className="text-white/40 text-[10px] mt-0.5">Stream + Download</p>
                    </div>
                    {trialEnabled && (
                      <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                        <div className="flex justify-center mb-1.5">
                          <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-yellow-400" />
                          </div>
                        </div>
                        <p className="text-white font-bold text-sm">FREE</p>
                        <p className="text-white/40 text-[10px] mt-0.5">{trialHours}h Trial</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* How to Get Access toggle */}
              <motion.div custom={3} variants={fadeIn} initial="hidden" animate="visible" className="mt-5">
                <button
                  onClick={() => setShowHowTo(!showHowTo)}
                  className="w-full flex items-center justify-center gap-2 text-sm text-white/50 hover:text-white/70 transition-colors py-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>How to get an access code</span>
                  <motion.span
                    animate={{ rotate: showHowTo ? 180 : 0 }}
                    className="text-xs"
                  >
                    ▼
                  </motion.span>
                </button>

                <AnimatePresence>
                  {showHowTo && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-3 bg-white/5 rounded-xl p-4 border border-white/5">
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <MessageCircle className="w-3.5 h-3.5 text-green-400" />
                          </div>
                          <div>
                            <p className="text-white/80 text-sm font-medium">1. WhatsApp Us</p>
                            <p className="text-white/40 text-xs mt-0.5">
                              Send a message to <span className="text-green-400 font-medium">{whatsappNumber}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-white/80 text-sm font-medium">2. Pay via MoMo</p>
                            <p className="text-white/40 text-xs mt-0.5">
                              Pay using MTN MoMo or Airtel Money
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full bg-[#E50914]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <KeyRound className="w-3.5 h-3.5 text-[#E50914]" />
                          </div>
                          <div>
                            <p className="text-white/80 text-sm font-medium">3. Receive Your Code</p>
                            <p className="text-white/40 text-xs mt-0.5">
                              We&apos;ll send your unique access code instantly
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* WhatsApp CTA */}
              <motion.div custom={4} variants={fadeIn} initial="hidden" animate="visible" className="mt-5">
                <a
                  href={`https://wa.me/${whatsappNumber.replace(/\s/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 h-12 bg-green-600 hover:bg-green-600/90 text-white rounded-xl font-medium text-sm transition-colors shadow-lg shadow-green-600/20"
                >
                  <MessageCircle className="w-5 h-5" />
                  Get Code via WhatsApp
                </a>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Features / Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 grid grid-cols-3 gap-3"
        >
          {[
            { icon: Shield, label: 'Device Locked', desc: 'Secure access' },
            { icon: Sparkles, label: 'HD Quality', desc: 'Best streaming' },
            { icon: Smartphone, label: 'Mobile First', desc: 'Watch anywhere' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="text-center">
              <Icon className="w-5 h-5 text-white/20 mx-auto mb-1" />
              <p className="text-white/40 text-[10px] font-medium">{label}</p>
              <p className="text-white/20 text-[9px]">{desc}</p>
            </div>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-xs text-white/15 mt-8"
        >
          By activating, you agree to PStream&apos;s Terms of Service
        </motion.p>
      </div>
    </div>
  );
}
