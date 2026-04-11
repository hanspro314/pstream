/* PStream Type Definitions */

// ─── View / Navigation ───────────────────────────────────────────
export type AppView = 'home' | 'browse' | 'search' | 'player' | 'subscribe' | 'profile';

// ─── Movie Types ─────────────────────────────────────────────────
export interface Movie {
  id: number;
  subscriber: string;
  paid: string;
  title: string;
  image: string;
  vj: string;
  vid: string;
  ldur: string;
  state: string;
  category_id: number;
  playingurl: string;
}

export interface MovieDetail {
  id: number;
  video_title: string;
  description: string;
  video_name: string;
  playingUrl: string;
  duration: string;
  thumbnail: string;
  category_id: number;
  genre: string;
  vjname: string;
  episodes: number;
  size: string;
  language_id: number;
  lang_name: string;
  series_code: string;
  subscriber: string;
  paid: string;
  [key: string]: unknown;
}

export interface Episode {
  id: number;
  episode_name: string;
  playingUrl: string;
  thumbnail: string;
  duration: string;
}

// ─── Dashboard Types ─────────────────────────────────────────────
export interface DashboardCategory {
  category: string;
  movies: Movie[];
}

export interface DashboardBanner {
  id: number;
  video_title: string;
  description: string;
  video_name: string;
  playingUrl: string;
  thumbnail?: string;
  image?: string;
  [key: string]: unknown;
}

export interface DashboardResponse {
  dashboard: DashboardCategory[];
  banner: DashboardBanner;
}

// ─── Search Types ────────────────────────────────────────────────
export interface SearchResult {
  id: number;
  title: string;
  subscriber: string;
  paid: string;
  image: string;
  vj: string;
  ldur: string;
  category_id: number;
  playingurl: string;
}

// ─── User State Types ────────────────────────────────────────────
export interface WatchProgress {
  movieId: number;
  title: string;
  image: string;
  vid: string;
  playingurl: string;
  currentTime: number;
  duration: number;
  lastWatched: number;
  vj: string;
}

export interface WatchlistItem {
  movieId: number;
  title: string;
  image: string;
  vid: string;
  playingurl: string;
  vj: string;
  ldur: string;
  addedAt: number;
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
  subscription: SubscriptionStatus;
  settings: UserSettings;
}

export interface SubscriptionStatus {
  active: boolean;
  plan: string;
  expiryDate: string | null;
  startDate: string | null;
}

export interface UserSettings {
  autoplay: boolean;
  quality: 'auto' | '360p' | '480p' | '720p' | '1080p';
  notifications: boolean;
}

// ─── API Types ───────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

export type SortOption = 'latest' | 'az' | 'popular';
