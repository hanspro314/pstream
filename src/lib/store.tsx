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
  User,
  AuthState,
} from './types';

// ─── Review Types (local) ───────────────────────────────────────
export interface StoredReview {
  movieId: number;
  userId: string;
  userName: string;
  rating: number;
  text: string;
  date: number;
}

// ─── State Shape ─────────────────────────────────────────────────
interface AppState {
  // Navigation
  currentView: AppView;
  previousView: AppView;
  navigationStack: AppView[];

  // Auth
  auth: AuthState;

  // Data
  dashboard: DashboardResponse | null;
  searchResults: SearchResult[];
  searchQuery: string;
  selectedMovie: Movie | null;
  selectedMovieDetail: MovieDetail | null;
  browseSort: SortOption;
  browseGenreFilter: string;
  browseFilterCategory: string | null;
  isDashboardLoading: boolean;
  isSearchLoading: boolean;
  isPreviewLoading: boolean;

  // User
  profile: UserProfile;
  watchProgress: WatchProgress[];
  watchlist: WatchlistItem[];
  recentSearches: string[];
  userReviews: StoredReview[];
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
  | { type: 'SET_BROWSE_CATEGORY'; payload: string }
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
  | { type: 'TOGGLE_SUBSCRIPTION' }
  | { type: 'ADD_REVIEW'; payload: StoredReview }
  | { type: 'SET_REVIEWS'; payload: StoredReview[] }
  // Auth actions
  | { type: 'LOGIN_REQUEST' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAIL'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'REGISTER_REQUEST' }
  | { type: 'REGISTER_SUCCESS'; payload: { user: User } }
  | { type: 'SET_OTP_SENT'; payload: { phone: string; expiry: number } }
  | { type: 'VERIFY_OTP_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'CLEAR_AUTH_ERROR' };

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
    pushNotifications: true,
    emailNotifications: true,
    newContentAlerts: true,
    wifiOnly: false,
    autoDeleteDownloads: true,
    downloadQuality: 'standard',
    parentalPin: '',
    maturityRating: 'all',
    language: 'en',
    streamingQualityMobile: 'auto',
    subtitleSize: 'medium',
  },
};

const defaultAuth: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: false,
  otpSent: false,
  otpVerified: false,
  otpExpiry: 0,
  error: null,
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
  auth: defaultAuth,
  dashboard: null,
  searchResults: [],
  searchQuery: '',
  selectedMovie: null,
  selectedMovieDetail: null,
  browseSort: 'latest',
  browseGenreFilter: 'All',
  browseFilterCategory: null,
  isDashboardLoading: true,
  isSearchLoading: false,
  isPreviewLoading: false,
  profile: defaultProfile,
  watchProgress: [],
  watchlist: [],
  recentSearches: [],
  userReviews: [],
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
    case 'SET_BROWSE_CATEGORY':
      return { ...state, browseFilterCategory: action.payload };
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
    case 'ADD_REVIEW': {
      const existing = state.userReviews.findIndex(
        (r) => r.movieId === action.payload.movieId && r.userId === action.payload.userId
      );
      let reviews: StoredReview[];
      if (existing >= 0) {
        reviews = [...state.userReviews];
        reviews[existing] = action.payload;
      } else {
        reviews = [action.payload, ...state.userReviews];
      }
      return { ...state, userReviews: reviews.slice(0, 500) };
    }
    case 'SET_REVIEWS':
      return { ...state, userReviews: action.payload };
    // ─── Auth Reducers ──────────────────────────────────────────
    case 'LOGIN_REQUEST':
      return {
        ...state,
        auth: { ...state.auth, isLoading: true, error: null },
      };
    case 'LOGIN_SUCCESS': {
      const { user } = action.payload;
      try {
        localStorage.setItem('pstream_session_token', action.payload.token);
      } catch { /* quota */ }
      try {
        localStorage.setItem('pstream_auth', JSON.stringify({
          isAuthenticated: true,
          user,
        }));
      } catch { /* quota */ }
      return {
        ...state,
        auth: {
          ...state.auth,
          isAuthenticated: true,
          user,
          isLoading: false,
          error: null,
        },
        profile: {
          ...state.profile,
          name: user.name,
          email: user.email || state.profile.email,
          subscription: {
            active: user.isSubscribed || user.freeTrialActive,
            plan: user.plan === 'free' ? 'Free' : user.plan.charAt(0).toUpperCase() + user.plan.slice(1),
            startDate: user.freeTrialActive ? new Date(Date.now() - 86400000).toISOString() : null,
            expiryDate: user.freeTrialActive ? new Date(user.freeTrialExpiry).toISOString() : null,
          },
        },
      };
    }
    case 'LOGIN_FAIL':
      return {
        ...state,
        auth: {
          ...state.auth,
          isLoading: false,
          error: action.payload,
        },
      };
    case 'LOGOUT': {
      try { localStorage.removeItem('pstream_session_token'); } catch { /* */ }
      try { localStorage.removeItem('pstream_auth'); } catch { /* */ }
      return {
        ...state,
        auth: defaultAuth,
        profile: defaultProfile,
        currentView: 'login',
        navigationStack: ['login'],
      };
    }
    case 'REGISTER_REQUEST':
      return {
        ...state,
        auth: { ...state.auth, isLoading: true, error: null },
      };
    case 'REGISTER_SUCCESS':
      return {
        ...state,
        auth: {
          ...state.auth,
          isLoading: false,
          user: action.payload.user,
          error: null,
        },
      };
    case 'SET_OTP_SENT':
      return {
        ...state,
        auth: {
          ...state.auth,
          isLoading: false,
          otpSent: true,
          otpVerified: false,
          otpExpiry: action.payload.expiry,
          error: null,
        },
      };
    case 'VERIFY_OTP_SUCCESS': {
      const { user } = action.payload;
      try {
        localStorage.setItem('pstream_session_token', action.payload.token);
      } catch { /* quota */ }
      try {
        localStorage.setItem('pstream_auth', JSON.stringify({
          isAuthenticated: true,
          user,
        }));
      } catch { /* quota */ }
      return {
        ...state,
        auth: {
          ...state.auth,
          isAuthenticated: true,
          user,
          isLoading: false,
          otpSent: false,
          otpVerified: true,
          error: null,
        },
        profile: {
          ...state.profile,
          name: user.name,
          email: user.email || state.profile.email,
          subscription: {
            active: user.isSubscribed || user.freeTrialActive,
            plan: user.plan === 'free' ? 'Free' : user.plan.charAt(0).toUpperCase() + user.plan.slice(1),
            startDate: user.freeTrialActive ? new Date(Date.now() - 86400000).toISOString() : null,
            expiryDate: user.freeTrialActive ? new Date(user.freeTrialExpiry).toISOString() : null,
          },
        },
      };
    }
    case 'UPDATE_USER': {
      const updatedUser = state.auth.user
        ? { ...state.auth.user, ...action.payload }
        : null;
      if (updatedUser) {
        try {
          localStorage.setItem('pstream_auth', JSON.stringify({
            isAuthenticated: state.auth.isAuthenticated,
            user: updatedUser,
          }));
        } catch { /* quota */ }
      }
      return {
        ...state,
        auth: { ...state.auth, user: updatedUser },
      };
    }
    case 'CLEAR_AUTH_ERROR':
      return {
        ...state,
        auth: { ...state.auth, error: null },
      };
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
    auth: loadFromStorage('auth', defaultAuth),
    profile: loadFromStorage('profile', defaultProfile),
    watchProgress: loadFromStorage('watchProgress', []),
    watchlist: loadFromStorage('watchlist', []),
    recentSearches: loadFromStorage('recentSearches', []),
    userReviews: loadFromStorage<StoredReview[]>('reviews', []),
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

  useEffect(() => {
    try {
      localStorage.setItem('pstream_reviews', JSON.stringify(state.userReviews));
    } catch { /* quota exceeded */ }
  }, [state.userReviews]);

  // Validate session on mount
  useEffect(() => {
    if (state.auth.isAuthenticated && state.auth.user) {
      // Already loaded from storage
    }
  }, []);

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
