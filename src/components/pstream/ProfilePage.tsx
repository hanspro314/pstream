/* PStream Profile Page — User profile, watchlist, history, settings */

'use client';

import React, { useState } from 'react';
import {
  User, Mail, Crown, Clock, Heart, Trash2, Settings as SettingsIcon,
  LogOut, Edit3, Check, X, ToggleLeft, ToggleRight, Monitor,
  Bell, Shield
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import MovieCard from './MovieCard';
import type { Movie } from '@/lib/types';

type ProfileTab = 'history' | 'watchlist' | 'settings';

export default function ProfilePage() {
  const { state, dispatch, navigate } = useAppStore();
  const [activeTab, setActiveTab] = useState<ProfileTab>('history');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(state.profile.name);
  const [editEmail, setEditEmail] = useState(state.profile.email);

  const { profile, watchProgress, watchlist } = state;

  const handleSaveProfile = () => {
    dispatch({ type: 'UPDATE_PROFILE', payload: { name: editName, email: editEmail } });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(profile.name);
    setEditEmail(profile.email);
    setIsEditing(false);
  };

  const handleLogout = () => {
    // Reset to defaults
    dispatch({ type: 'UPDATE_PROFILE', payload: { name: 'Guest User', email: 'guest@pstream.ug' } });
    navigate('home');
  };

  const handleHistoryMovieClick = (wp: typeof watchProgress[0]) => {
    const movie: Movie = {
      id: wp.movieId,
      subscriber: '',
      paid: '',
      title: wp.title,
      image: wp.image,
      vj: wp.vj,
      vid: wp.vid,
      ldur: '',
      state: '',
      category_id: 0,
      playingurl: wp.playingurl,
    };
    dispatch({ type: 'SELECT_MOVIE', payload: movie });
    navigate('player');
  };

  const handleWatchlistMovieClick = (item: typeof watchlist[0]) => {
    const movie: Movie = {
      id: item.movieId,
      subscriber: '',
      paid: '',
      title: item.title,
      image: item.image,
      vj: item.vj,
      vid: item.vid,
      ldur: item.ldur,
      state: '',
      category_id: 0,
      playingurl: item.playingurl,
    };
    dispatch({ type: 'SELECT_MOVIE', payload: movie });
    navigate('player');
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-UG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-20 px-4 md:px-12 pb-24 md:pb-8"
    >
      <div className="max-w-3xl mx-auto">
        {/* Profile header */}
        <div className="bg-[#1A1A1A] rounded-2xl p-6 md:p-8 mb-6">
          <div className="flex items-start gap-4 mb-6">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E50914] to-[#831010] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-2xl font-bold">
                {profile.name.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-[#252525] text-white rounded-lg px-3 py-1.5 text-sm border border-white/10 focus:outline-none focus:border-[#E50914]/50 flex-1"
                      placeholder="Your name"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="bg-[#252525] text-white rounded-lg px-3 py-1.5 text-sm border border-white/10 focus:outline-none focus:border-[#E50914]/50 flex-1"
                      placeholder="Your email"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveProfile}
                      className="flex items-center gap-1 bg-[#E50914] text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-[#ff1a25] transition-colors"
                    >
                      <Check className="w-3 h-3" /> Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex items-center gap-1 bg-white/10 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-white/20 transition-colors"
                    >
                      <X className="w-3 h-3" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-white text-lg font-bold">{profile.name}</h2>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                      aria-label="Edit profile"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-white/50" />
                    </button>
                  </div>
                  <p className="text-white/50 text-sm flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {profile.email}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Subscription badge */}
          <div className={`rounded-xl p-4 ${
            profile.subscription.active
              ? 'bg-gradient-to-r from-[#E50914]/10 to-[#831010]/10 border border-[#E50914]/20'
              : 'bg-white/5 border border-white/10'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className={`w-5 h-5 ${profile.subscription.active ? 'text-yellow-400' : 'text-white/30'}`} />
                <div>
                  <p className={`text-sm font-semibold ${profile.subscription.active ? 'text-[#E50914]' : 'text-white/60'}`}>
                    {profile.subscription.active ? 'PStream Premium' : 'Free Plan'}
                  </p>
                  <p className="text-white/40 text-xs">
                    {profile.subscription.active && profile.subscription.expiryDate
                      ? `Expires ${new Date(profile.subscription.expiryDate).toLocaleDateString('en-UG')}`
                      : 'Upgrade to unlock all features'}
                  </p>
                </div>
              </div>
              {!profile.subscription.active && (
                <button
                  onClick={() => navigate('subscribe')}
                  className="bg-[#E50914] text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-[#ff1a25] transition-colors"
                >
                  Upgrade
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#1A1A1A] rounded-xl p-1 mb-6">
          {[
            { id: 'history' as ProfileTab, label: 'Watch History', icon: Clock, count: watchProgress.length },
            { id: 'watchlist' as ProfileTab, label: 'My List', icon: Heart, count: watchlist.length },
            { id: 'settings' as ProfileTab, label: 'Settings', icon: SettingsIcon },
          ].map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === id
                  ? 'bg-[#E50914] text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
              {count !== undefined && (
                <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded-full">{count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'history' && (
          <div>
            {watchProgress.length > 0 ? (
              <div className="space-y-2">
                {watchProgress.map((wp) => (
                  <div
                    key={wp.movieId}
                    onClick={() => handleHistoryMovieClick(wp)}
                    className="flex items-center gap-3 bg-[#1A1A1A] rounded-xl p-3 hover:bg-[#252525] transition-colors cursor-pointer"
                  >
                    <div className="w-12 h-16 rounded-lg overflow-hidden bg-[#252525] flex-shrink-0 relative">
                      <img
                        src={
                          wp.image.startsWith('http')
                            ? wp.image
                            : `https://munoapp.org/munowatch-api/laba/yo/naki/${wp.image}.jpg`
                        }
                        alt={wp.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white text-sm font-medium line-clamp-1">{wp.title}</h4>
                      <p className="text-white/40 text-xs">{formatDate(wp.lastWatched)}</p>
                      {/* Progress */}
                      <div className="mt-1.5 w-full h-1 bg-white/10 rounded-full">
                        <div
                          className="h-full bg-[#E50914] rounded-full"
                          style={{
                            width: `${wp.duration > 0 ? Math.min((wp.currentTime / wp.duration) * 100, 100) : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch({ type: 'REMOVE_WATCH_PROGRESS', payload: wp.movieId });
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      aria-label="Remove from history"
                    >
                      <Trash2 className="w-4 h-4 text-white/30 hover:text-[#E50914]" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Clock}
                title="No watch history"
                description="Start watching movies to see your history here"
              />
            )}
          </div>
        )}

        {activeTab === 'watchlist' && (
          <div>
            {watchlist.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {watchlist.map((item) => (
                  <div key={item.movieId} className="relative group" onClick={() => handleWatchlistMovieClick(item)}>
                    <MovieCard
                      movie={{
                        id: item.movieId,
                        subscriber: '',
                        paid: '',
                        title: item.title,
                        image: item.image,
                        vj: item.vj,
                        vid: item.vid,
                        ldur: item.ldur,
                        state: '',
                        category_id: 0,
                        playingurl: item.playingurl,
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch({ type: 'REMOVE_FROM_WATCHLIST', payload: item.movieId });
                      }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      aria-label="Remove from list"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Heart}
                title="Your list is empty"
                description="Add movies to your list to watch them later"
              />
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-3">
            <SettingsToggle
              icon={Monitor}
              title="Autoplay"
              description="Automatically play next episode"
              value={profile.settings.autoplay}
              onChange={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { autoplay: !profile.settings.autoplay } })}
            />
            <SettingsToggle
              icon={Bell}
              title="Notifications"
              description="Get notified about new releases"
              value={profile.settings.notifications}
              onChange={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { notifications: !profile.settings.notifications } })}
            />

            {/* Quality selector */}
            <div className="bg-[#1A1A1A] rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <Monitor className="w-5 h-5 text-[#E50914]" />
                <div>
                  <p className="text-white text-sm font-medium">Video Quality</p>
                  <p className="text-white/40 text-xs">Choose your preferred quality</p>
                </div>
              </div>
              <div className="flex gap-2">
                {(['auto', '360p', '480p', '720p', '1080p'] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => dispatch({ type: 'UPDATE_SETTINGS', payload: { quality: q } })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      profile.settings.quality === q
                        ? 'bg-[#E50914] text-white'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    {q.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white/70 hover:text-[#E50914] hover:border-[#E50914]/30 rounded-xl p-4 text-sm font-medium transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-white/20" />
      </div>
      <p className="text-white/60 text-base font-medium mb-1">{title}</p>
      <p className="text-white/30 text-sm">{description}</p>
    </div>
  );
}

function SettingsToggle({
  icon: Icon,
  title,
  description,
  value,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  value: boolean;
  onChange: () => void;
}) {
  return (
    <div className="bg-[#1A1A1A] rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-[#E50914]" />
          <div>
            <p className="text-white text-sm font-medium">{title}</p>
            <p className="text-white/40 text-xs">{description}</p>
          </div>
        </div>
        <button
          onClick={onChange}
          className="flex-shrink-0"
          aria-label={`${title}: ${value ? 'On' : 'Off'}`}
        >
          {value ? (
            <ToggleRight className="w-8 h-8 text-[#E50914]" />
          ) : (
            <ToggleLeft className="w-8 h-8 text-white/30" />
          )}
        </button>
      </div>
    </div>
  );
}
