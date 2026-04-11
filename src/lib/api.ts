/* PStream API Helper Functions */

import type { DashboardResponse, MovieDetail, SearchResult, User } from './types';

const API_BASE = '/api/stream';
const AUTH_BASE = '/api/auth';

interface ApiResponseWrapper<T> {
  success: boolean;
  data: T;
  error?: string;
}

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API Error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();

  // Unwrap the { success, data } wrapper from our API proxy routes
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
    return (json as ApiResponseWrapper<T>).data;
  }

  return json as T;
}

/** Fetch dashboard data (categories, movies, banner) */
export async function fetchDashboard(): Promise<DashboardResponse> {
  return fetchApi<DashboardResponse>(`${API_BASE}/dashboard`);
}

/** Fetch movie preview/detail by video ID */
export async function fetchPreview(vid: string): Promise<MovieDetail> {
  return fetchApi<MovieDetail>(`${API_BASE}/preview?vid=${encodeURIComponent(vid)}`);
}

/** Search movies by query */
export async function fetchSearch(query: string): Promise<SearchResult[]> {
  return fetchApi<SearchResult[]>(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
}

// ─── Auth API Functions ──────────────────────────────────────────

export interface RegisterParams {
  phone: string;
  name: string;
  email?: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  userId: string;
  otpExpiry: number;
}

export async function registerUser(params: RegisterParams): Promise<RegisterResponse> {
  return fetchApi<RegisterResponse>(`${AUTH_BASE}/register`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export interface LoginParams {
  phone?: string;
  email?: string;
  password?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  message: string;
}

export async function loginUser(params: LoginParams): Promise<LoginResponse> {
  return fetchApi<LoginResponse>(`${AUTH_BASE}/login`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export interface SendOtpParams {
  phone: string;
  purpose?: 'register' | 'login' | 'reset';
}

export interface SendOtpResponse {
  message: string;
  otpExpiry: number;
  otp?: string; // only in dev/mock mode
}

export async function sendOtp(params: SendOtpParams): Promise<SendOtpResponse> {
  return fetchApi<SendOtpResponse>(`${AUTH_BASE}/register`, {
    method: 'POST',
    body: JSON.stringify({
      ...params,
      otpOnly: true,
    }),
  });
}

export interface VerifyOtpParams {
  phone: string;
  otp: string;
}

export interface VerifyOtpResponse {
  user: User;
  token: string;
  message: string;
}

export async function verifyOtp(params: VerifyOtpParams): Promise<VerifyOtpResponse> {
  return fetchApi<VerifyOtpResponse>(`${AUTH_BASE}/verify-otp`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export interface SessionResponse {
  user: User;
  valid: boolean;
}

export async function checkSession(token: string): Promise<SessionResponse> {
  return fetchApi<SessionResponse>(`${AUTH_BASE}/session`, {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

/** Simple in-memory cache */
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchWithCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}
