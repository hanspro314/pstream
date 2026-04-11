/* PStream Admin Dashboard — Content management, analytics, user management */

'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, Film, DollarSign, TrendingUp, Eye,
  Plus, Edit3, Trash2, Search, ChevronDown, BarChart3,
  PieChart, Activity, ArrowUpRight, ArrowDownRight, Clock,
  Monitor, Smartphone, Globe, Star, Heart, Play, Crown,
  Filter, Download, MoreVertical, Check, X, AlertTriangle,
  Settings, RefreshCw, Image
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

// ─── Mock Analytics Data ──────────────────────────────────────────
const analyticsData = {
  totalUsers: 12458,
  activeUsers: 8934,
  totalRevenue: 48750000,
  monthlyRevenue: 6125000,
  totalStreams: 156789,
  avgWatchTime: '42 min',
  newUsersThisMonth: 1243,
  conversionRate: '34.2%',
  churnRate: '8.5%',
  topGenres: [
    { name: 'Drama', count: 34200, percentage: 28 },
    { name: 'Action', count: 28100, percentage: 23 },
    { name: 'Comedy', count: 19500, percentage: 16 },
    { name: 'Romance', count: 15300, percentage: 12 },
    { name: 'Horror', count: 9800, percentage: 8 },
    { name: 'Sci Fi', count: 7200, percentage: 6 },
    { name: 'Documentary', count: 5600, percentage: 5 },
  ],
  revenueByPlan: [
    { plan: 'Weekly', amount: 28500000, users: 7125, color: '#E50914' },
    { plan: 'Monthly', amount: 15600000, users: 2600, color: '#831010' },
    { plan: 'Annual', amount: 4800000, users: 800, color: '#B3B3B3' },
  ],
  userGrowth: [
    { month: 'Oct', users: 8200 },
    { month: 'Nov', users: 9400 },
    { month: 'Dec', users: 10100 },
    { month: 'Jan', users: 10800 },
    { month: 'Feb', users: 11500 },
    { month: 'Mar', users: 12458 },
  ],
  topContent: [
    { title: 'Kampala Nights S2', views: 28400, rating: 4.8, revenue: 1568000 },
    { title: 'The Pearl', views: 23100, rating: 4.6, revenue: 1275000 },
    { title: 'East Africa Stories', views: 19800, rating: 4.5, revenue: 1089000 },
    { title: 'Mountain Warriors', views: 16500, rating: 4.3, revenue: 907500 },
    { title: 'Love in Jinja', views: 14200, rating: 4.7, revenue: 781000 },
  ],
  recentActivity: [
    { type: 'user', message: 'New user registered: +256 782***456', time: '2 min ago' },
    { type: 'payment', message: 'Payment received: UGX 2,000 from +256 700***123', time: '5 min ago' },
    { type: 'content', message: 'New movie uploaded: "The Return" (Action)', time: '15 min ago' },
    { type: 'user', message: 'User upgraded to Premium: +256 773***789', time: '23 min ago' },
    { type: 'payment', message: 'Payment received: UGX 6,000 from +256 705***321', time: '31 min ago' },
    { type: 'alert', message: 'Server load reached 85%', time: '45 min ago' },
  ],
};

// ─── Mock Users ───────────────────────────────────────────────────
const mockUsers = [
  { id: '1', name: 'Agnes Nakamya', phone: '+256 700***123', plan: 'Weekly', status: 'active', joined: '2024-01-15', streams: 142 },
  { id: '2', name: 'Samuel Kato', phone: '+256 782***456', plan: 'Monthly', status: 'active', joined: '2024-01-20', streams: 89 },
  { id: '3', name: 'Patience Mutebi', phone: '+256 773***789', plan: 'Annual', status: 'active', joined: '2024-02-01', streams: 234 },
  { id: '4', name: 'David Okello', phone: '+256 705***321', plan: 'Free', status: 'active', joined: '2024-02-15', streams: 12 },
  { id: '5', name: 'Grace Achieng', phone: '+256 771***654', plan: 'Weekly', status: 'expired', joined: '2024-01-10', streams: 67 },
];

type AdminTab = 'overview' | 'users' | 'content' | 'analytics' | 'revenue';

