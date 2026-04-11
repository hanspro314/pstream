/* PStream Application Store — React Context + localStorage */

'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import type {
  AppView,
  WatchProgress,
  WatchlistItem,
  UserProfile,
  UserSettings,
  Movie,
  DashboardResponse,
  SearchResult,
  MovieDetail,
  SortOption,
} from './types';

// ─── State Shape ─────────────────────────────────────────────────
interface AppState {
  // Navigation
  currentView: AppView;
  previousView: AppView;
  navigationStack: AppView[];

  // Data
  dashboard: DashboardResponse | null;
  searchResults: SearchResult[];
  searchQuery: string;
  selectedMovie: Movie | null;
  selectedMovieDetail: MovieDetail | null;
  browseSort: SortOption;
  browseGenreFilter: string;
  isDashboardLoading: boolean;
  isSearchLoading: boolean;
  isPreviewLoading: boolean;

  // User
  profile: UserProfile;
  watchProgress: WatchProgress[];
  watchlist: WatchlistItem[];
  recentSearches: string[];
}

// ─── Actions ─────────────────────────────────────────────────────
type AppAction =
  | { type: 'NAVIGATE'; payload: AppView }
  | { type: 'GO_BACK' }
  | { type: 'SET_DASHBOARD'; payload: DashboardResponse }
  | { type: 'SET_DASHBOARD_LOADING'; payload: boolean }
  | { type: 'SET_SEARCH_RESULTS'; payload: SearchResult[] }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SEARCH_LOADING'; payload: boolean }
  | { type: 'SELECT_MOVIE'; payload: Movie }
  | { type: 'SET_MOVIE_DETAIL'; payload: MovieDetail }
  | { type: 'SET_PREVIEW_LOADING'; payload: boolean }
  | { type: 'SET_BROWSE_SORT'; payload: SortOption }
  | { type: 'SET_BROWSE_GENRE_FILTER'; payload: string }
  | { type: 'UPDATE_PROFILE'; payload: Partial<UserProfile> }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<UserSettings> }
  | { type: 'SET_WATCH_PROGRESS'; payload: WatchProgress[] }
  | { type: 'UPDATE_WATCH_PROGRESS'; payload: WatchProgress }
  | { type: 'REMOVE_WATCH_PROGRESS'; payload: number }
  | { type: 'SET_WATCHLIST'; payload: WatchlistItem[] }
  | { type: 'ADD_TO_WATCHLIST'; payload: WatchlistItem }
  | { type: 'REMOVE_FROM_WATCHLIST'; payload: number }
  | { type: 'SET_RECENT_SEARCHES'; payload: string[] }
  | { type: 'ADD_RECENT_SEARCH'; payload: string }
  | { type: 'TOGGLE_SUBSCRIPTION' };

// ─── Initial State ───────────────────────────────────────────────
const defaultProfile: UserProfile = {
  name: 'Guest User',
  email: 'guest@pstream.ug',
  subscription: {
    active: false,
    plan: 'Free',
    expiryDate: null,
    startDate: null,
  },
  settings: {
    autoplay: true,
    quality: 'auto',
    notifications: true,
  },
};

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(`pstream_${key}`);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

const initialState: AppState = {
  currentView: 'home',
  previousView: 'home',
  navigationStack: ['home'],
  dashboard: null,
  searchResults: [],
  searchQuery: '',
  selectedMovie: null,
  selectedMovieDetail: null,
  browseSort: 'latest',
  browseGenreFilter: 'All',
  isDashboardLoading: true,
  isSearchLoading: false,
  isPreviewLoading: false,
  profile: defaultProfile,
  watchProgress: [],
  watchlist: [],
  recentSearches: [],
};

