/* PStream Bottom Navigation — Mobile bottom tab bar */

'use client';

import React from 'react';
import { useAppStore } from '@/lib/store';
import { Home, Search, Grid3X3, Crown, User, LogIn } from 'lucide-react';

export default function BottomNav() {
  const { state, navigate } = useAppStore();
  const isAuthenticated = state.auth.isAuthenticated;

  // Hide bottom nav when watching a video or on auth pages
  if (state.currentView === 'player' || state.currentView === 'login' || state.currentView === 'register') {
    return null;
  }

  const tabs = isAuthenticated
    ? [
        { view: 'home' as const, icon: Home, label: 'Home' },
        { view: 'search' as const, icon: Search, label: 'Search' },
        { view: 'browse' as const, icon: Grid3X3, label: 'Browse' },
        { view: 'subscribe' as const, icon: Crown, label: 'Subscribe' },
        { view: 'profile' as const, icon: User, label: 'Profile' },
      ]
    : [
        { view: 'home' as const, icon: Home, label: 'Home' },
        { view: 'search' as const, icon: Search, label: 'Search' },
        { view: 'browse' as const, icon: Grid3X3, label: 'Browse' },
        { view: 'subscribe' as const, icon: Crown, label: 'Subscribe' },
        { view: 'login' as const, icon: LogIn, label: 'Sign In' },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0A0A0A]/95 backdrop-blur-lg border-t border-white/10">
      <div className="flex items-center justify-around h-16 px-2 safe-area-bottom">
        {tabs.map(({ view, icon: Icon, label }) => {
          const isActive = state.currentView === view;
          return (
            <button
              key={view}
              onClick={() => navigate(view)}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl min-w-[56px] transition-all ${
                isActive ? 'text-[#E50914]' : 'text-white/50 hover:text-white/80'
              }`}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
              {isActive && (
                <span className="absolute bottom-2 w-1 h-1 rounded-full bg-[#E50914]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