const ADMIN_TABS: { id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'content', label: 'Content', icon: Film },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'revenue', label: 'Revenue', icon: DollarSign },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [userSearch, setUserSearch] = useState('');

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return mockUsers;
    const q = userSearch.toLowerCase();
    return mockUsers.filter(u => u.name.toLowerCase().includes(q) || u.phone.includes(q));
  }, [userSearch]);

  const formatUGX = (amount: number) => {
    return new Intl.NumberFormat('en-UG', { style: 'decimal', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-20 px-4 md:px-12 pb-24 md:pb-8"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-xl md:text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-white/50 text-sm mt-1">Manage your streaming platform</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium rounded-lg transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 bg-[#E50914] hover:bg-[#ff1a25] text-white text-xs font-medium rounded-lg transition-colors">
              <Settings className="w-3.5 h-3.5" />
              Settings
            </button>
          </div>
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

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total Users', value: analyticsData.totalUsers.toLocaleString(), icon: Users, change: '+12.4%', up: true },
                { label: 'Active Users', value: analyticsData.activeUsers.toLocaleString(), icon: Activity, change: '+8.2%', up: true },
                { label: 'Total Revenue', value: `UGX ${(analyticsData.totalRevenue / 1000000).toFixed(1)}M`, icon: DollarSign, change: '+18.5%', up: true },
                { label: 'Total Streams', value: analyticsData.totalStreams.toLocaleString(), icon: Play, change: '+22.1%', up: true },
              ].map(({ label, value, icon: Icon, change, up }) => (
                <div key={label} className="bg-[#1A1A1A] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="w-5 h-5 text-[#E50914]" />
                    <span className={`flex items-center gap-0.5 text-xs font-medium ${up ? 'text-green-400' : 'text-red-400'}`}>
                      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {change}
                    </span>
                  </div>
                  <p className="text-white text-xl font-bold">{value}</p>
                  <p className="text-white/40 text-xs mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* User Growth Chart (visual) */}
            <div className="bg-[#1A1A1A] rounded-xl p-5">
              <h3 className="text-white text-sm font-semibold mb-4">User Growth</h3>
              <div className="flex items-end gap-3 h-40">
                {analyticsData.userGrowth.map(({ month, users }, i) => {
                  const maxUsers = Math.max(...analyticsData.userGrowth.map(u => u.users));
                  const height = (users / maxUsers) * 100;
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-white/50 text-[10px]">{(users / 1000).toFixed(1)}k</span>
                      <div className="w-full bg-[#E50914]/20 rounded-t-lg relative overflow-hidden" style={{ height: `${height}%` }}>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#E50914] to-[#E50914]/60 rounded-t-lg" />
                      </div>
                      <span className="text-white/40 text-[10px]">{month}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Content */}
            <div className="bg-[#1A1A1A] rounded-xl p-5">
              <h3 className="text-white text-sm font-semibold mb-4">Top Performing Content</h3>
              <div className="space-y-3">
                {analyticsData.topContent.map((item, i) => (
                  <div key={item.title} className="flex items-center gap-3">
                    <span className="text-white/30 text-sm font-bold w-6">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{item.title}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-white/40 text-xs flex items-center gap-1"><Eye className="w-3 h-3" />{item.views.toLocaleString()} views</span>
                        <span className="text-white/40 text-xs flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" />{item.rating}</span>
                        <span className="text-green-400 text-xs">UGX {formatUGX(item.revenue)}</span>
                      </div>
                    </div>
                    <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-[#E50914] rounded-full" style={{ width: `${(item.views / analyticsData.topContent[0].views) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-[#1A1A1A] rounded-xl p-5">
              <h3 className="text-white text-sm font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {analyticsData.recentActivity.map((item, i) => {
                  const iconMap = {
                    user: <Users className="w-4 h-4 text-blue-400" />,
                    payment: <DollarSign className="w-4 h-4 text-green-400" />,
                    content: <Film className="w-4 h-4 text-purple-400" />,
                    alert: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
                  };
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {iconMap[item.type as keyof typeof iconMap]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/70 text-xs">{item.message}</p>
                        <p className="text-white/30 text-[10px] mt-0.5">{item.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users by name or phone..."
                  className="w-full bg-[#1A1A1A] text-white placeholder:text-white/30 rounded-xl pl-10 pr-4 py-2.5 text-sm border border-white/10 focus:outline-none focus:border-[#E50914]/50"
                />
              </div>
              <button className="flex items-center gap-1.5 px-4 py-2.5 bg-[#E50914] text-white text-xs font-medium rounded-xl hover:bg-[#ff1a25] transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Add User
              </button>
            </div>

            <div className="bg-[#1A1A1A] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left text-white/40 text-xs font-medium px-4 py-3">User</th>
                      <th className="text-left text-white/40 text-xs font-medium px-4 py-3 hidden sm:table-cell">Phone</th>
                      <th className="text-left text-white/40 text-xs font-medium px-4 py-3">Plan</th>
                      <th className="text-left text-white/40 text-xs font-medium px-4 py-3 hidden md:table-cell">Status</th>
                      <th className="text-left text-white/40 text-xs font-medium px-4 py-3 hidden md:table-cell">Streams</th>
                      <th className="text-left text-white/40 text-xs font-medium px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#E50914]/20 flex items-center justify-center text-white text-xs font-bold">
                              {user.name.charAt(0)}
                            </div>
                            <span className="text-white text-sm">{user.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white/50 text-sm hidden sm:table-cell">{user.phone}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                            user.plan === 'Annual' ? 'bg-yellow-500/15 text-yellow-400' :
                            user.plan === 'Monthly' ? 'bg-blue-500/15 text-blue-400' :
                            user.plan === 'Weekly' ? 'bg-green-500/15 text-green-400' :
                            'bg-white/10 text-white/40'
                          }`}>
                            <Crown className="w-3 h-3" />
                            {user.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                            user.status === 'active' ? 'text-green-400' : 'text-orange-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-green-400' : 'bg-orange-400'}`} />
                            {user.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white/50 text-sm hidden md:table-cell">{user.streams}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><Edit3 className="w-3.5 h-3.5 text-white/40" /></button>
                            <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><MoreVertical className="w-3.5 h-3.5 text-white/40" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white text-sm font-semibold">Content Library</h3>
              <button className="flex items-center gap-1.5 px-4 py-2 bg-[#E50914] text-white text-xs font-medium rounded-xl hover:bg-[#ff1a25] transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Upload Content
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analyticsData.topContent.map((item) => (
                <div key={item.title} className="bg-[#1A1A1A] rounded-xl p-4 flex items-start gap-3">
                  <div className="w-16 h-10 rounded-lg bg-gradient-to-br from-[#E50914]/30 to-[#831010]/30 flex items-center justify-center flex-shrink-0">
                    <Film className="w-5 h-5 text-white/30" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white text-sm font-medium line-clamp-1">{item.title}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-white/40 text-xs flex items-center gap-1"><Eye className="w-3 h-3" />{item.views.toLocaleString()}</span>
                      <span className="text-white/40 text-xs flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" />{item.rating}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><Edit3 className="w-3.5 h-3.5 text-white/40" /></button>
                    <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5 text-white/40" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Avg Watch Time', value: analyticsData.avgWatchTime, icon: Clock },
                { label: 'Conversion Rate', value: analyticsData.conversionRate, icon: TrendingUp },
                { label: 'Churn Rate', value: analyticsData.churnRate, icon: Activity },
                { label: 'New Users/Month', value: analyticsData.newUsersThisMonth.toLocaleString(), icon: Users },
                { label: 'Streams/Day', value: '5,226', icon: Play },
                { label: 'Mobile Users', value: '78%', icon: Smartphone },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-[#1A1A1A] rounded-xl p-4">
                  <Icon className="w-5 h-5 text-[#E50914] mb-2" />
                  <p className="text-white text-lg font-bold">{value}</p>
                  <p className="text-white/40 text-xs mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Top Genres */}
            <div className="bg-[#1A1A1A] rounded-xl p-5">
              <h3 className="text-white text-sm font-semibold mb-4">Top Genres by Views</h3>
              <div className="space-y-3">
                {analyticsData.topGenres.map((genre) => (
                  <div key={genre.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm">{genre.name}</span>
                      <span className="text-white/40 text-xs">{genre.count.toLocaleString()} views ({genre.percentage}%)</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-[#E50914] rounded-full transition-all" style={{ width: `${genre.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Revenue Tab */}
        {activeTab === 'revenue' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-[#1A1A1A] rounded-xl p-5">
                <DollarSign className="w-5 h-5 text-green-400 mb-2" />
                <p className="text-white text-2xl font-bold">UGX {(analyticsData.totalRevenue / 1000000).toFixed(1)}M</p>
                <p className="text-white/40 text-xs mt-1">Total Revenue</p>
              </div>
              <div className="bg-[#1A1A1A] rounded-xl p-5">
                <TrendingUp className="w-5 h-5 text-blue-400 mb-2" />
                <p className="text-white text-2xl font-bold">UGX {(analyticsData.monthlyRevenue / 1000000).toFixed(1)}M</p>
                <p className="text-white/40 text-xs mt-1">Monthly Revenue</p>
              </div>
              <div className="bg-[#1A1A1A] rounded-xl p-5">
                <Users className="w-5 h-5 text-purple-400 mb-2" />
                <p className="text-white text-2xl font-bold">UGX 3,912</p>
                <p className="text-white/40 text-xs mt-1">Revenue Per User</p>
              </div>
            </div>

            {/* Revenue by Plan */}
            <div className="bg-[#1A1A1A] rounded-xl p-5">
              <h3 className="text-white text-sm font-semibold mb-4">Revenue by Plan</h3>
              <div className="space-y-4">
                {analyticsData.revenueByPlan.map(({ plan, amount, users, color }) => (
                  <div key={plan} className="flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-sm font-medium">{plan}</span>
                        <span className="text-white/60 text-sm">UGX {formatUGX(amount)}</span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ backgroundColor: color, width: `${(amount / analyticsData.revenueByPlan[0].amount) * 100}%` }} />
                      </div>
                      <p className="text-white/30 text-xs mt-1">{users.toLocaleString()} subscribers</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
