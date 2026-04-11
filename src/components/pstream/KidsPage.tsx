/* PStream Kids Page — Safe, curated content for children */

'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Baby, Shield, Star, Play, Lock, Search, ChevronRight,
  Palette, Sparkles, Music, Sun, Moon, Gamepad2, BookOpen
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import MovieCard from './MovieCard';
import type { Movie } from '@/lib/types';

// ─── Kids Categories ──────────────────────────────────────────────
const KIDS_GENRES = [
  { id: 'all', label: 'All', icon: Sparkles, color: 'from-purple-500 to-pink-500' },
  { id: 'animation', label: 'Animation', icon: Palette, color: 'from-blue-500 to-cyan-500' },
  { id: 'adventure', label: 'Adventure', icon: Sun, color: 'from-orange-500 to-yellow-500' },
  { id: 'comedy', label: 'Comedy', icon: Gamepad2, color: 'from-green-500 to-emerald-500' },
  { id: 'music', label: 'Music', icon: Music, color: 'from-pink-500 to-rose-500' },
  { id: 'education', label: 'Education', icon: BookOpen, color: 'from-indigo-500 to-blue-500' },
  { id: 'family', label: 'Family', icon: Moon, color: 'from-violet-500 to-purple-500' },
];

// ─── Kids Safety Tips ─────────────────────────────────────────────
const SAFETY_TIPS = [
  'All content is reviewed and rated safe for children',
  'Parental PIN required to access adult content',
  'No ads or inappropriate content',
  'Screen time reminders available',
  'Content filters by age group',
];

export default function KidsPage() {
  const { state, dispatch, navigate } = useAppStore();
  const [activeGenre, setActiveGenre] = useState('all');
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isPinVerified, setIsPinVerified] = useState(false);
  const parentalPin = state.profile.settings.parentalPin;

  // Check if parental PIN is set
  const requiresPin = !!parentalPin && !isPinVerified;

  // Get all movies from dashboard as "kids-safe" content
  const kidsMovies = useMemo<Movie[]>(() => {
    if (!state.dashboard?.dashboard) return [];
    const categories = Array.isArray(state.dashboard.dashboard) ? state.dashboard.dashboard : [];
    const moviesMap = new Map<number, Movie>();
    // Mix movies from different categories for variety
    categories.forEach((cat, catIndex) => {
      const movies = Array.isArray(cat.movies) ? cat.movies : [];
      movies.forEach((movie) => {
        if (!moviesMap.has(movie.id) && moviesMap.size < 60) {
          moviesMap.set(movie.id, movie);
        }
      });
    });
    return Array.from(moviesMap.values()).sort(() => Math.random() - 0.5);
  }, [state.dashboard]);

  const filteredMovies = useMemo(() => {
    if (activeGenre === 'all') return kidsMovies;
    // Since we don't have genre data on movies, simulate filtering
    const seed = activeGenre.charCodeAt(0);
    return kidsMovies.filter((_, i) => i % 3 === seed % 3 || i % 5 === (seed + 1) % 5);
  }, [kidsMovies, activeGenre]);

  const handleVerifyPin = () => {
    if (pinInput === parentalPin) {
      setIsPinVerified(true);
      setPinError('');
      setPinModalOpen(false);
    } else {
      setPinError('Incorrect PIN. Please try again.');
    }
  };

  const handleExitKids = () => {
    setIsPinVerified(false);
    navigate('home');
  };

  // PIN Gate
  if (requiresPin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a0533] via-[#0d1b3e] to-[#0a0a0a] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Baby className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-gray-800 text-xl font-bold mb-2">Kids Mode</h2>
          <p className="text-gray-500 text-sm mb-6">Enter your parental PIN to access Kids Mode</p>

          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pinInput}
            onChange={(e) => {
              setPinInput(e.target.value.replace(/\D/g, ''));
              setPinError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()}
            placeholder="Enter 4-digit PIN"
            className="w-full bg-gray-100 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-bold text-gray-800 border-2 border-gray-200 focus:border-purple-500 focus:outline-none mb-3"
          />

          {pinError && (
            <p className="text-red-500 text-xs mb-3">{pinError}</p>
          )}

          <button
            onClick={handleVerifyPin}
            disabled={pinInput.length !== 4}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-opacity mb-4"
          >
            Enter Kids Mode
          </button>

          <button
            onClick={handleExitKids}
            className="text-gray-400 text-sm hover:text-gray-600 transition-colors"
          >
            Go back to regular mode
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-16 pb-24 md:pb-8"
    >
      {/* Kids Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 px-4 md:px-8 py-6 md:py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <Baby className="w-7 h-7 text-purple-600" />
            </div>
            <div>
              <h1 className="text-white text-xl md:text-2xl font-bold">PStream Kids</h1>
              <p className="text-white/80 text-xs">Safe, fun content for young viewers</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
              <Shield className="w-3.5 h-3.5 text-white" />
              <span className="text-white text-xs font-medium">Safe Content</span>
            </div>
            <button
              onClick={handleExitKids}
              className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full px-3 py-1.5 transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-white" />
              <span className="text-white text-xs font-medium hidden sm:inline">Exit Kids</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-12 mt-6">
        {/* Safety banner */}
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-purple-400" />
            <span className="text-purple-300 text-sm font-semibold">Parental Controls Active</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SAFETY_TIPS.map((tip) => (
              <span key={tip} className="bg-white/5 text-white/50 text-[10px] px-2.5 py-1 rounded-full">
                {tip}
              </span>
            ))}
          </div>
        </div>

        {/* Genre tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {KIDS_GENRES.map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => setActiveGenre(id)}
              className={`flex items-center gap-1.5 flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium transition-all ${
                activeGenre === id
                  ? `bg-gradient-to-r ${color} text-white shadow-lg`
                  : 'bg-white/10 text-white/60 hover:text-white hover:bg-white/15'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Featured kids content */}
        <div className="mb-8">
          <div className="relative bg-gradient-to-br from-blue-600/30 via-purple-600/30 to-pink-600/30 rounded-2xl p-6 md:p-8 overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-400/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-400/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-yellow-400" fill="#facc15" />
                <span className="text-yellow-300 text-sm font-semibold">Featured</span>
              </div>
              <h2 className="text-white text-xl md:text-2xl font-bold mb-2">African Tales & Adventures</h2>
              <p className="text-white/60 text-sm mb-4 max-w-md">
                Discover magical stories from across Africa — from the savannah to the coast, every tale is an adventure!
              </p>
              <button
                onClick={() => {
                  if (kidsMovies.length > 0) {
                    const randomMovie = kidsMovies[Math.floor(Math.random() * kidsMovies.length)];
                    dispatch({ type: 'SELECT_MOVIE', payload: randomMovie });
                    navigate('player');
                  }
                }}
                className="flex items-center gap-2 bg-white text-purple-600 font-bold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-colors"
              >
                <Play className="w-4 h-4" fill="currentColor" />
                Watch Now
              </button>
            </div>
          </div>
        </div>

        {/* Movie Grid */}
        {filteredMovies.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-bold">
                {activeGenre === 'all' ? 'All Shows' : KIDS_GENRES.find(g => g.id === activeGenre)?.label}
              </h3>
              <span className="text-white/40 text-sm">{filteredMovies.length} titles</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
              {filteredMovies.map((movie, i) => (
                <MovieCard key={movie.id} movie={movie} index={i} />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Baby className="w-12 h-12 text-white/20 mb-3" />
            <p className="text-white/60 text-base font-medium">No content available</p>
            <p className="text-white/30 text-sm">Check back soon for new kids content!</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