// ─── Reducer ─────────────────────────────────────────────────────
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'NAVIGATE':
      return {
        ...state,
        previousView: state.currentView,
        currentView: action.payload,
        navigationStack: [...state.navigationStack, action.payload],
      };
    case 'GO_BACK': {
      const stack = state.navigationStack.slice(0, -1);
      const prevView = stack.length > 0 ? stack[stack.length - 1] : 'home';
      return {
        ...state,
        currentView: prevView,
        previousView: state.currentView,
        navigationStack: stack.length > 0 ? stack : ['home'],
      };
    }
    case 'SET_DASHBOARD':
      return { ...state, dashboard: action.payload, isDashboardLoading: false };
    case 'SET_DASHBOARD_LOADING':
      return { ...state, isDashboardLoading: action.payload };
    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.payload, isSearchLoading: false };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_SEARCH_LOADING':
      return { ...state, isSearchLoading: action.payload };
    case 'SELECT_MOVIE':
      return { ...state, selectedMovie: action.payload };
    case 'SET_MOVIE_DETAIL':
      return { ...state, selectedMovieDetail: action.payload, isPreviewLoading: false };
    case 'SET_PREVIEW_LOADING':
      return { ...state, isPreviewLoading: action.payload };
    case 'SET_BROWSE_SORT':
      return { ...state, browseSort: action.payload };
    case 'SET_BROWSE_GENRE_FILTER':
      return { ...state, browseGenreFilter: action.payload };
    case 'UPDATE_PROFILE':
      return { ...state, profile: { ...state.profile, ...action.payload } };
    case 'UPDATE_SETTINGS':
      return { ...state, profile: { ...state.profile, settings: { ...state.profile.settings, ...action.payload } } };
    case 'SET_WATCH_PROGRESS':
      return { ...state, watchProgress: action.payload };
    case 'UPDATE_WATCH_PROGRESS': {
      const exists = state.watchProgress.findIndex((w) => w.movieId === action.payload.movieId);
      let newProgress: WatchProgress[];
      if (exists >= 0) {
        newProgress = [...state.watchProgress];
        newProgress[exists] = action.payload;
      } else {
        newProgress = [action.payload, ...state.watchProgress];
      }
      // Keep max 50 items
      newProgress = newProgress.slice(0, 50);
      return { ...state, watchProgress: newProgress };
    }
    case 'REMOVE_WATCH_PROGRESS':
      return { ...state, watchProgress: state.watchProgress.filter((w) => w.movieId !== action.payload) };
    case 'SET_WATCHLIST':
      return { ...state, watchlist: action.payload };
    case 'ADD_TO_WATCHLIST': {
      const alreadyExists = state.watchlist.some((w) => w.movieId === action.payload.movieId);
      if (alreadyExists) return state;
      return { ...state, watchlist: [action.payload, ...state.watchlist] };
    }
    case 'REMOVE_FROM_WATCHLIST':
      return { ...state, watchlist: state.watchlist.filter((w) => w.movieId !== action.payload) };
    case 'SET_RECENT_SEARCHES':
      return { ...state, recentSearches: action.payload };
    case 'ADD_RECENT_SEARCH': {
      const filtered = state.recentSearches.filter((s) => s.toLowerCase() !== action.payload.toLowerCase());
      const newSearches = [action.payload, ...filtered].slice(0, 10);
      return { ...state, recentSearches: newSearches };
    }
    case 'TOGGLE_SUBSCRIPTION': {
      const nowActive = !state.profile.subscription.active;
      const now = new Date().toISOString();
      return {
        ...state,
        profile: {
          ...state.profile,
          subscription: {
            active: nowActive,
            plan: nowActive ? 'Premium' : 'Free',
            startDate: nowActive ? now : null,
            expiryDate: nowActive ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
          },
        },
      };
    }
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  navigate: (view: AppView) => void;
  goBack: () => void;
  isInWatchlist: (movieId: number) => boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, {
    ...initialState,
    profile: loadFromStorage('profile', defaultProfile),
    watchProgress: loadFromStorage('watchProgress', []),
    watchlist: loadFromStorage('watchlist', []),
    recentSearches: loadFromStorage('recentSearches', []),
  });

  const navigate = useCallback((view: AppView) => {
    dispatch({ type: 'NAVIGATE', payload: view });
  }, []);

  const goBack = useCallback(() => {
    dispatch({ type: 'GO_BACK' });
  }, []);

  const isInWatchlist = useCallback(
    (movieId: number) => state.watchlist.some((w) => w.movieId === movieId),
    [state.watchlist]
  );

  // Persist to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem('pstream_profile', JSON.stringify(state.profile));
    } catch { /* quota exceeded */ }
  }, [state.profile]);

  useEffect(() => {
    try {
      localStorage.setItem('pstream_watchProgress', JSON.stringify(state.watchProgress));
    } catch { /* quota exceeded */ }
  }, [state.watchProgress]);

  useEffect(() => {
    try {
      localStorage.setItem('pstream_watchlist', JSON.stringify(state.watchlist));
    } catch { /* quota exceeded */ }
  }, [state.watchlist]);

  useEffect(() => {
    try {
      localStorage.setItem('pstream_recentSearches', JSON.stringify(state.recentSearches));
    } catch { /* quota exceeded */ }
  }, [state.recentSearches]);

  return (
    <AppContext.Provider value={{ state, dispatch, navigate, goBack, isInWatchlist }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}
