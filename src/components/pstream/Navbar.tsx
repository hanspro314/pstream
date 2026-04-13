/* PStream Navigation Bar — Top navigation for desktop */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { Search, Bell, ChevronLeft, User, Home, Grid3X3, Crown, Settings, HelpCircle, LogOut, LogIn, Download, Baby, LayoutDashboard, Clock, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Navbar() {
  const { state, navigate, goBack, dispatch } = useAppStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const showBack = state.currentView !== 'home';
  const isAuthenticated = state.auth.isAuthenticated || state.tokenSession !== null;
  const userName = isAuthenticated && state.auth.user ? state.auth.user.name : state.profile.name;
  const isGuest = !isAuthenticated;
  const tokenSession = state.tokenSession;

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
          {isAuthenticated && (
            <>
              {/* Token Tier Badge */}
              {tokenSession && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 rounded-lg border border-white/5">
                  <Zap className="w-3 h-3 text-[#E50914]" />
                  <span className="text-xs text-white/60 font-medium">
                    {tokenSession.tier === 'download' ? 'Stream + DL' : tokenSession.tier === 'trial' ? 'Trial' : 'Stream'}
                  </span>
                  <span className="text-white/20">·</span>
                  <Clock className="w-3 h-3 text-white/30" />
                  <span className="text-xs text-white/40">{tokenSession.daysRemaining}d</span>
                </div>
              )}
              <button
                onClick={() => navigate('search')}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => navigate('notifications')}
                className="p-2 rounded-full hover:bg-white/10 transition-colors relative"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-white" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#E50914] rounded-full" />
              </button>
            </>
          )}

          {/* Profile / Sign In */}
          {isAuthenticated ? (
            <DropdownMenu open={profileOpen} onOpenChange={setProfileOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={() => navigate('profile')}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                  aria-label="Profile"
                >
                  <div className="w-8 h-8 rounded-full bg-[#E50914]/20 border border-[#E50914]/40 flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">
                      {userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-[#1A1A1A] border-white/10 text-white"
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium text-white">{userName}</p>
                    <p className="text-xs text-white/50">
                      {state.auth.user?.phone || state.profile.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={() => { navigate('profile'); setProfileOpen(false); }}
                  className="cursor-pointer text-white/80 focus:text-white focus:bg-white/5"
                >
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => { navigate('settings'); setProfileOpen(false); }}
                  className="cursor-pointer text-white/80 focus:text-white focus:bg-white/5"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => { navigate('help'); setProfileOpen(false); }}
                  className="cursor-pointer text-white/80 focus:text-white focus:bg-white/5"
                >
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Help
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => { navigate('kids'); setProfileOpen(false); }}
                  className="cursor-pointer text-white/80 focus:text-white focus:bg-white/5"
                >
                  <Baby className="mr-2 h-4 w-4" />
                  Kids Mode
                </DropdownMenuItem>
                {tokenSession?.tier === 'download' && (
                <DropdownMenuItem
                  onClick={() => { navigate('downloads'); setProfileOpen(false); }}
                  className="cursor-pointer text-white/80 focus:text-white focus:bg-white/5"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Downloads
                </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => { navigate('admin'); setProfileOpen(false); }}
                  className="cursor-pointer text-white/80 focus:text-white focus:bg-white/5"
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Admin
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={() => { dispatch({ type: 'LOGOUT' }); setProfileOpen(false); }}
                  className="cursor-pointer text-[#E50914] focus:text-[#E50914] focus:bg-[#E50914]/10"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={() => navigate('login')}
              className="flex items-center gap-2 px-4 py-2 bg-[#E50914] hover:bg-[#E50914]/90 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-[#E50914]/20"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </div>
    </motion.header>
  );
}
