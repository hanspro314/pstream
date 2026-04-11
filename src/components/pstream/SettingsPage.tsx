/* PStream Settings Page — Comprehensive app settings */

'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Globe, Monitor, Bell, Shield, Lock, Palette,
  Wifi, HardDrive, Download, ChevronRight, Eye, EyeOff,
  Volume2, Subtitles, User, Smartphone, Trash2, LogOut,
  Info, FileText, Heart, ExternalLink, Moon, Sun, Zap,
  ToggleLeft, ToggleRight, CreditCard, MessageCircle, HelpCircle,
  Check, X, AlertTriangle, Search
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

// ─── Settings Sections ────────────────────────────────────────────
type SettingsSection = 'account' | 'playback' | 'notifications' | 'downloads' | 'privacy' | 'about';

const SECTIONS: { id: SettingsSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'playback', label: 'Playback', icon: Monitor },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'downloads', label: 'Downloads', icon: Download },
  { id: 'privacy', label: 'Privacy & Security', icon: Shield },
  { id: 'about', label: 'About', icon: Info },
];

export default function SettingsPage() {
  const { state, dispatch, navigate } = useAppStore();
  const [activeSection, setActiveSection] = useState<SettingsSection>('account');
  const { settings } = state.profile;

  // Account state
  const [name, setName] = useState(state.profile.name);
  const [email, setEmail] = useState(state.profile.email);
  const [language, setLanguage] = useState(settings.language);
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  // Parental controls
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Data usage tracking
  const dataUsage = {
    streaming: { used: '1.2 GB', limit: 'Unlimited' },
    downloads: { used: '450 MB', limit: '2 GB' },
    total: '1.65 GB',
  };

  const handleSaveProfile = useCallback(() => {
    dispatch({ type: 'UPDATE_PROFILE', payload: { name, email } });
    dispatch({ type: 'UPDATE_SETTINGS', payload: { language } });
    setIsEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [name, email, language, dispatch]);

  const handleSetParentalPin = useCallback(() => {
    if (newPin.length !== 4) {
      setPinError('PIN must be 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('PINs do not match');
      return;
    }
    dispatch({ type: 'UPDATE_SETTINGS', payload: { parentalPin: newPin } });
    setShowPinSetup(false);
    setNewPin('');
    setConfirmPin('');
    setPinError('');
  }, [newPin, confirmPin, dispatch]);

  const handleRemovePin = useCallback(() => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { parentalPin: '' } });
  }, [dispatch]);

  const toggleSetting = useCallback((key: keyof typeof settings, value: boolean) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { [key]: value } });
  }, [dispatch]);

  const handleLogout = useCallback(() => {
    dispatch({ type: 'LOGOUT' });
  }, [dispatch]);

  const handleClearCache = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      window.location.reload();
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-20 px-4 md:px-12 pb-24 md:pb-8"
    >
      <div className="max-w-2xl mx-auto">
        <h1 className="text-white text-xl md:text-2xl font-bold mb-6">Settings</h1>

        {/* Section tabs */}
        <div className="flex gap-1.5 bg-[#141414] rounded-xl p-1.5 mb-6 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`flex items-center gap-1.5 flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeSection === id
                  ? 'bg-[#E50914] text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Account Section */}
        {activeSection === 'account' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <div className="bg-[#1A1A1A] rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-sm font-semibold">Profile Information</h3>
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="text-[#E50914] text-xs font-medium">Edit</button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={handleSaveProfile} className="text-[#E50914] text-xs font-medium flex items-center gap-1">
                      {saved ? <><Check className="w-3 h-3" /> Saved!</> : 'Save'}
                    </button>
                    <button onClick={() => setIsEditing(false)} className="text-white/50 text-xs">Cancel</button>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-white/40 text-xs mb-1 block">Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isEditing}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-60 focus:outline-none focus:border-[#E50914]/50"
                  />
                </div>
                <div>
                  <label className="text-white/40 text-xs mb-1 block">Email</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!isEditing}
                    type="email"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-60 focus:outline-none focus:border-[#E50914]/50"
                  />
                </div>
                <div>
                  <label className="text-white/40 text-xs mb-1 block">Language</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'en', label: 'English' },
                      { value: 'lg', label: 'Luganda' },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => { setLanguage(value as 'en' | 'lg'); if (isEditing) dispatch({ type: 'UPDATE_SETTINGS', payload: { language: value as 'en' | 'lg' } }); }}
                        className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${language === value ? 'bg-[#E50914] text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-xl p-4">
              <h3 className="text-white text-sm font-semibold mb-3">Data Usage</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-white/50 text-xs">Streaming</span>
                    <span className="text-white/60 text-xs">{dataUsage.streaming.used}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full"><div className="h-full bg-blue-500 rounded-full w-3/5" /></div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-white/50 text-xs">Downloads</span>
                    <span className="text-white/60 text-xs">{dataUsage.downloads.used} / {dataUsage.downloads.limit}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full"><div className="h-full bg-purple-500 rounded-full w-1/4" /></div>
                </div>
                <p className="text-white/30 text-xs">Total this month: {dataUsage.total}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Playback Section */}
        {activeSection === 'playback' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <div className="bg-[#1A1A1A] rounded-xl divide-y divide-white/5">
              <SettingRow icon={Zap} title="Autoplay" description="Automatically play next episode">
                <ToggleSwitch value={settings.autoplay} onChange={() => toggleSetting('autoplay', !settings.autoplay)} />
              </SettingRow>
              <SettingRow icon={Monitor} title="Default Video Quality" description="Choose streaming quality">
                <select
                  value={settings.quality}
                  onChange={(e) => toggleSetting('quality', e.target.value)}
                  className="bg-white/10 text-white text-xs rounded-lg px-2.5 py-1.5 border border-white/10 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="auto">Auto</option>
                  <option value="1080p">1080p HD</option>
                  <option value="720p">720p</option>
                  <option value="480p">480p</option>
                  <option value="360p">360p</option>
                </select>
              </SettingRow>
              <SettingRow icon={Smartphone} title="Mobile Data Quality" description="Quality on cellular network">
                <select
                  value={settings.streamingQualityMobile}
                  onChange={(e) => toggleSetting('streamingQualityMobile', e.target.value)}
                  className="bg-white/10 text-white text-xs rounded-lg px-2.5 py-1.5 border border-white/10 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="auto">Auto</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </SettingRow>
              <SettingRow icon={Subtitles} title="Subtitle Size" description="Default subtitle font size">
                <select
                  value={settings.subtitleSize}
                  onChange={(e) => toggleSetting('subtitleSize', e.target.value)}
                  className="bg-white/10 text-white text-xs rounded-lg px-2.5 py-1.5 border border-white/10 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </SettingRow>
            </div>
          </motion.div>
        )}

        {/* Notifications Section */}
        {activeSection === 'notifications' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <div className="bg-[#1A1A1A] rounded-xl divide-y divide-white/5">
              <SettingRow icon={Bell} title="Push Notifications" description="Receive notifications on your device">
                <ToggleSwitch value={settings.pushNotifications} onChange={() => toggleSetting('pushNotifications', !settings.pushNotifications)} />
              </SettingRow>
              <SettingRow icon={Mail} title="Email Notifications" description="Receive updates via email">
                <ToggleSwitch value={settings.emailNotifications} onChange={() => toggleSetting('emailNotifications', !settings.emailNotifications)} />
              </SettingRow>
              <SettingRow icon={Zap} title="New Content Alerts" description="Get notified about new releases">
                <ToggleSwitch value={settings.newContentAlerts} onChange={() => toggleSetting('newContentAlerts', !settings.newContentAlerts)} />
              </SettingRow>
              <SettingRow icon={Bell} title="All Notifications" description="Master notification toggle">
                <ToggleSwitch value={settings.notifications} onChange={() => toggleSetting('notifications', !settings.notifications)} />
              </SettingRow>
            </div>
          </motion.div>
        )}

        {/* Downloads Section */}
        {activeSection === 'downloads' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <div className="bg-[#1A1A1A] rounded-xl divide-y divide-white/5">
              <SettingRow icon={Wifi} title="Wi-Fi Only Downloads" description="Only download on Wi-Fi to save data">
                <ToggleSwitch value={settings.wifiOnly} onChange={() => toggleSetting('wifiOnly', !settings.wifiOnly)} />
              </SettingRow>
              <SettingRow icon={Trash2} title="Auto-Delete Downloads" description="Remove expired downloads automatically">
                <ToggleSwitch value={settings.autoDeleteDownloads} onChange={() => toggleSetting('autoDeleteDownloads', !settings.autoDeleteDownloads)} />
              </SettingRow>
              <SettingRow icon={Monitor} title="Download Quality" description="Default quality for downloads">
                <select
                  value={settings.downloadQuality}
                  onChange={(e) => toggleSetting('downloadQuality', e.target.value)}
                  className="bg-white/10 text-white text-xs rounded-lg px-2.5 py-1.5 border border-white/10 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="standard">Standard (480p)</option>
                  <option value="high">High (720p)</option>
                </select>
              </SettingRow>
            </div>
            <button
              onClick={() => navigate('downloads')}
              className="w-full flex items-center justify-between bg-[#1A1A1A] hover:bg-[#222] rounded-xl p-4 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-white/50" />
                <span className="text-white text-sm font-medium">Manage Downloads</span>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30" />
            </button>
          </motion.div>
        )}

        {/* Privacy & Security Section */}
        {activeSection === 'privacy' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <div className="bg-[#1A1A1A] rounded-xl p-4">
              <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#E50914]" />
                Parental Controls
              </h3>
              {settings.parentalPin ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div>
                      <p className="text-green-400 text-sm font-medium">PIN Active</p>
                      <p className="text-white/40 text-xs">Your parental PIN is set</p>
                    </div>
                    <Check className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <label className="text-white/40 text-xs mb-1 block">Maturity Rating</label>
                    <div className="flex gap-2">
                      {(['all', '7+', '13+', '16+', '18+'] as const).map((rating) => (
                        <button
                          key={rating}
                          onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { maturityRating: rating } })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${settings.maturityRating === rating ? 'bg-[#E50914] text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                        >
                          {rating === 'all' ? 'All' : rating}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleRemovePin} className="text-[#E50914] text-xs hover:underline">Remove PIN</button>
                </div>
              ) : (
                <div>
                  <p className="text-white/50 text-xs mb-3">Set a 4-digit PIN to restrict content and protect settings</p>
                  {!showPinSetup ? (
                    <button onClick={() => setShowPinSetup(true)} className="bg-[#E50914] text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-[#ff1a25] transition-colors">
                      Set Up Parental PIN
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative">
                        <input
                          type={showPin ? 'text' : 'password'}
                          inputMode="numeric"
                          maxLength={4}
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                          placeholder="Enter 4-digit PIN"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E50914]/50"
                        />
                        <button onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2">
                          {showPin ? <EyeOff className="w-4 h-4 text-white/30" /> : <Eye className="w-4 h-4 text-white/30" />}
                        </button>
                      </div>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        value={confirmPin}
                        onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, '')); setPinError(''); }}
                        placeholder="Confirm PIN"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E50914]/50"
                      />
                      {pinError && <p className="text-red-400 text-xs">{pinError}</p>}
                      <div className="flex gap-2">
                        <button onClick={handleSetParentalPin} disabled={newPin.length !== 4 || confirmPin.length !== 4} className="bg-[#E50914] text-white px-4 py-2 rounded-lg text-xs font-medium disabled:opacity-50">Save PIN</button>
                        <button onClick={() => { setShowPinSetup(false); setPinError(''); }} className="bg-white/10 text-white px-4 py-2 rounded-lg text-xs font-medium">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-[#1A1A1A] rounded-xl divide-y divide-white/5">
              <SettingRow icon={HardDrive} title="Clear Cache" description="Free up storage space">
                <button onClick={handleClearCache} className="text-[#E50914] text-xs font-medium">Clear</button>
              </SettingRow>
              <SettingRow icon={Eye} title="Clear Watch History" description="Remove all viewing history">
                <button onClick={() => dispatch({ type: 'SET_WATCH_PROGRESS', payload: [] })} className="text-[#E50914] text-xs font-medium">Clear</button>
              </SettingRow>
              <SettingRow icon={Search} title="Clear Search History" description="Remove all recent searches">
                <button onClick={() => dispatch({ type: 'SET_RECENT_SEARCHES', payload: [] })} className="text-[#E50914] text-xs font-medium">Clear</button>
              </SettingRow>
            </div>

            <div className="bg-[#1A1A1A] rounded-xl divide-y divide-white/5">
              <button onClick={() => navigate('help')} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-white/50" />
                  <span className="text-white text-sm">Help Center</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30" />
              </button>
              <a href="#" className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-white/50" />
                  <span className="text-white text-sm">Terms of Service</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-white/30" />
              </a>
              <a href="#" className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-white/50" />
                  <span className="text-white text-sm">Privacy Policy</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-white/30" />
              </a>
            </div>
          </motion.div>
        )}

        {/* About Section */}
        {activeSection === 'about' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            <div className="bg-[#1A1A1A] rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-[#E50914] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">P</span>
              </div>
              <h3 className="text-white text-lg font-bold">PStream</h3>
              <p className="text-white/50 text-xs mt-1">Version 2.5.0 (Build 2024.04)</p>
              <p className="text-white/40 text-xs mt-1">Uganda&apos;s Premier Streaming Platform</p>
            </div>

            <div className="bg-[#1A1A1A] rounded-xl divide-y divide-white/5">
              <SettingRow icon={FileText} title="Terms of Service" />
              <SettingRow icon={Shield} title="Privacy Policy" />
              <SettingRow icon={FileText} title="Content Guidelines" />
              <SettingRow icon={CreditCard} title="Refund Policy" />
              <SettingRow icon={Heart} title="Open Source Licenses" />
            </div>

            <div className="bg-[#1A1A1A] rounded-xl divide-y divide-white/5">
              <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 hover:bg-[#E50914]/5 transition-colors rounded-t-xl">
                <div className="flex items-center gap-3">
                  <LogOut className="w-5 h-5 text-[#E50914]" />
                  <span className="text-[#E50914] text-sm font-medium">Sign Out</span>
                </div>
              </button>
              <SettingRow icon={AlertTriangle} title="Delete Account" description="Permanently remove your account and data" danger />
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Sub-components (declared outside render) ──────────────────────
function ToggleSwitch({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className="flex-shrink-0" aria-label={value ? 'On' : 'Off'}>
      {value ? (
        <ToggleRight className="w-9 h-9 text-[#E50914]" />
      ) : (
        <ToggleLeft className="w-9 h-9 text-white/30" />
      )}
    </button>
  );
}

function SettingRow({ icon: Icon, title, description, children, danger }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-xl ${danger ? 'hover:bg-[#E50914]/5' : 'hover:bg-white/5'} transition-colors`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${danger ? 'bg-[#E50914]/10' : 'bg-white/5'}`}>
          <Icon className={`w-4 h-4 ${danger ? 'text-[#E50914]' : 'text-white/50'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${danger ? 'text-[#E50914]' : 'text-white'}`}>{title}</p>
          {description && <p className="text-white/40 text-xs mt-0.5">{description}</p>}
        </div>
      </div>
      {children && <div className="ml-3 flex-shrink-0">{children}</div>}
    </div>
  );
}


