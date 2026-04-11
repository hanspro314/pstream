/* PStream Subscribe Page — Subscription plans and payment */

'use client';

import React, { useState } from 'react';
import {
  Crown, Check, Star, Shield, Zap, Download, Monitor, X,
  ChevronDown, Phone, CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';

const features = [
  { icon: Zap, title: 'Unlimited Streaming', desc: 'Watch as much as you want, anytime' },
  { icon: Monitor, title: 'HD Quality', desc: 'Crystal clear video quality' },
  { icon: Download, title: 'Download & Watch Offline', desc: 'Save movies for later viewing' },
  { icon: Star, title: 'New Releases Daily', desc: 'Fresh content every single day' },
  { icon: Monitor, title: 'Multiple Devices', desc: 'Stream on phone, tablet, or TV' },
  { icon: Shield, title: 'No Ads', desc: 'Uninterrupted viewing experience' },
  { icon: X, title: 'Cancel Anytime', desc: 'No contracts or commitments' },
];

const testimonials = [
  {
    name: 'Agnes N.',
    location: 'Kampala',
    text: 'PStream has the best Ugandan movies! I love how I can watch on my phone during the commute. The quality is amazing for just 2K per week.',
    rating: 5,
  },
  {
    name: 'Samuel K.',
    location: 'Entebbe',
    text: 'This is way better than other streaming apps. No buffering, great selection, and the price is unbeatable. My whole family uses it.',
    rating: 5,
  },
  {
    name: 'Patience M.',
    location: 'Jinja',
    text: 'I love the download feature — I can watch movies even when I don\'t have data. PStream changed how I entertain myself!',
    rating: 5,
  },
];

const faqs = [
  {
    q: 'How much does PStream Premium cost?',
    a: 'PStream Premium costs just UGX 2,000 per week. That\'s less than a soda! You also get a 1-day free trial to start.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept MTN Mobile Money and Airtel Money. Simply enter your phone number and confirm the payment prompt.',
  },
  {
    q: 'Can I watch on multiple devices?',
    a: 'Yes! Your PStream Premium subscription works on your phone, tablet, laptop, and smart TV — all at the same time.',
  },
  {
    q: 'How do I cancel my subscription?',
    a: 'You can cancel anytime from your Profile page. No questions asked, no hidden fees. Your access continues until the end of your billing period.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes! New users get a 1-day free trial. No payment required to start — just sign up and enjoy 24 hours of unlimited streaming.',
  },
  {
    q: 'What movies are available?',
    a: 'We have thousands of movies across all genres — Action, Romance, Drama, Horror, Comedy, Sci-Fi, and more. New content is added daily!',
  },
];

export default function SubscribePage() {
  const { state, dispatch } = useAppStore();
  const [paymentMethod, setPaymentMethod] = useState<'mtn' | 'airtel'>('mtn');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubscribe = async () => {
    if (!phoneNumber || phoneNumber.length < 10) return;
    setIsProcessing(true);
    // Simulate payment processing
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
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 bg-[#E50914]/10 border border-[#E50914]/20 rounded-full px-4 py-1.5 mb-4">
          <Crown className="w-4 h-4 text-[#E50914]" />
          <span className="text-[#E50914] text-sm font-medium">Premium Plan</span>
        </div>
        <h1 className="text-white text-3xl md:text-5xl font-bold mb-4">
          Stream. Discover. Enjoy.
        </h1>
        <p className="text-white/60 text-base md:text-lg">
          Unlimited movies and series for just <span className="text-[#E50914] font-bold">UGX 2,000/week</span>
        </p>
      </div>

      {/* Plan Card */}
      <div className="max-w-md mx-auto mb-16">
        <div className="relative bg-gradient-to-br from-[#E50914] to-[#831010] rounded-2xl p-6 md:p-8 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-6 h-6 text-yellow-300" />
              <span className="text-white/90 font-medium">PStream Premium</span>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-white text-4xl md:text-5xl font-bold">UGX 2,000</span>
              <span className="text-white/60 text-sm">/week</span>
            </div>
            <p className="text-white/50 text-sm mb-6">That&apos;s less than UGX 300 per day!</p>

            {/* Payment method toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setPaymentMethod('mtn')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  paymentMethod === 'mtn'
                    ? 'bg-white text-[#E50914]'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                <Phone className="w-4 h-4" />
                MTN MoMo
              </button>
              <button
                onClick={() => setPaymentMethod('airtel')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  paymentMethod === 'airtel'
                    ? 'bg-white text-[#E50914]'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Airtel Money
              </button>
            </div>

            {/* Phone number input */}
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter phone number (e.g. 077XXXXXXX)"
              className="w-full bg-white/10 text-white placeholder:text-white/40 rounded-lg px-4 py-3 border border-white/20 focus:outline-none focus:border-white/50 mb-4 text-sm"
            />

            <button
              onClick={handleSubscribe}
              disabled={isProcessing || phoneNumber.length < 10}
              className="w-full bg-white text-[#E50914] font-bold py-3 rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Subscribe Now
                </>
              )}
            </button>
          </div>
        </div>

        {/* Free trial */}
        <div className="text-center mt-4">
          <button
            onClick={handleFreeTrial}
            className="text-[#E50914] hover:text-[#ff1a25] text-sm font-medium transition-colors underline underline-offset-2"
          >
            Try 1 day free — No payment required
          </button>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-3xl mx-auto mb-16">
        <h2 className="text-white text-xl md:text-2xl font-bold text-center mb-8">
          Everything you get with Premium
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex items-start gap-3 bg-[#1A1A1A] rounded-xl p-4 hover:bg-[#252525] transition-colors"
            >
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
      <div className="max-w-3xl mx-auto mb-16">
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
                <ChevronDown
                  className={`w-4 h-4 text-white/50 flex-shrink-0 transition-transform ${
                    openFaq === i ? 'rotate-180' : ''
                  }`}
                />
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
                    <div className="px-4 pb-4 text-white/60 text-sm leading-relaxed">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
