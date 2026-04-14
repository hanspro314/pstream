/* PStream Help Center — FAQs, Contact, Troubleshooting */

'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle, Search, ChevronDown, ChevronUp, MessageCircle,
  Phone, Mail, FileText, Shield, CreditCard, Monitor,
  Download, Play, User, Settings, ArrowRight, ExternalLink,
  BookOpen, Bug, RefreshCw, Wifi, Volume2, Subtitles
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

// ─── FAQ Categories & Items ───────────────────────────────────────
interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ALL_FAQS: FAQItem[] = [
  // Getting Started
  {
    id: 'gs1', question: 'How do I create a PStream account?',
    answer: 'Creating an account is easy! Download the PStream app or visit our website, click "Sign Up," and enter your phone number. We\'ll send a verification code via SMS. Enter the code, set your name, and you\'re ready to start streaming. The entire process takes less than 30 seconds. You can also sign up with your email address if you prefer.',
    category: 'Getting Started', icon: Play,
  },
  {
    id: 'gs2', question: 'Is PStream available in my country?',
    answer: 'PStream is primarily available in Uganda, with plans to expand across East Africa. You can access PStream from anywhere with an internet connection, but our payment methods (MTN Mobile Money and Airtel Money) are optimized for Ugandan users. We\'re working on adding more payment options for users in Kenya, Tanzania, and Rwanda.',
    category: 'Getting Started', icon: Monitor,
  },
  {
    id: 'gs3', question: 'What devices can I use to watch PStream?',
    answer: 'PStream works on virtually any device with a modern web browser. This includes Android phones and tablets, iPhones and iPads, laptops and desktop computers (Windows, Mac, Linux), smart TVs with a built-in browser, and streaming devices like Chromecast. For the best experience, we recommend using Google Chrome or Safari on mobile devices.',
    category: 'Getting Started', icon: Monitor,
  },
  // Account
  {
    id: 'ac1', question: 'How do I reset my password?',
    answer: 'To reset your password, go to the Login page and tap "Forgot password?" Enter your registered phone number or email address. We\'ll send you a verification code. Once verified, you can set a new password. If you signed up with phone OTP only and don\'t have a password set, simply log in using the OTP method.',
    category: 'Account & Security', icon: Shield,
  },
  {
    id: 'ac2', question: 'How do I change my phone number?',
    answer: 'To update your phone number, go to Profile > Settings > Account Info and tap "Change Phone Number." You\'ll need to verify your current number first, then enter and verify the new number. This ensures your account stays secure. If you no longer have access to your old number, contact our support team for assistance.',
    category: 'Account & Security', icon: Phone,
  },
  {
    id: 'ac3', question: 'How do I set up parental controls?',
    answer: 'PStream offers parental controls through the PIN feature. Go to Profile > Settings > Parental PIN to set a 4-digit PIN. Once set, you can restrict content by maturity rating (U, 7+, 13+, 16+, 18+). The PIN will be required to change these settings or access restricted content. This helps ensure your children only see age-appropriate content.',
    category: 'Account & Security', icon: Shield,
  },
  {
    id: 'ac4', question: 'Can I have multiple profiles on one account?',
    answer: 'Currently, PStream supports one primary profile per account. However, we\'re working on adding multi-profile support (similar to Netflix profiles) which will allow up to 5 profiles per account, each with its own watchlist, preferences, and parental controls. This feature is coming soon in a future update.',
    category: 'Account & Security', icon: User,
  },
  // Subscription & Payment
  {
    id: 'sp1', question: 'How much does PStream Premium cost?',
    answer: 'PStream offers flexible plans at pocket-friendly rates. Check the token page for the latest pricing on Stream and Stream + Download plans. New users also get a free trial to explore the platform before committing.',
    category: 'Subscription & Payment', icon: CreditCard,
  },
  {
    id: 'sp2', question: 'How do I pay using MTN Mobile Money?',
    answer: 'Paying with MTN Mobile Money is simple: 1) Go to the Subscribe page, 2) Select "MTN MoMo" as your payment method, 3) Enter your MTN phone number, 4) Click "Subscribe Now," 5) You\'ll receive an MTN MoMo prompt on your phone — enter your PIN to confirm. The payment is instant and your Premium access activates immediately. Make sure you have sufficient balance on your MTN line.',
    category: 'Subscription & Payment', icon: Phone,
  },
  {
    id: 'sp3', question: 'How do I cancel my subscription?',
    answer: 'You can cancel your subscription anytime from Profile > Settings > Manage Subscription. Simply tap "Cancel Subscription" and confirm. Your Premium access will continue until the end of your current billing period — we don\'t prorate or refund unused days, but you\'ll keep full access until your plan expires. No cancellation fees, no contracts.',
    category: 'Subscription & Payment', icon: CreditCard,
  },
  {
    id: 'sp4', question: 'Do you offer a Family Plan?',
    answer: 'Yes! Our Family Plan allows up to 4 simultaneous streams and supports 4 devices. Each family member can have their own profile with personalized recommendations. The Family Plan is perfect for households that want everyone to enjoy PStream at the same time. Check the token page for current pricing.',
    category: 'Subscription & Payment', icon: User,
  },
  {
    id: 'sp5', question: 'How do promo codes work?',
    answer: 'Promo codes give you discounts on subscription plans. To use a promo code: 1) Go to the Subscribe page, 2) Enter your phone number, 3) Click "Have a promo code?", 4) Enter the code and click Apply. The discount will be reflected in the final price. Promo codes have expiration dates and may have usage limits. Follow us on social media for exclusive promo codes!',
    category: 'Subscription & Payment', icon: CreditCard,
  },
  // Playback & Streaming
  {
    id: 'ps1', question: 'The video keeps buffering. What can I do?',
    answer: 'Buffering is usually caused by a slow internet connection. Try these steps: 1) Check your internet speed — we recommend at least 2 Mbps for SD and 5 Mbps for HD, 2) Switch to a lower quality in the video player settings (tap the gear icon), 3) Move closer to your Wi-Fi router or switch to a stronger network, 4) Close other apps that might be using bandwidth, 5) If using mobile data, try Wi-Fi instead. PStream automatically adjusts quality based on your connection speed.',
    category: 'Playback & Streaming', icon: Wifi,
  },
  {
    id: 'ps2', question: 'How do I enable subtitles?',
    answer: 'To enable subtitles while watching a video, tap anywhere on the player to show controls, then tap the Settings (gear) icon. Select "Subtitles" and choose your preferred language. PStream supports English, Luganda, Swahili, and Arabic subtitles. You can also toggle subtitles quickly by pressing "C" on a keyboard. Subtitle size can be adjusted in your profile settings.',
    category: 'Playback & Streaming', icon: Subtitles,
  },
  {
    id: 'ps3', question: 'How do I change video quality?',
    answer: 'To change video quality, tap the gear icon in the video player while a video is playing. Select "Quality" and choose from Auto, 1080p, 720p, 480p, or 360p. "Auto" is recommended as it automatically adjusts quality based on your internet speed. You can also set a default quality in Profile > Settings > Video Quality. Note that higher quality uses more data.',
    category: 'Playback & Streaming', icon: Monitor,
  },
  {
    id: 'ps4', question: 'Can I download movies to watch offline?',
    answer: 'Yes! PStream Premium subscribers can download movies for offline viewing. Tap the Download button on any movie\'s detail page. Downloads are available in Standard quality to save storage space. To manage your downloads, go to Profile > Downloads. Downloaded content expires after 7 days or 48 hours after you start watching, whichever comes first.',
    category: 'Playback & Streaming', icon: Download,
  },
  {
    id: 'ps5', question: 'There is no sound. How do I fix it?',
    answer: 'If you can\'t hear audio: 1) Check that your device\'s volume is turned up, 2) Make sure the video isn\'t muted — tap the volume icon in the player, 3) Try using headphones, 4) Check if your device is in "Do Not Disturb" mode, 5) Close and reopen the video, 6) On iPhone, check the silent switch on the side. If the problem persists, try a different video to rule out a content-specific issue.',
    category: 'Playback & Streaming', icon: Volume2,
  },
  // Troubleshooting
  {
    id: 'ts1', question: 'The app is not loading. What should I do?',
    answer: 'If PStream isn\'t loading: 1) Check your internet connection, 2) Try refreshing the page (F5 or Ctrl+R), 3) Clear your browser cache and cookies, 4) Try a different browser, 5) If using the mobile web, close other tabs, 6) Check our social media for any service updates. If the issue persists after trying these steps, please contact our support team with details about your device and browser.',
    category: 'Troubleshooting', icon: RefreshCw,
  },
  {
    id: 'ts2', question: 'I found a bug. How do I report it?',
    answer: 'We appreciate bug reports! You can report bugs by: 1) Emailing us at support@pstream.ug, 2) Using the in-app feedback form (Profile > Help > Report a Bug), 3) Messaging us on our social media channels. Please include: what you were doing when the bug occurred, your device type and browser, and screenshots if possible. Our team typically responds within 24 hours.',
    category: 'Troubleshooting', icon: Bug,
  },
];

