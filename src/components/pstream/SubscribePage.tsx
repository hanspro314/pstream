/* PStream Subscribe Page — Enhanced with plans comparison, family plan, promo codes, payment history */

'use client';

import React, { useState, useMemo } from 'react';
import {
  Crown, Check, Star, Shield, Zap, Download, Monitor, X,
  ChevronDown, Phone, CreditCard, Users, Gift, Tag, History,
  ArrowRight, Sparkles, CheckCircle2, Smartphone, Play, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import type { PaymentRecord, SubscriptionPlan } from '@/lib/types';

// ─── Plans ────────────────────────────────────────────────────────
function buildPlans(streamPrice: number, downloadPrice: number, currency: string): (SubscriptionPlan & { savings?: string; highlight?: boolean })[] {
  const weeklySave = Math.max(0, streamPrice * 4 - streamPrice * 3);
  const annualSave = Math.max(0, streamPrice * 52 - streamPrice * 26);
  return [
    {
      id: 'weekly', name: 'Weekly', price: streamPrice, currency, duration: 'week',
      screens: 1, quality: 'HD',
      features: ['Unlimited streaming', 'HD quality', '1 screen', 'Mobile + tablet', 'Ad-free experience'],
    },
    {
      id: 'monthly', name: 'Monthly', price: streamPrice * 3, currency, duration: 'month',
      screens: 2, quality: 'Full HD',
      features: ['Everything in Weekly', 'Full HD quality', '2 screens', 'Download & offline', 'Priority support'],
      savings: weeklySave > 0 ? `Save ${currency} ${weeklySave.toLocaleString()}` : 'Best value',
      highlight: true,
    },
    {
      id: 'annual', name: 'Annual', price: streamPrice * 26, currency, duration: 'year',
      screens: 4, quality: '4K Ultra HD',
      features: ['Everything in Monthly', '4K Ultra HD', '4 screens', 'Early access to new releases', 'Family sharing'],
      savings: annualSave > 0 ? `Save ${currency} ${annualSave.toLocaleString()}` : 'Best value',
    },
    {
      id: 'family', name: 'Family', price: downloadPrice, currency, duration: 'week',
      screens: 4, quality: 'Full HD',
      features: ['Everything in Monthly', '4 simultaneous screens', '4 individual profiles', 'Kids mode included', 'Family recommendations'],
      popular: true,
    },
  ];
}

// ─── Features list ────────────────────────────────────────────────
const ALL_FEATURES = [
  { icon: Zap, title: 'Unlimited Streaming', desc: 'Watch as much as you want, anytime' },
  { icon: Monitor, title: 'HD & 4K Quality', desc: 'Crystal clear video quality up to 4K' },
  { icon: Download, title: 'Download & Watch Offline', desc: 'Save movies for later viewing' },
  { icon: Star, title: 'New Releases Daily', desc: 'Fresh content every single day' },
  { icon: Smartphone, title: 'Multiple Devices', desc: 'Stream on phone, tablet, laptop, or TV' },
  { icon: Shield, title: 'No Ads', desc: 'Uninterrupted viewing experience' },
  { icon: Users, title: 'Family Profiles', desc: 'Separate profiles for each family member' },
  { icon: Play, title: 'Kids Mode', desc: 'Safe, curated content for children' },
];

// ─── Testimonials ─────────────────────────────────────────────────
const testimonials = [
  { name: 'Agnes N.', location: 'Kampala', text: 'PStream has the best Ugandan movies! I love how I can watch on my phone during the commute. The quality is amazing and the price is so affordable.', rating: 5 },
  { name: 'Samuel K.', location: 'Entebbe', text: 'This is way better than other streaming apps. No buffering, great selection, and the price is unbeatable. My whole family uses it.', rating: 5 },
  { name: 'Patience M.', location: 'Jinja', text: 'I love the download feature — I can watch movies even when I don\'t have data. PStream changed how I entertain myself!', rating: 5 },
];

// ─── Payment History (demo) ───────────────────────────────────────
function buildDemoPayments(streamPrice: number): PaymentRecord[] {
  return [
    { id: 'pay1', amount: streamPrice, method: 'mtn_momo', status: 'success', date: '2024-04-10', plan: 'Weekly', reference: 'PST-20240410-001' },
    { id: 'pay2', amount: streamPrice * 3, method: 'airtel_money', status: 'success', date: '2024-04-03', plan: 'Monthly', reference: 'PST-20240403-002' },
    { id: 'pay3', amount: streamPrice, method: 'mtn_momo', status: 'success', date: '2024-03-27', plan: 'Weekly', reference: 'PST-20240327-003' },
    { id: 'pay4', amount: streamPrice, method: 'mtn_momo', status: 'failed', date: '2024-03-20', plan: 'Weekly', reference: 'PST-20240320-004' },
    { id: 'pay5', amount: streamPrice * 26, method: 'airtel_money', status: 'success', date: '2024-03-01', plan: 'Annual', reference: 'PST-20240301-005' },
    { id: 'pay6', amount: streamPrice, method: 'mtn_momo', status: 'success', date: '2024-02-15', plan: 'Weekly', reference: 'PST-20240215-006' },
  ];
}

// ─── Promo Codes (demo) ───────────────────────────────────────────
const DEMO_PROMOS = [
  { code: 'WELCOME50', discount: 50, duration: 'week' },
  { code: 'STREAM1K', discount: 50, duration: 'week' },
  { code: 'FAMILY20', discount: 20, duration: 'month' },
];

// ─── FAQs ─────────────────────────────────────────────────────────
const faqs = [
  { q: 'How much does PStream Premium cost?', a: 'PStream offers flexible plans at pocket-friendly rates. Check the token page for the latest pricing on Stream and Stream + Download plans. We keep our prices affordable for every student!' },
  { q: 'What payment methods do you accept?', a: 'We accept MTN Mobile Money and Airtel Money. Simply enter your phone number and confirm the payment prompt on your device.' },
  { q: 'Can I watch on multiple devices?', a: 'The number of devices depends on your plan. Weekly allows 1 screen, Monthly allows 2 screens, and Annual/Family plans support up to 4 simultaneous screens.' },
  { q: 'How do I cancel my subscription?', a: 'You can cancel anytime from Profile > Settings. No questions asked, no hidden fees. Your access continues until the end of your billing period.' },
  { q: 'Is there a free trial?', a: 'Yes! New users get a 1-day free trial. No payment required — just sign up and enjoy 24 hours of unlimited streaming.' },
  { q: 'How do promo codes work?', a: 'Enter a promo code during checkout to get a discount on your subscription. Follow us on social media for exclusive promo codes! Codes have expiration dates and usage limits.' },
  { q: 'What is the Family Plan?', a: 'The Family Plan supports up to 4 simultaneous streams and 4 individual profiles. It includes Kids Mode and family-friendly content recommendations. Check the token page for current pricing.' },
  { q: 'What movies are available?', a: 'We have thousands of movies across all genres — Action, Romance, Drama, Horror, Comedy, Sci-Fi, and more. New content is added daily!' },
];

type SubscribeTab = 'plans' | 'payment' | 'history';

export default function SubscribePage() {
  const { state, dispatch, navigate } = useAppStore();
  const [activeTab, setActiveTab] = useState<SubscribeTab>('plans');
  const [selectedPlan, setSelectedPlan] = useState<string>('weekly');
  const [paymentMethod, setPaymentMethod] = useState<'mtn' | 'airtel'>('mtn');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [discount, setDiscount] = useState(0);

  const adminCfg = state.adminConfig;
  const currency = adminCfg?.currency || 'UGX';
  const streamPrice = adminCfg?.streamPrice || 2000;
  const downloadPrice = adminCfg?.downloadPrice || 3500;

  const PLANS = useMemo(() => buildPlans(streamPrice, downloadPrice, currency), [streamPrice, downloadPrice, currency]);
  const demoPaymentHistory = useMemo(() => buildDemoPayments(streamPrice), [streamPrice]);

  const currentPlan = PLANS.find(p => p.id === selectedPlan)!;
  const finalPrice = currentPlan ? Math.round(currentPlan.price * (1 - discount / 100)) : 0;

  const handleApplyPromo = () => {
    const promo = DEMO_PROMOS.find(p => p.code.toLowerCase() === promoCode.toLowerCase());
    if (promo) {
      setDiscount(promo.discount);
      setPromoApplied(true);
      setPromoError('');
    } else {
      setPromoError('Invalid promo code. Please try again.');
      setDiscount(0);
      setPromoApplied(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoCode('');
    setDiscount(0);
    setPromoApplied(false);
    setPromoError('');
  };

  const handleSubscribe = async () => {
    if (!phoneNumber || phoneNumber.length < 10) return;
    setIsProcessing(true);
    setTimeout(() => {
      dispatch({ type: 'TOGGLE_SUBSCRIPTION' });
      setIsProcessing(false);
    }, 2000);
  };

  const handleFreeTrial = () => {
    dispatch({ type: 'TOGGLE_SUBSCRIPTION' });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-20 px-4 md:px-12 pb-24 md:pb-8"
    >
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 bg-[#E50914]/10 border border-[#E50914]/20 rounded-full px-4 py-1.5 mb-4">
          <Crown className="w-4 h-4 text-[#E50914]" />
          <span className="text-[#E50914] text-sm font-medium">Premium Plans</span>
        </div>
        <h1 className="text-white text-3xl md:text-5xl font-bold mb-4">
          Stream. Discover. Enjoy.
        </h1>
        <p className="text-white/60 text-base md:text-lg">
          Choose the plan that&apos;s right for you — starting at just <span className="text-[#E50914] font-bold">{currency} {streamPrice.toLocaleString()}/week</span>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-2 mb-8">
        {([
          { id: 'plans' as SubscribeTab, label: 'Plans' },
          { id: 'payment' as SubscribeTab, label: 'Payment' },
          { id: 'history' as SubscribeTab, label: 'History' },
        ]).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === id
                ? 'bg-[#E50914] text-white'
                : 'bg-white/10 text-white/60 hover:text-white hover:bg-white/15'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <div className="max-w-4xl mx-auto">
          {/* Plan cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {PLANS.map(plan => {
              const isSelected = selectedPlan === plan.id;
              return (
                <motion.div
                  key={plan.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative cursor-pointer rounded-2xl p-5 transition-all border ${
                    isSelected
                      ? 'bg-[#1A1A1A] border-[#E50914] shadow-lg shadow-[#E50914]/10'
                      : 'bg-[#141414] border-white/5 hover:border-white/15'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E50914] text-white text-[10px] font-bold px-3 py-1 rounded-full">
                      Most Popular
                    </div>
                  )}
                  {plan.savings && (
                    <div className="absolute -top-3 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {plan.savings}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <Crown className={`w-5 h-5 ${isSelected ? 'text-[#E50914]' : 'text-white/30'}`} />
                    <span className="text-white font-semibold">{plan.name}</span>
                  </div>

                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-white text-2xl font-bold">{plan.currency} {plan.price.toLocaleString()}</span>
                    <span className="text-white/40 text-xs">/{plan.duration}</span>
                  </div>

                  <div className="flex items-center gap-3 text-white/40 text-[10px] mb-4">
                    <span className="flex items-center gap-1"><Monitor className="w-3 h-3" />{plan.screens} screen{plan.screens > 1 ? 's' : ''}</span>
                    <span className="flex items-center gap-1"><Play className="w-3 h-3" />{plan.quality}</span>
                  </div>

                  <ul className="space-y-2 mb-5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-xs">
                        <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-white/60">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-[#E50914] text-white hover:bg-[#ff1a25]'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {isSelected ? <><CheckCircle2 className="w-4 h-4 inline mr-1" />Selected</> : 'Select'}
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* Features */}
          <div className="mb-12">
            <h2 className="text-white text-xl md:text-2xl font-bold text-center mb-8">
              Everything you get with Premium
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {ALL_FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3 bg-[#1A1A1A] rounded-xl p-4 hover:bg-[#252525] transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-[#E50914]/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-[#E50914]" />
                  </div>
                  <div>
                    <h3 className="text-white text-sm font-semibold mb-0.5">{title}</h3>
                    <p className="text-white/50 text-xs">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonials */}
          <div className="mb-12">
            <h2 className="text-white text-xl md:text-2xl font-bold text-center mb-8">
              Loved by thousands across Uganda
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {testimonials.map((t) => (
                <div key={t.name} className="bg-[#1A1A1A] rounded-xl p-5">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 text-yellow-400" fill="#facc15" />
                    ))}
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
                  <div>
                    <p className="text-white text-sm font-medium">{t.name}</p>
                    <p className="text-white/40 text-xs">{t.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto">
            <h2 className="text-white text-xl md:text-2xl font-bold text-center mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-2">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-[#1A1A1A] rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-[#252525] transition-colors"
                    aria-expanded={openFaq === i}
                  >
                    <span className="text-white text-sm font-medium pr-4">{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-white/50 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 text-white/60 text-sm leading-relaxed">{faq.a}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Payment Tab */}
      {activeTab === 'payment' && (
        <div className="max-w-md mx-auto">
          <div className="relative bg-gradient-to-br from-[#E50914] to-[#831010] rounded-2xl p-6 md:p-8 overflow-hidden mb-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-6 h-6 text-yellow-300" />
                <span className="text-white/90 font-medium">PStream {currentPlan.name}</span>
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-white text-4xl font-bold">
                  {discount > 0 ? (
                    <>
                      <span className="text-lg line-through opacity-50 mr-1">{currency} {currentPlan.price.toLocaleString()}</span>
                      <span>{currency} {finalPrice.toLocaleString()}</span>
                    </>
                  ) : (
                    <>{currency} {currentPlan.price.toLocaleString()}</>
                  )}
                </span>
                <span className="text-white/60 text-sm">/{currentPlan.duration}</span>
              </div>
              {discount > 0 && (
                <div className="inline-flex items-center gap-1 bg-green-500/20 text-green-400 text-xs font-medium px-2 py-0.5 rounded-full mb-4">
                  <Tag className="w-3 h-3" />
                  {discount}% discount applied!
                </div>
              )}
              <p className="text-white/50 text-sm mb-6">
                {currentPlan.screens} screen{currentPlan.screens > 1 ? 's' : ''} · {currentPlan.quality}
              </p>

              {/* Payment method */}
              <div className="flex gap-2 mb-4">
                <button onClick={() => setPaymentMethod('mtn')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${paymentMethod === 'mtn' ? 'bg-white text-[#E50914]' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                  <Phone className="w-4 h-4" />
                  MTN MoMo
                </button>
                <button onClick={() => setPaymentMethod('airtel')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${paymentMethod === 'airtel' ? 'bg-white text-[#E50914]' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                  <CreditCard className="w-4 h-4" />
                  Airtel Money
                </button>
              </div>

              {/* Phone */}
              <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter phone number (e.g. 077XXXXXXX)"
                className="w-full bg-white/10 text-white placeholder:text-white/40 rounded-lg px-4 py-3 border border-white/20 focus:outline-none focus:border-white/50 mb-3 text-sm"
              />

              {/* Promo code */}
              {!showPromoInput ? (
                <button onClick={() => setShowPromoInput(true)} className="flex items-center gap-1.5 text-white/60 hover:text-white text-xs transition-colors mb-4">
                  <Gift className="w-3.5 h-3.5" />
                  Have a promo code?
                </button>
              ) : (
                <div className="mb-4">
                  {promoApplied ? (
                    <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-green-400" />
                        <span className="text-green-400 text-xs font-medium">{promoCode.toUpperCase()} — {discount}% off</span>
                      </div>
                      <button onClick={handleRemovePromo} className="text-green-400/60 hover:text-green-400"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input type="text" value={promoCode} onChange={(e) => { setPromoCode(e.target.value); setPromoError(''); }}
                        placeholder="Enter promo code" className="flex-1 bg-white/10 text-white placeholder:text-white/40 rounded-lg px-3 py-2 border border-white/20 focus:outline-none focus:border-white/50 text-sm uppercase"
                      />
                      <button onClick={handleApplyPromo} disabled={!promoCode.trim()} className="bg-white/20 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-white/30 disabled:opacity-50 transition-all">Apply</button>
                    </div>
                  )}
                  {promoError && <p className="text-red-400 text-[10px] mt-1">{promoError}</p>}
                  <p className="text-white/30 text-[10px] mt-1">Try: WELCOME50, STREAM1K, FAMILY20</p>
                </div>
              )}

              <button onClick={handleSubscribe} disabled={isProcessing || phoneNumber.length < 10}
                className="w-full bg-white text-[#E50914] font-bold py-3 rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isProcessing ? (
                  <><div className="w-4 h-4 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />Processing...</>
                ) : (
                  <><CreditCard className="w-4 h-4" />Pay {currency} {finalPrice.toLocaleString()}</>
                )}
              </button>
            </div>
          </div>

          <div className="text-center">
            <button onClick={handleFreeTrial} className="text-[#E50914] hover:text-[#ff1a25] text-sm font-medium transition-colors underline underline-offset-2">
              Try 1 day free — No payment required
            </button>
          </div>
        </div>
      )}

      {/* Payment History Tab */}
      {activeTab === 'history' && (
        <div className="max-w-2xl mx-auto">
          <h2 className="text-white text-lg font-bold mb-4">Payment History</h2>

          {state.profile.subscription.active && (
            <div className="bg-gradient-to-r from-[#E50914]/10 to-[#831010]/10 border border-[#E50914]/20 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/50 text-xs">Current Plan</p>
                  <p className="text-white text-sm font-semibold">{state.profile.subscription.plan}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Expires</p>
                  <p className="text-white text-sm font-semibold">
                    {state.profile.subscription.expiryDate
                      ? new Date(state.profile.subscription.expiryDate).toLocaleDateString('en-UG')
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-white/50 text-xs">Status</p>
                  <span className="text-green-400 text-sm font-semibold">Active</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {demoPaymentHistory.map((payment) => (
              <div key={payment.id} className="flex items-center gap-3 bg-[#1A1A1A] rounded-xl p-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  payment.status === 'success' ? 'bg-green-500/10' : 'bg-red-500/10'
                }`}>
                  {payment.method === 'mtn_momo' ? (
                    <Phone className={`w-5 h-5 ${payment.status === 'success' ? 'text-green-400' : 'text-red-400'}`} />
                  ) : (
                    <CreditCard className={`w-5 h-5 ${payment.status === 'success' ? 'text-green-400' : 'text-red-400'}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">{payment.plan}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      payment.status === 'success' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                    }`}>
                      {payment.status}
                    </span>
                  </div>
                  <p className="text-white/30 text-xs">{payment.reference}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-white text-sm font-medium">{currency} {payment.amount.toLocaleString()}</p>
                  <p className="text-white/30 text-xs">{new Date(payment.date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
