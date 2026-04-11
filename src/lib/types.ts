/* PStream Type Definitions */

// ─── View / Navigation ───────────────────────────────────────────
export type AppView = 'home' | 'browse' | 'search' | 'player' | 'subscribe' | 'profile'
  | 'login' | 'register' | 'detail' | 'notifications' | 'help' | 'kids' | 'downloads' | 'settings';

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
  vid: string;
  title: string;
  thumbnail: string;
  duration: string;
  episode: number;
  season?: number;
  playingUrl?: string;
  episode_name?: string;
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
  pushNotifications: boolean;
  emailNotifications: boolean;
  newContentAlerts: boolean;
  wifiOnly: boolean;
  autoDeleteDownloads: boolean;
  downloadQuality: 'standard' | 'high';
  parentalPin: string;
  maturityRating: 'all' | '7+' | '13+' | '16+' | '18+';
  language: 'en' | 'lg';
  streamingQualityMobile: 'low' | 'medium' | 'high' | 'auto';
  subtitleSize: 'small' | 'medium' | 'large';
}

// ─── API Types ───────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

export type SortOption = 'latest' | 'az' | 'popular';

// ─── Auth Types ──────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  phone: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isAuthenticated: boolean;
}

export interface OTPVerification {
  phone: string;
  otpCode: string;
  expiresAt: number;
  verified: boolean;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  isSubscribed: boolean;
  isVerified: boolean;
  freeTrialActive: boolean;
  freeTrialExpiry: number;
  subscriptionExpiry: number;
  plan: 'free' | 'weekly' | 'monthly' | 'annual' | 'family';
  createdAt: number;
  lastLogin: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  otpSent: boolean;
  otpVerified: boolean;
  otpExpiry: number;
  error: string | null;
}

// ─── Notification Types ──────────────────────────────────────────
export interface Notification {
  id: string;
  type: 'new_content' | 'subscription' | 'system' | 'promo';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  icon?: string;
  actionUrl?: string;
}

// ─── Review/Rating Types ─────────────────────────────────────────
export interface UserReview {
  movieId: number;
  rating: number; // 1-5
  reviewText: string;
  author: string;
  timestamp: number;
}

// ─── Download Types ──────────────────────────────────────────────
export interface DownloadItem {
  movieId: number;
  title: string;
  image: string;
  vid: string;
  size: string;
  downloadedAt: number;
  progress: number; // 0-100
  status: 'downloading' | 'completed' | 'expired' | 'paused';
}

// ─── Kids Profile ────────────────────────────────────────────────
export interface KidsProfile {
  name: string;
  age: number;
  maxAgeRating: number; // e.g. 7, 13, 16
  pin: string;
}

// ─── Promo Code ──────────────────────────────────────────────────
export interface PromoCode {
  code: string;
  discount: number; // percentage
  duration: 'week' | 'month' | 'year';
  used: boolean;
}

// ─── Payment History ─────────────────────────────────────────────
export interface PaymentRecord {
  id: string;
  amount: number;
  method: 'mtn_momo' | 'airtel_money';
  status: 'success' | 'pending' | 'failed';
  date: string;
  plan: string;
  reference: string;
}

// ─── Device Info ─────────────────────────────────────────────────
export interface DeviceInfo {
  id: string;
  name: string;
  type: 'mobile' | 'desktop' | 'tablet' | 'tv';
  lastActive: string;
  current: boolean;
}

// ─── Plan Types ──────────────────────────────────────────────────
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration: 'week' | 'month' | 'year';
  features: string[];
  popular?: boolean;
  screens: number;
  quality: string;
}

// ─── Help/FAQ ────────────────────────────────────────────────────
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

// ─── Content Rating ──────────────────────────────────────────────
export interface ContentRating {
  label: string;
  description: string;
}