const CATEGORIES = ['All', 'Getting Started', 'Account & Security', 'Subscription & Payment', 'Playback & Streaming', 'Troubleshooting'];

// ─── Contact Options ──────────────────────────────────────────────
const CONTACT_OPTIONS = [
  {
    icon: MessageCircle,
    title: 'Live Chat',
    description: 'Chat with us in real-time',
    action: 'Start Chat',
    available: true,
    responseTime: 'Instant',
  },
  {
    icon: Phone,
    title: 'Call Us',
    description: 'Speak with our team directly',
    action: '+256 700 123 456',
    available: true,
    responseTime: 'Mon-Fri, 9AM-6PM',
  },
  {
    icon: Mail,
    title: 'Email Support',
    description: 'Detailed assistance via email',
    action: 'support@pstream.ug',
    available: true,
    responseTime: 'Within 24 hours',
  },
  {
    icon: MessageCircle,
    title: 'Social Media',
    description: 'Reach us on social platforms',
    action: '@PStreamUG',
    available: true,
    responseTime: 'Within 12 hours',
  },
];

// ─── Quick Links ──────────────────────────────────────────────────
const QUICK_LINKS = [
  { icon: FileText, title: 'Terms of Service', href: '#' },
  { icon: Shield, title: 'Privacy Policy', href: '#' },
  { icon: CreditCard, title: 'Refund Policy', href: '#' },
  { icon: BookOpen, title: 'Content Guidelines', href: '#' },
];

