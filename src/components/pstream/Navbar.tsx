/* PStream Navigation Bar — Top navigation for desktop */

'use client';

import React from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { Search, Bell, ChevronLeft, User, Home, Grid3X3, Crown } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Navbar() {
  const { state, navigate, goBack } = useAppStore();
  const showBack = state.currentView !== 'home';

  return (
    <motion.header
      initial={{ y: -64 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-[#0A0A0A]/95 via-[#0A0A0A]/80 to-transparent"
    >
      <div className="flex items-center justify-between px-4 md:px-8 h-16">
        {/* Left section */}
        <div className="flex items-center gap-4">
          {showBack && (
            <button
              onClick={goBack}
              className="flex items-center gap-1 text-white/70 hover:text-white transition-colors"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm hidden sm:inline">Back</span>
            </button>
          )}

          <Link href="/" className="flex items-center gap-2" onClick={() => navigate('home')}>
            <div className="bg-[#E50914] rounded-lg w-8 h-8 flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-white font-bold text-xl hidden sm:block tracking-tight">
              PStream
            </span>
          </Link>
        </div>

        {/* Center nav links (desktop) */}
        <nav className="hidden md:flex items-center gap-6">
          <button
            onClick={() => navigate('home')}
            className={`text-sm font-medium transition-colors ${
              state.currentView === 'home'
                ? 'text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => navigate('browse')}
            className={`text-sm font-medium transition-colors ${
              state.currentView === 'browse'
                ? 'text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Browse
          </button>
          <button
            onClick={() => navigate('subscribe')}
            className={`text-sm font-medium transition-colors ${
              state.currentView === 'subscribe'
                ? 'text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Subscribe
          </button>
        </nav>

        {/* Right section */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('search')}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Search"
          >
            <Search className="w-5 h-5 text-white" />
          </button>
          <button className="p-2 rounded-full hover:bg-white/10 transition-colors relative" aria-label="Notifications">
            <Bell className="w-5 h-5 text-white" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#E50914] rounded-full" />
          </button>
          <button
            onClick={() => navigate('profile')}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Profile"
          >
            <User className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </motion.header>
  );
}
