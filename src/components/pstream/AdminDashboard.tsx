/* PStream Admin Dashboard — PIN-gated, real data from API */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Ticket, DollarSign, Settings, RefreshCw,
  Copy, Check, X, Loader2, AlertCircle, Ban,
  RotateCcw, Play, Download, Clock, TrendingUp,
  Plus, Shield, Smartphone, ChevronLeft, ChevronRight,
  Lock, ArrowLeft, RotateCcw as ResetDevice,
  Monitor, Globe, ScreenShare, Calendar, Tag,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { AppView } from '@/lib/types';
import {
  fetchAdminStats, fetchAdminTokens, generateTokens,
  manageToken, fetchAdminConfig, updateAdminConfig,
} from '@/lib/api';
import type { AdminStats, TokenInfo, AdminConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

type AdminTab = 'overview' | 'tokens' | 'generate' | 'settings' | 'revenue';

const ADMIN_TABS: { id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'tokens', label: 'Tokens', icon: Ticket },
  { id: 'generate', label: 'Generate', icon: Plus },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'revenue', label: 'Revenue', icon: DollarSign },
];

function formatUGX(amount: number): string {
  return new Intl.NumberFormat('en-UG', { style: 'decimal', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function parseDeviceInfo(infoJson: string | null): { platform: string; browser: string; screen: string; language: string; timezone: string; raw: string } {
  if (!infoJson) return { platform: '—', browser: '—', screen: '—', language: '—', timezone: '—', raw: '' };
  try {
    const info = typeof infoJson === 'string' ? JSON.parse(infoJson) : infoJson;
    const platform = info.platform || info.os || '—';
    const browser = info.userAgent
      ? (info.userAgent.includes('Chrome') && !info.userAgent.includes('Edg') ? 'Chrome' :
         info.userAgent.includes('Firefox') ? 'Firefox' :
         info.userAgent.includes('Safari') && !info.userAgent.includes('Chrome') ? 'Safari' :
         info.userAgent.includes('Edg') ? 'Edge' :
         info.userAgent.includes('Opera') ? 'Opera' :
         info.userAgent.split(' ').slice(-1)[0]?.split('/')[0] || 'Unknown')
      : '—';
    const screenWidth = info.screenWidth || '?';
    const screenHeight = info.screenHeight || '?';
    const screen = `${screenWidth}x${screenHeight}`;
    const language = info.language || '—';
    const timezone = info.timezone || '—';
    return { platform, browser, screen, language, timezone, raw: infoJson };
  } catch {
    return { platform: infoJson, browser: '—', screen: '—', language: '—', timezone: '—', raw: infoJson };
  }
}

function getPlatformIcon(platform: string) {
  const p = platform.toLowerCase();
  if (p.includes('android') || p.includes('linux') && !p.includes('ubuntu')) return '🤖';
  if (p.includes('iphone') || p.includes('ipad') || p.includes('ios') || p.includes('mac')) return '🍎';
  if (p.includes('windows')) return '🪟';
  if (p.includes('linux')) return '🐧';
  return '📱';
}

export default function AdminDashboard() {
  const { state, navigate } = useAppStore();
  const [isAdminVerified, setIsAdminVerified] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem('pstream_admin_verified') === 'true';
    } catch { return false; }
  });

  if (!isAdminVerified) {
    return <AdminPinGate onVerified={() => setIsAdminVerified(true)} navigate={navigate} />;
  }

  return <AdminDashboardContent />;
}

