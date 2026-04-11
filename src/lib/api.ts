/* PStream API Helper Functions */

import type { DashboardResponse, MovieDetail, SearchResult } from './types';

const API_BASE = '/api/stream';

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
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
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
