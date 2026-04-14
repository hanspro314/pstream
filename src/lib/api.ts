/* PStream API Helper Functions */

import type { DashboardResponse, MovieDetail, SearchResult, User, AdminConfig, TokenInfo, TokenRedeemResult, TokenStatusResult, AdminStats } from './types';

const API_BASE = '/api/stream';
const AUTH_BASE = '/api/auth';

interface ApiResponseWrapper<T> {
  success: boolean;
  data: T;
  error?: string;
}

/** Get the stored token code from localStorage (client-only) */
function getStoredTokenCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('pstream_token_session');
    if (stored) {
      const session = JSON.parse(stored);
      return session?.code || null;
    }
  } catch { /* */ }
  return null;
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

/** Fetch dashboard data (categories, movies, banner) — requires valid token */
export async function fetchDashboard(): Promise<DashboardResponse> {
  const token = getStoredTokenCode();
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
  return fetchApi<DashboardResponse>(`${API_BASE}/dashboard${tokenParam}`);
}

/** Fetch movie preview/detail by video ID — requires valid token */
export async function fetchPreview(vid: string): Promise<MovieDetail> {
  const token = getStoredTokenCode();
  const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
  return fetchApi<MovieDetail>(`${API_BASE}/preview?vid=${encodeURIComponent(vid)}${tokenParam}`);
}

/** Search movies by query — requires valid token */
export async function fetchSearch(query: string): Promise<SearchResult[]> {
  const token = getStoredTokenCode();
  const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
  return fetchApi<SearchResult[]>(`${API_BASE}/search?q=${encodeURIComponent(query)}${tokenParam}`);
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

// ─── Token API Functions ──────────────────────────────────────────

export interface RedeemParams {
  code: string;
  fingerprint: string;
  deviceInfo: object;
}

export async function redeemToken(params: RedeemParams): Promise<TokenRedeemResult> {
  return fetchApi<TokenRedeemResult>('/api/token/redeem', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function checkTokenStatus(code: string, fingerprint: string): Promise<TokenStatusResult> {
  return fetchApi<TokenStatusResult>(`/api/token/status?code=${encodeURIComponent(code)}&fingerprint=${encodeURIComponent(fingerprint)}`);
}

export async function fetchAdminConfig(): Promise<AdminConfig> {
  return fetchApi<AdminConfig>('/api/admin/config');
}

export async function updateAdminConfig(config: Partial<AdminConfig>): Promise<AdminConfig> {
  return fetchApi<AdminConfig>('/api/admin/config', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

export async function generateTokens(count: number, tier: 'stream' | 'download' | 'trial', note?: string): Promise<TokenInfo[]> {
  const res = await fetchApi<{ codes: TokenInfo[] }>('/api/admin/tokens', {
    method: 'POST',
    body: JSON.stringify({ count, tier, note }),
  });
  return res.codes;
}

export async function fetchAdminTokens(status?: string, page?: number, limit?: number): Promise<{ tokens: TokenInfo[]; total: number; page: number }> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  return fetchApi(`/api/admin/tokens?${params.toString()}`);
}

export async function manageToken(id: string, action: 'revoke' | 'expire' | 'reactivate', reason?: string, refundAmount?: number): Promise<TokenInfo> {
  return fetchApi<TokenInfo>(`/api/admin/tokens/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action, reason, refundAmount }),
  });
}

export async function fetchAdminStats(): Promise<AdminStats> {
  return fetchApi<AdminStats>('/api/admin/stats');
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