// ─── PIN Gate Component ────────────────────────────────────
function AdminPinGate({ onVerified, navigate }: { onVerified: () => void; navigate: (v: AppView) => void }) {
  const { state } = useAppStore();
  const [adminPin, setAdminPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const isAuthenticated = state.auth.isAuthenticated || state.tokenSession !== null;

  const handlePinSubmit = async () => {
    if (!adminPin.trim()) return;
    setPinLoading(true);
    setPinError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: adminPin.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        sessionStorage.setItem('pstream_admin_verified', 'true');
        onVerified();
      } else {
        setPinError(json.error || 'Incorrect PIN');
      }
    } catch {
      setPinError('Failed to verify PIN');
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-20 px-4 md:px-12 pb-24 md:pb-8 min-h-screen flex items-center justify-center"
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#E50914]/10 border border-[#E50914]/20 flex items-center justify-center">
            <Lock className="w-8 h-8 text-[#E50914]" />
          </div>
          <h1 className="text-white text-xl font-bold">Admin Access</h1>
          <p className="text-white/50 text-sm mt-1">Enter your admin PIN to continue</p>
        </div>

        <div className="bg-[#141414] rounded-2xl p-6 border border-white/5">
          {pinError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{pinError}</p>
            </div>
          )}
          <input
            type="password"
            inputMode="numeric"
            maxLength={10}
            placeholder="Enter PIN"
            value={adminPin}
            onChange={(e) => { setAdminPin(e.target.value); if (pinError) setPinError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
            className="w-full h-14 bg-white/5 border-white/10 text-white text-center text-xl font-mono tracking-widest rounded-xl placeholder:text-white/25 focus:outline-none focus:border-[#E50914] transition-all"
            autoFocus
          />
          <button
            onClick={handlePinSubmit}
            disabled={pinLoading || !adminPin.trim()}
            className="w-full mt-4 h-12 bg-[#E50914] hover:bg-[#E50914]/90 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {pinLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-4 h-4" />}
            {pinLoading ? 'Verifying...' : 'Unlock Dashboard'}
          </button>
        </div>

        <button
          onClick={() => navigate(isAuthenticated ? 'home' : 'login')}
          className="w-full mt-6 flex items-center justify-center gap-2 text-sm text-white/40 hover:text-white/60 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {isAuthenticated ? 'Back to Home' : 'Back to Login'}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Dashboard Content Component ────────────────────────────
function AdminDashboardContent() {
  const { state } = useAppStore();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [tokensTotal, setTokensTotal] = useState(0);
  const [tokensPage, setTokensPage] = useState(1);
  const [tokenStatusFilter, setTokenStatusFilter] = useState<string>('');
  const [config, setConfig] = useState<AdminConfig | null>(state.adminConfig);

  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Toast auto-clear
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Load stats
  const loadStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const data = await fetchAdminStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Load tokens
  const loadTokens = useCallback(async (page = 1, status?: string) => {
    setIsLoadingTokens(true);
    try {
      const data = await fetchAdminTokens(status, page, 20);
      setTokens(data.tokens);
      setTokensTotal(data.total);
      setTokensPage(data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tokens');
    } finally {
      setIsLoadingTokens(false);
    }
  }, []);

  // Load config
  const loadConfig = useCallback(async () => {
    try {
      const data = await fetchAdminConfig();
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load config');
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadStats();
    loadTokens(1, undefined);
    if (!config) loadConfig();
  }, []);

  // Tab change loads
  useEffect(() => {
    if (activeTab === 'overview') loadStats();
    if (activeTab === 'tokens') loadTokens(1, tokenStatusFilter || undefined);
    if (activeTab === 'settings' && !config) loadConfig();
  }, [activeTab, tokenStatusFilter]);

  // Token management action
  const handleTokenAction = async (id: string, action: 'revoke' | 'expire' | 'reactivate', reason?: string) => {
    try {
      await manageToken(id, action, reason);
      setSuccess(`Token ${action}d successfully`);
      loadTokens(tokensPage, tokenStatusFilter || undefined);
      loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} token`);
    }
  };

  // ─── Overview Tab ────────────────────────────────────────────
  const renderOverview = () => {
    if (isLoadingStats && !stats) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#E50914] animate-spin" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Tokens', value: stats?.totalTokens ?? 0, icon: Ticket, color: 'text-[#E50914]' },
            { label: 'Active', value: stats?.activeTokens ?? 0, icon: Shield, color: 'text-green-400' },
            { label: 'Available', value: stats?.availableTokens ?? 0, icon: Plus, color: 'text-blue-400' },
            { label: 'Revoked', value: stats?.revokedTokens ?? 0, icon: Ban, color: 'text-red-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1A1A1A] rounded-xl p-4 border border-white/5"
            >
              <Icon className={`w-5 h-5 ${color} mb-2`} />
              <p className="text-white text-xl font-bold">{value.toLocaleString()}</p>
              <p className="text-white/40 text-xs mt-1">{label}</p>
            </motion.div>
          ))}
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: 'Total Revenue', value: stats?.totalRevenue ?? 0, icon: DollarSign, color: 'text-green-400' },
            { label: 'This Week', value: stats?.revenueThisWeek ?? 0, icon: TrendingUp, color: 'text-blue-400' },
            { label: 'Today', value: stats?.revenueToday ?? 0, icon: Clock, color: 'text-yellow-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#1A1A1A] rounded-xl p-5 border border-white/5"
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className="text-white text-2xl font-bold">UGX {formatUGX(value)}</p>
              <p className="text-white/40 text-xs mt-1">{label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tier Breakdown */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Stream', value: stats?.streamCount ?? 0, icon: Play, color: '#E50914' },
            { label: 'Download', value: stats?.downloadCount ?? 0, icon: Download, color: '#831010' },
            { label: 'Trial', value: stats?.trialCount ?? 0, icon: Clock, color: '#B3B3B3' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-[#1A1A1A] rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-white/50 text-xs">{label}</span>
              </div>
              <p className="text-white text-lg font-bold">{value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Devices */}
        <div className="bg-[#1A1A1A] rounded-xl p-5 border border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <Smartphone className="w-4 h-4 text-white/40" />
            <span className="text-white/50 text-sm">Total Devices</span>
          </div>
          <p className="text-white text-2xl font-bold">{(stats?.totalDevices ?? 0).toLocaleString()}</p>
        </div>

        {/* Recent Activations */}
        <div className="bg-[#1A1A1A] rounded-xl p-5 border border-white/5">
          <h3 className="text-white text-sm font-semibold mb-4">Recent Activations</h3>
          {stats?.recentActivations && stats.recentActivations.length > 0 ? (
            <div className="space-y-3">
              {stats.recentActivations.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#E50914]/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-[#E50914]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-mono font-medium">{item.code}</p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${
                          item.tier === 'download'
                            ? 'border-purple-500/50 text-purple-400'
                            : item.tier === 'trial'
                              ? 'border-yellow-500/50 text-yellow-400'
                              : 'border-[#E50914]/50 text-[#E50914]'
                        }`}
                      >
                        {item.tier}
                      </Badge>
                    </div>
                    <p className="text-white/30 text-xs mt-0.5 truncate">{item.deviceInfo || 'Unknown device'}</p>
                  </div>
                  <span className="text-white/20 text-[10px] flex-shrink-0">{timeAgo(item.activatedAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/30 text-sm">No recent activations</p>
          )}
        </div>
      </div>
    );
  };

  // ─── Tokens Tab ──────────────────────────────────────────────
  const renderTokens = () => {
    const statusFilters = [
      { value: '', label: 'All' },
      { value: 'available', label: 'Available' },
      { value: 'active', label: 'Active' },
      { value: 'expired', label: 'Expired' },
      { value: 'revoked', label: 'Revoked' },
    ];

    return (
      <div className="space-y-4">
        {/* Filters + Count */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1" style={{ scrollbarWidth: 'none' }}>
            {statusFilters.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => {
                  setTokenStatusFilter(value);
                  loadTokens(1, value || undefined);
                }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  tokenStatusFilter === value
                    ? 'bg-[#E50914] text-white'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {!isLoadingTokens && tokens.length > 0 && (
            <span className="text-white/30 text-xs flex-shrink-0">{tokensTotal} total</span>
          )}
        </div>

        {/* Loading */}
        {isLoadingTokens ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#E50914] animate-spin" />
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-16">
            <Ticket className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No tokens found</p>
          </div>
        ) : (
          <>
            {/* Token Cards - Mobile-first responsive layout */}
            <div className="space-y-3">
              {tokens.map((token) => {
                const device = parseDeviceInfo(token.redeemedDeviceInfo);
                const hasDevice = token.status === 'active' || token.redeemedDeviceInfo;
                const statusColor = token.status === 'active' ? 'green' : token.status === 'available' ? 'blue' : token.status === 'expired' ? 'orange' : 'red';
                const tierColor = token.tier === 'download' ? 'purple' : token.tier === 'trial' ? 'yellow' : 'red';

                return (
                  <motion.div
                    key={token.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#1A1A1A] rounded-xl border border-white/5 overflow-hidden"
                  >
                    {/* Card Header - Code, Tier, Status */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-white text-sm font-mono font-bold tracking-wide">{token.code}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 flex-shrink-0 ${
                            tierColor === 'purple' ? 'border-purple-500/50 text-purple-400' :
                            tierColor === 'yellow' ? 'border-yellow-500/50 text-yellow-400' :
                            'border-[#E50914]/50 text-[#E50914]'
                          }`}
                        >
                          {token.tier === 'download' ? 'Stream + DL' : token.tier === 'trial' ? 'Trial' : 'Stream'}
                        </Badge>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium flex-shrink-0 ${
                        statusColor === 'green' ? 'text-green-400' :
                        statusColor === 'blue' ? 'text-blue-400' :
                        statusColor === 'orange' ? 'text-orange-400' :
                        'text-red-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          statusColor === 'green' ? 'bg-green-400' :
                          statusColor === 'blue' ? 'bg-blue-400' :
                          statusColor === 'orange' ? 'bg-orange-400' :
                          'bg-red-400'
                        }`} />
                        {token.status.charAt(0).toUpperCase() + token.status.slice(1)}
                      </span>
                    </div>

                    {/* Card Body - Details Grid */}
                    <div className="px-4 py-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
                        {/* Note */}
                        <div className="flex items-start gap-2 col-span-2 sm:col-span-1">
                          <Tag className="w-3.5 h-3.5 text-white/25 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-white/25 text-[10px] uppercase tracking-wider">Note</p>
                            <p className="text-white/70 text-xs font-medium truncate">{token.note || 'No note'}</p>
                          </div>
                        </div>

                        {/* Created */}
                        <div className="flex items-start gap-2">
                          <Calendar className="w-3.5 h-3.5 text-white/25 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-white/25 text-[10px] uppercase tracking-wider">Created</p>
                            <p className="text-white/70 text-xs font-medium">{formatDate(token.createdAt)}</p>
                          </div>
                        </div>

                        {/* Expires */}
                        {token.expiresAt && (
                          <div className="flex items-start gap-2">
                            <Clock className="w-3.5 h-3.5 text-white/25 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-white/25 text-[10px] uppercase tracking-wider">Expires</p>
                              <p className="text-white/70 text-xs font-medium">{formatDate(token.expiresAt)}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Device Info Section - Only shown when device data exists */}
                      {hasDevice && (
                        <div className="mt-3 pt-3 border-t border-white/5">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Smartphone className="w-3.5 h-3.5 text-white/30" />
                            <p className="text-white/30 text-[10px] uppercase tracking-wider font-semibold">Device Info</p>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
                            {/* Platform */}
                            <div className="flex items-center gap-2">
                              <span className="text-sm flex-shrink-0" title={device.platform}>{getPlatformIcon(device.platform)}</span>
                              <div className="min-w-0">
                                <p className="text-white/25 text-[10px]">Platform</p>
                                <p className="text-white/70 text-xs font-medium truncate">{device.platform}</p>
                              </div>
                            </div>

                            {/* Browser */}
                            <div className="flex items-center gap-2">
                              <Globe className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-white/25 text-[10px]">Browser</p>
                                <p className="text-white/70 text-xs font-medium truncate">{device.browser}</p>
                              </div>
                            </div>

                            {/* Screen */}
                            <div className="flex items-center gap-2">
                              <Monitor className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-white/25 text-[10px]">Screen</p>
                                <p className="text-white/70 text-xs font-medium">{device.screen}</p>
                              </div>
                            </div>

                            {/* Timezone */}
                            <div className="flex items-center gap-2">
                              <ScreenShare className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-white/25 text-[10px]">Timezone</p>
                                <p className="text-white/70 text-xs font-medium truncate">{device.timezone}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Footer - Actions */}
                    <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-white/5 bg-white/[0.02]">
                      {token.status === 'active' && (
                        <>
                          <button
                            onClick={async () => {
                              try {
                                await fetch('/api/admin/tokens/' + token.code, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'reset_device' }),
                                });
                                setSuccess('Device lock reset');
                                loadTokens(tokensPage, tokenStatusFilter || undefined);
                                loadStats();
                              } catch (err) {
                                setError(err instanceof Error ? err.message : 'Failed to reset device');
                              }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-400 hover:bg-blue-500/10 transition-colors"
                          >
                            <ResetDevice className="w-3.5 h-3.5" />
                            Reset Device
                          </button>
                          <button
                            onClick={() => handleTokenAction(token.code, 'revoke', 'Admin revoked')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Revoke
                          </button>
                        </>
                      )}
                      {token.status === 'revoked' && (
                        <button
                          onClick={() => handleTokenAction(token.code, 'reactivate')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-green-400 hover:bg-green-500/10 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reactivate
                        </button>
                      )}
                      {token.status === 'available' && (
                        <button
                          onClick={() => handleTokenAction(token.code, 'revoke', 'Cancelled by admin')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Revoke
                        </button>
                      )}
                      {token.status === 'expired' && (
                        <button
                          onClick={() => handleTokenAction(token.code, 'reactivate')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-green-400 hover:bg-green-500/10 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reactivate
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Pagination */}
            {tokensTotal > 20 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-white/30 text-xs">
                  {((tokensPage - 1) * 20) + 1}–{Math.min(tokensPage * 20, tokensTotal)} of {tokensTotal}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadTokens(tokensPage - 1, tokenStatusFilter || undefined)}
                    disabled={tokensPage <= 1}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4 text-white/50" />
                  </button>
                  <span className="text-white/50 text-xs">Page {tokensPage}</span>
                  <button
                    onClick={() => loadTokens(tokensPage + 1, tokenStatusFilter || undefined)}
                    disabled={tokensPage * 20 >= tokensTotal}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4 text-white/50" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // ─── Revenue Tab ─────────────────────────────────────────────
  const renderRevenue = () => {
    if (isLoadingStats && !stats) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#E50914] animate-spin" />
        </div>
      );
    }

    const dailyRevenue = stats?.dailyRevenue || [];

    return (
      <div className="space-y-6">
        {/* Revenue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-[#1A1A1A] rounded-xl p-5 border border-white/5">
            <DollarSign className="w-5 h-5 text-green-400 mb-2" />
            <p className="text-white text-2xl font-bold">UGX {formatUGX(stats?.totalRevenue ?? 0)}</p>
            <p className="text-white/40 text-xs mt-1">Total Revenue</p>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl p-5 border border-white/5">
            <TrendingUp className="w-5 h-5 text-blue-400 mb-2" />
            <p className="text-white text-2xl font-bold">UGX {formatUGX(stats?.revenueThisWeek ?? 0)}</p>
            <p className="text-white/40 text-xs mt-1">This Week</p>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl p-5 border border-white/5">
            <Clock className="w-5 h-5 text-yellow-400 mb-2" />
            <p className="text-white text-2xl font-bold">UGX {formatUGX(stats?.revenueToday ?? 0)}</p>
            <p className="text-white/40 text-xs mt-1">Today</p>
          </div>
        </div>

        {/* Daily Revenue Chart */}
        {dailyRevenue.length > 0 && (
          <div className="bg-[#1A1A1A] rounded-xl p-5 border border-white/5">
            <h3 className="text-white text-sm font-semibold mb-4">Daily Revenue (Last 7 days)</h3>
            <div className="flex items-end gap-2 h-48">
              {dailyRevenue.map(({ date, amount }, i) => {
                const maxAmount = Math.max(...dailyRevenue.map((d) => d.amount), 1);
                const height = (amount / maxAmount) * 100;
                return (
                  <div key={date} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-white/40 text-[10px]">
                      {amount > 0 ? formatUGX(amount) : '0'}
                    </span>
                    <div
                      className="w-full rounded-t-lg relative overflow-hidden transition-all"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-[#E50914] to-[#E50914]/60 rounded-t-lg" />
                    </div>
                    <span className="text-white/30 text-[10px]">
                      {new Date(date).toLocaleDateString('en-GB', { weekday: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tier Breakdown */}
        <div className="bg-[#1A1A1A] rounded-xl p-5 border border-white/5">
          <h3 className="text-white text-sm font-semibold mb-4">Revenue by Tier</h3>
          <div className="space-y-4">
            {[
              { label: 'Stream', count: stats?.streamCount ?? 0, color: '#E50914' },
              { label: 'Download', count: stats?.downloadCount ?? 0, color: '#831010' },
              { label: 'Trial', count: stats?.trialCount ?? 0, color: '#B3B3B3' },
            ].map(({ label, count, color }) => {
              const total = (stats?.streamCount ?? 0) + (stats?.downloadCount ?? 0) + (stats?.trialCount ?? 0) || 1;
              const pct = ((count / total) * 100).toFixed(1);
              return (
                <div key={label} className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium">{label}</span>
                      <span className="text-white/50 text-xs">{count} tokens ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ backgroundColor: color, width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ─── Toast messages ──────────────────────────────────────────
  const renderToast = () => {
    if (!error && !success) return null;
    return (
      <div className="fixed top-20 right-4 z-50 space-y-2">
        {error && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-2 max-w-sm"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-3 h-3 text-red-400/60" />
            </button>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 flex items-center gap-2 max-w-sm"
          >
            <Check className="w-4 h-4 text-green-400 shrink-0" />
            <p className="text-sm text-green-400">{success}</p>
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-20 px-4 md:px-12 pb-24 md:pb-8"
    >
      {renderToast()}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-xl md:text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-white/50 text-sm mt-1">Manage tokens, revenue & settings</p>
          </div>
          <button
            onClick={() => {
              loadStats();
              loadTokens(tokensPage, tokenStatusFilter || undefined);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(isLoadingStats || isLoadingTokens) ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 bg-[#141414] rounded-xl p-1.5 mb-6 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {ADMIN_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 flex-shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === id
                  ? 'bg-[#E50914] text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'tokens' && renderTokens()}
        {activeTab === 'generate' && <GeneratorWrapper />}
        {activeTab === 'settings' && <SettingsWrapper initialConfig={config} />}
        {activeTab === 'revenue' && renderRevenue()}
      </div>
    </motion.div>
  );
}

// Extracted components to avoid hooks-in-conditions issue
function GeneratorWrapper() {
  const { loadStats } = useGeneratorHooks();
  const [genTier, setGenTier] = useState<'stream' | 'download' | 'trial'>('stream');
  const [genCount, setGenCount] = useState(5);
  const [genNote, setGenNote] = useState('');
  const [generatedCodes, setGeneratedCodes] = useState<TokenInfo[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const codes = await generateTokens(genCount, genTier, genNote || undefined);
      setGeneratedCodes(codes);
      setSuccess(`Generated ${codes.length} ${genTier} token(s)`);
      loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate tokens');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-3 h-3 text-red-400/60" /></button>
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 flex items-center gap-2">
          <Check className="w-4 h-4 text-green-400 shrink-0" />
          <p className="text-sm text-green-400">{success}</p>
        </div>
      )}
      <div className="bg-[#1A1A1A] rounded-xl p-6 border border-white/5">
        <h3 className="text-white text-sm font-semibold mb-4">Generate New Tokens</h3>
        <div className="space-y-2 mb-4">
          <Label className="text-white/70 text-xs">Token Tier</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'stream', label: 'Stream', icon: Play, desc: 'Streaming only' },
              { value: 'download', label: 'Download', icon: Download, desc: 'Stream + Download' },
              { value: 'trial', label: 'Trial', icon: Clock, desc: 'Free trial' },
            ].map(({ value, label, icon: Icon, desc }) => (
              <button
                key={value}
                onClick={() => setGenTier(value as 'stream' | 'download' | 'trial')}
                className={`p-3 rounded-xl text-center transition-all border ${
                  genTier === value
                    ? 'bg-[#E50914]/10 border-[#E50914]/30 text-white'
                    : 'bg-white/3 border-white/5 text-white/50 hover:bg-white/5'
                }`}
              >
                <Icon className={`w-5 h-5 mx-auto mb-1 ${genTier === value ? 'text-[#E50914]' : ''}`} />
                <p className="text-xs font-medium">{label}</p>
                <p className="text-[10px] text-white/30 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Number of Codes</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={genCount}
              onChange={(e) => setGenCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
              className="h-10 bg-white/5 border-white/10 text-white rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Note (optional)</Label>
            <Input
              type="text"
              placeholder="e.g. Batch for WhatsApp group"
              value={genNote}
              onChange={(e) => setGenNote(e.target.value)}
              className="h-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-lg"
            />
          </div>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full h-11 bg-[#E50914] hover:bg-[#E50914]/90 text-white rounded-xl font-semibold gap-2"
        >
          {isGenerating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
          ) : (
            <><Plus className="w-4 h-4" /> Generate {genCount} Code{genCount > 1 ? 's' : ''}</>
          )}
        </Button>
      </div>
      {generatedCodes.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1A1A1A] rounded-xl p-5 border border-white/5">
          <h3 className="text-white text-sm font-semibold mb-3">Generated Codes</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 transparent' }}>
            {generatedCodes.map((t) => (
              <div key={t.id} className="flex items-center justify-between bg-white/3 rounded-lg px-3 py-2.5 border border-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-white font-mono text-sm font-medium">{t.code}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/10 text-white/40">{t.tier}</Badge>
                </div>
                <button onClick={() => copyCode(t.code, t.id)} className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors">
                  {copiedId === t.id ? (
                    <><Check className="w-3.5 h-3.5 text-green-400" /><span className="text-green-400">Copied!</span></>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Copy</>
                  )}
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function SettingsWrapper({ initialConfig }: { initialConfig: AdminConfig | null }) {
  const { dispatch } = useAppStore();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [config, setConfig] = useState<AdminConfig | null>(null);

  useEffect(() => {
    if (initialConfig && 'id' in initialConfig) {
      setConfig(initialConfig as AdminConfig);
    } else {
      fetchAdminConfig().then(setConfig).catch(() => {});
    }
  }, [initialConfig]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  if (!config) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#E50914] animate-spin" />
      </div>
    );
  }

  const updateField = (field: string, value: unknown) => {
    setConfig((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const handleSave = async () => {
    if (!config) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateAdminConfig(config);
      setConfig(updated);
      dispatch({ type: 'SET_ADMIN_CONFIG', payload: updated });
      setSuccess('Settings saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const sections = [
    {
      title: 'Branding',
      fields: [
        { key: 'siteName', label: 'Site Name', type: 'text' as const },
        { key: 'whatsapp', label: 'WhatsApp Number', type: 'text' as const },
        { key: 'currency', label: 'Currency Code', type: 'text' as const },
      ],
    },
    {
      title: 'Pricing',
      fields: [
        { key: 'streamPrice', label: 'Stream Price', type: 'number' as const },
        { key: 'downloadPrice', label: 'Download Price', type: 'number' as const },
        { key: 'planDurationDays', label: 'Plan Duration (days)', type: 'number' as const },
      ],
    },
    {
      title: 'Trial',
      fields: [
        { key: 'trialEnabled', label: 'Trial Enabled', type: 'switch' as const },
        { key: 'trialDurationHours', label: 'Trial Duration (hours)', type: 'number' as const },
      ],
    },
    {
      title: 'Downloads',
      fields: [
        { key: 'maxDownloadsPerPeriod', label: 'Max Downloads/Period', type: 'number' as const },
      ],
    },
    {
      title: 'Token Format',
      fields: [
        { key: 'tokenPrefix', label: 'Token Prefix', type: 'text' as const },
        { key: 'tokenLength', label: 'Token Length', type: 'number' as const },
      ],
    },
    {
      title: 'Device Policy',
      fields: [
        { key: 'allowDeviceTransfer', label: 'Allow Device Transfer', type: 'switch' as const },
        { key: 'maxDevicesPerToken', label: 'Max Devices/Token', type: 'number' as const },
      ],
    },
    {
      title: 'Refund Policy',
      fields: [
        { key: 'defaultRefundPolicy', label: 'Default Refund Policy', type: 'select' as const, options: ['none', 'partial', 'full'] },
        { key: 'defaultRefundPercent', label: 'Default Refund %', type: 'number' as const },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-3 h-3 text-red-400/60" /></button>
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 flex items-center gap-2">
          <Check className="w-4 h-4 text-green-400 shrink-0" />
          <p className="text-sm text-green-400">{success}</p>
        </div>
      )}
      {sections.map((section) => (
        <div key={section.title} className="bg-[#1A1A1A] rounded-xl p-5 border border-white/5">
          <h3 className="text-white text-sm font-semibold mb-4">{section.title}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {section.fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-white/60 text-xs">{field.label}</Label>
                {field.type === 'switch' ? (
                  <Switch
                    checked={config[field.key] as boolean}
                    onCheckedChange={(checked) => updateField(field.key, checked)}
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={config[field.key] as string}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    className="w-full h-10 bg-white/5 border-white/10 text-white rounded-lg px-3 text-sm focus:outline-none focus:border-[#E50914]/50"
                  >
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt} className="bg-[#1A1A1A]">{opt}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type={field.type}
                    value={config[field.key] as string | number}
                    onChange={(e) => updateField(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                    className="h-10 bg-white/5 border-white/10 text-white rounded-lg"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full h-11 bg-[#E50914] hover:bg-[#E50914]/90 text-white rounded-xl font-semibold gap-2"
      >
        {isSaving ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
        ) : (
          <><Settings className="w-4 h-4" /> Save Settings</>
        )}
      </Button>
    </div>
  );
}

// Helper hooks shared across tab components
function useGeneratorHooks() {
  const loadStats = useCallback(async () => {
    try {
      await fetchAdminStats();
    } catch { /* silent */ }
  }, []);
  return { loadStats };
}