export default function HelpCenter() {
  const { navigate } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [showContact, setShowContact] = useState(false);

  const filteredFaqs = useMemo(() => {
    let faqs = ALL_FAQS;
    if (activeCategory !== 'All') {
      faqs = faqs.filter(f => f.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      faqs = faqs.filter(f =>
        f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
      );
    }
    return faqs;
  }, [activeCategory, searchQuery]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-20 px-4 md:px-12 pb-24 md:pb-8"
    >
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="w-16 h-16 bg-[#E50914]/10 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <HelpCircle className="w-8 h-8 text-[#E50914]" />
          </motion.div>
          <h1 className="text-white text-2xl md:text-3xl font-bold mb-2">Help Center</h1>
          <p className="text-white/50 text-sm max-w-md mx-auto">
            Find answers to common questions, troubleshoot issues, or contact our support team
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for help..."
            className="w-full bg-[#1A1A1A] text-white placeholder:text-white/30 rounded-xl pl-12 pr-4 py-3.5 text-sm border border-white/10 focus:outline-none focus:border-[#E50914]/50"
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all ${
                activeCategory === cat
                  ? 'bg-[#E50914] text-white'
                  : 'bg-[#1A1A1A] text-white/60 hover:text-white hover:bg-[#252525]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="space-y-2 mb-8">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, index) => {
              const isExpanded = expandedFaq === faq.id;
              return (
                <motion.div
                  key={faq.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="bg-[#1A1A1A] rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFaq(isExpanded ? null : faq.id)}
                    className="w-full flex items-start gap-3 p-4 text-left hover:bg-[#222] transition-colors"
                    aria-expanded={isExpanded}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#E50914]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <faq.icon className="w-4 h-4 text-[#E50914]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-white text-sm font-medium pr-2">{faq.question}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-white/40 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-white/40 flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-white/30 text-[10px]">{faq.category}</span>
                    </div>
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pl-15">
                          <p className="text-white/60 text-sm leading-relaxed">{faq.answer}</p>
                          <div className="mt-3 pt-3 border-t border-white/5">
                            <p className="text-white/30 text-xs">Was this helpful?</p>
                            <div className="flex gap-2 mt-2">
                              <button className="px-3 py-1 bg-[#E50914]/10 text-[#E50914] text-xs rounded-lg hover:bg-[#E50914]/20 transition-colors">
                                Yes, helpful
                              </button>
                              <button className="px-3 py-1 bg-white/5 text-white/50 text-xs rounded-lg hover:bg-white/10 transition-colors">
                                No, not helpful
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="w-10 h-10 text-white/20 mb-3" />
              <p className="text-white/60 text-base font-medium mb-1">No results found</p>
              <p className="text-white/30 text-sm">Try different search terms or browse categories</p>
            </div>
          )}
        </div>

        {/* Contact Section */}
        <div className="mb-8">
          <button
            onClick={() => setShowContact(!showContact)}
            className="w-full flex items-center justify-between bg-[#1A1A1A] hover:bg-[#222] rounded-xl p-4 transition-colors"
          >
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-[#E50914]" />
              <div>
                <p className="text-white text-sm font-medium">Still need help?</p>
                <p className="text-white/40 text-xs">Contact our support team</p>
              </div>
            </div>
            {showContact ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
          </button>

          <AnimatePresence>
            {showContact && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  {CONTACT_OPTIONS.map(({ icon: Icon, title, description, action, responseTime }) => (
                    <div key={title} className="bg-[#1A1A1A] rounded-xl p-4 hover:bg-[#222] transition-colors cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#E50914]/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-[#E50914]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white text-sm font-medium">{title}</h4>
                          <p className="text-white/50 text-xs mt-0.5">{description}</p>
                          <p className="text-[#E50914] text-xs font-medium mt-2">{action}</p>
                          <p className="text-white/30 text-[10px] mt-1">{responseTime}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-white text-sm font-semibold mb-3">Legal & Policies</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {QUICK_LINKS.map(({ icon: Icon, title, href }) => (
              <a
                key={title}
                href={href}
                className="flex items-center justify-between bg-[#1A1A1A] hover:bg-[#222] rounded-xl p-3 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-white/40" />
                  <span className="text-white/70 text-sm">{title}</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
