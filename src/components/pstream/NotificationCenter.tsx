/* PStream Notification Center — Real-time notifications with categories and actions */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, BellOff, Trash2, Check, CheckCheck, Star, Crown,
  Film, AlertCircle, Gift, X, Filter, ChevronRight, Clock
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { Notification } from '@/lib/types';

// ─── Generate Demo Notifications ──────────────────────────────────
function generateDemoNotifications(): Notification[] {
  const now = Date.now();
  return [
    {
      id: '1', type: 'new_content', title: 'New Movie Available!',
      message: 'The Karamoja Chronicles is now streaming in HD. Watch it before anyone else!',
      timestamp: now - 1000 * 60 * 5, read: false,
      icon: 'film', actionUrl: 'detail',
    },
    {
      id: '2', type: 'promo', title: 'Weekend Special - 50% Off!',
      message: 'Enjoy your weekend with 50% off on all subscription plans. Use code WEEKEND50 at checkout.',
      timestamp: now - 1000 * 60 * 30, read: false,
      icon: 'gift',
    },
    {
      id: '3', type: 'subscription', title: 'Subscription Reminder',
      message: 'Your PStream Premium plan expires in 2 days. Renew now to avoid interruption.',
      timestamp: now - 1000 * 60 * 60, read: false,
      icon: 'crown',
    },
    {
      id: '4', type: 'new_content', title: 'New Series: Kampala Nights',
      message: 'Season 2 of Kampala Nights has just dropped! 12 new episodes waiting for you.',
      timestamp: now - 1000 * 60 * 60 * 3, read: true,
      icon: 'film',
    },
    {
      id: '5', type: 'system', title: 'App Update Available',
      message: 'PStream v2.5 is now available with improved video quality and faster loading times.',
      timestamp: now - 1000 * 60 * 60 * 6, read: true,
      icon: 'system',
    },
    {
      id: '6', type: 'new_content', title: 'Trending This Week',
      message: 'East Africa Stories has been viewed over 10,000 times this week. Check it out now!',
      timestamp: now - 1000 * 60 * 60 * 12, read: true,
      icon: 'star',
    },
    {
      id: '7', type: 'system', title: 'Welcome to PStream!',
      message: 'Thank you for joining PStream. Explore thousands of movies and series from across Africa.',
      timestamp: now - 1000 * 60 * 60 * 24, read: true,
      icon: 'system',
    },
    {
      id: '8', type: 'subscription', title: 'Payment Confirmed',
      message: 'Your payment of UGX 2,000 via MTN MoMo was successful. Premium access activated!',
      timestamp: now - 1000 * 60 * 60 * 48, read: true,
      icon: 'crown',
    },
    {
      id: '9', type: 'promo', title: 'Refer a Friend, Get 1 Week Free',
      message: 'Share PStream with friends and earn 1 free week for every friend who subscribes.',
      timestamp: now - 1000 * 60 * 60 * 72, read: true,
      icon: 'gift',
    },
    {
      id: '10', type: 'new_content', title: 'New Release: The Pearl',
      message: 'A powerful drama set in Jinja about love, family, and the beauty of Uganda.',
      timestamp: now - 1000 * 60 * 60 * 96, read: true,
      icon: 'film',
    },
  ];
}

type FilterTab = 'all' | 'new_content' | 'subscription' | 'promo' | 'system';

const FILTER_TABS: { id: FilterTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'all', label: 'All', icon: Bell },
  { id: 'new_content', label: 'New', icon: Film },
  { id: 'subscription', label: 'Plans', icon: Crown },
  { id: 'promo', label: 'Promos', icon: Gift },
  { id: 'system', label: 'System', icon: AlertCircle },
];

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>(generateDemoNotifications);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotifications = useMemo(() => {
    let filtered = notifications;
    if (activeFilter !== 'all') {
      filtered = filtered.filter(n => n.type === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [notifications, activeFilter, searchQuery]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const getNotificationIcon = useCallback((type: string) => {
    switch (type) {
      case 'new_content': return Film;
      case 'subscription': return Crown;
      case 'promo': return Gift;
      case 'system': return AlertCircle;
      default: return Bell;
    }
  }, []);

  const getNotificationColor = useCallback((type: string) => {
    switch (type) {
      case 'new_content': return 'bg-blue-500/15 text-blue-400 border-blue-500/20';
      case 'subscription': return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20';
      case 'promo': return 'bg-green-500/15 text-green-400 border-green-500/20';
      case 'system': return 'bg-white/10 text-white/60 border-white/10';
      default: return 'bg-white/10 text-white/60 border-white/10';
    }
  }, []);

  const formatTime = useCallback((timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-20 px-4 md:px-12 pb-24 md:pb-8"
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-xl md:text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-white/50 text-sm mt-1">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium rounded-lg transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {FILTER_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveFilter(id)}
              className={`flex items-center gap-1.5 flex-shrink-0 px-3 py-2 rounded-full text-xs font-medium transition-all ${
                activeFilter === id
                  ? 'bg-[#E50914] text-white'
                  : 'bg-[#1A1A1A] text-white/60 hover:text-white hover:bg-[#252525]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {id === 'all' && unreadCount > 0 && (
                <span className="bg-white/25 text-[10px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notifications..."
            className="w-full bg-[#1A1A1A] text-white placeholder:text-white/30 rounded-xl px-4 py-2.5 text-sm border border-white/10 focus:outline-none focus:border-[#E50914]/50"
          />
        </div>

        {/* Notification list */}
        {filteredNotifications.length > 0 ? (
          <div className="space-y-2">
            {filteredNotifications.map((notification, index) => {
              const IconComponent = getNotificationIcon(notification.type);
              const colorClass = getNotificationColor(notification.type);

              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`relative flex items-start gap-3 p-4 rounded-xl transition-colors cursor-pointer group ${
                    notification.read
                      ? 'bg-[#141414] hover:bg-[#1A1A1A]'
                      : 'bg-[#1A1A1A] hover:bg-[#222] border-l-2 border-[#E50914]'
                  }`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${colorClass}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`text-sm font-medium line-clamp-1 ${notification.read ? 'text-white/70' : 'text-white'}`}>
                        {notification.title}
                      </h3>
                      <span className="text-[10px] text-white/30 whitespace-nowrap flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTime(notification.timestamp)}
                      </span>
                    </div>
                    <p className={`text-xs mt-1 line-clamp-2 ${notification.read ? 'text-white/40' : 'text-white/60'}`}>
                      {notification.message}
                    </p>
                    {notification.actionUrl && (
                      <div className="flex items-center gap-1 mt-2 text-[#E50914] text-xs font-medium">
                        <span>View details</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notification.read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        aria-label="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5 text-white/50" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                      aria-label="Delete notification"
                    >
                      <X className="w-3.5 h-3.5 text-white/50 hover:text-[#E50914]" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center mb-4">
              <BellOff className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-white/60 text-base font-medium mb-1">
              {searchQuery ? 'No matching notifications' : 'No notifications yet'}
            </p>
            <p className="text-white/30 text-sm">
              {searchQuery ? 'Try a different search term' : 'We\'ll notify you about new releases and updates'}
            </p>
          </div>
        )}

        {/* Notification preferences link */}
        <div className="mt-6 text-center">
          <button className="text-white/40 hover:text-white/60 text-xs transition-colors">
            Manage notification preferences
          </button>
        </div>
      </div>
    </motion.div>
  );
}
