/* PStream App Shell — Main layout wrapper with navigation */

'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { fetchDashboard, fetchPreview, fetchWithCache, checkTokenStatus, fetchAdminConfig } from '@/lib/api';
import { getStoredFingerprint } from '@/lib/device-fingerprint';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import HeroBanner from './HeroBanner';
import CategoryRow from './CategoryRow';
import VideoPlayer from './VideoPlayer';
import MovieDetailPage from './MovieDetail';
import MovieCard from './MovieCard';
import BrowsePage from './BrowsePage';
import SearchPage from './SearchPage';
import SubscribePage from './SubscribePage';
import ProfilePage from './ProfilePage';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import TopTenList from './TopTenList';
import NewReleasesRow from './NewReleasesRow';
import BecauseYouWatched from './BecauseYouWatched';
import NotificationCenter from './NotificationCenter';
import HelpCenter from './HelpCenter';
import KidsPage from './KidsPage';
import DownloadsPage from './DownloadsPage';
import SettingsPage from './SettingsPage';
import AdminDashboard from './AdminDashboard';
import { SkeletonBanner, SkeletonRow } from './SkeletonCard';
import { List } from 'lucide-react';
import type { Movie, MovieDetail } from '@/lib/types';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

// How often to re-validate the token with the server (ms)
// 30 seconds balances security (fast revocation detection) with server load
const TOKEN_CHECK_INTERVAL = 30_000; // 30 seconds

export default function AppShell() {
  const { state, dispatch, navigate } = useAppStore();
  const [movieDetail, setMovieDetail] = useState<MovieDetail | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [sessionEndedReason, setSessionEndedReason] = useState<string | null>(null);
  const [isCheckingToken, setIsCheckingToken] = useState(false);
  const tokenCheckTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionEndedRef = useRef(false); // prevent duplicate logout dispatches

  // Use token session for auth — derive isAuthenticated from it
  const isAuthenticated = state.auth.isAuthenticated || state.tokenSession !== null;

  // ─── Token validation helper ──────────────────────────────
  const validateToken = useCallback(async (code: string) => {
    if (isCheckingToken) return;
    setIsCheckingToken(true);
    try {
      const fingerprint = await getStoredFingerprint();
      const result = await checkTokenStatus(code, fingerprint);
      if (result.valid) {
        // Refresh session data
        dispatch({
          type: 'SET_TOKEN_SESSION',
          payload: {
            code,
            tier: result.tier || state.tokenSession?.tier || 'stream',
            expiresAt: result.expiresAt || state.tokenSession?.expiresAt || '',
            maxDownloads: result.maxDownloads || state.tokenSession?.maxDownloads || 0,
          },
        });
        sessionEndedRef.current = false;
      } else {
        // Token is no longer valid — kick the user out
        if (!sessionEndedRef.current) {
          sessionEndedRef.current = true;
          const reason = result.reason === 'revoked'
            ? 'Your access code has been deactivated by the admin.'
            : result.reason === 'device_mismatch'
              ? 'This access code is locked to a different device.'
              : 'Your access code has expired. Get a new one to continue watching.';
          setSessionEndedReason(reason);
          dispatch({ type: 'SET_TOKEN_SESSION', payload: null });
          dispatch({ type: 'LOGOUT' });
          // Store reason so LoginPage can display it
          try { sessionStorage.setItem('pstream_session_ended_reason', reason); } catch { /* */ }
          // Clear the timer — no point checking anymore
          if (tokenCheckTimer.current) {
            clearInterval(tokenCheckTimer.current);
            tokenCheckTimer.current = null;
          }
        }
      }
    } catch {
      // Network error — don't kick the user out, just retry later
    } finally {
      setIsCheckingToken(false);
    }
  }, [dispatch, isCheckingToken, state.tokenSession]);

  // Validate token session on load and fetch admin config
  useEffect(() => {
    const validateAndLoad = async () => {
      // Validate token session if it exists
      if (state.tokenSession?.code && !state.auth.isAuthenticated) {
        await validateToken(state.tokenSession.code);
      }

      // Fetch admin config
      if (!state.adminConfig) {
        try {
          const config = await fetchAdminConfig();
          dispatch({ type: 'SET_ADMIN_CONFIG', payload: config });
        } catch {
          // Use defaults
        }
      }
    };
    validateAndLoad();
  }, []);

  // ─── Periodic token re-validation ──────────────────────────
  // Checks every 30s to catch revocation, expiry, device mismatch
  useEffect(() => {
    if (!state.tokenSession?.code || !isAuthenticated) return;

    // Start periodic check
    tokenCheckTimer.current = setInterval(() => {
      if (state.tokenSession?.code) {
        validateToken(state.tokenSession.code);
      }
    }, TOKEN_CHECK_INTERVAL);

    return () => {
      if (tokenCheckTimer.current) {
        clearInterval(tokenCheckTimer.current);
        tokenCheckTimer.current = null;
      }
    };
  }, [state.tokenSession?.code, isAuthenticated, validateToken]);

  // Fetch dashboard on mount
  useEffect(() => {
    const loadDashboard = async () => {
      dispatch({ type: 'SET_DASHBOARD_LOADING', payload: true });
      try {
        const data = await fetchWithCache('dashboard', fetchDashboard);
        dispatch({ type: 'SET_DASHBOARD', payload: data });
      } catch (err) {
        const message = err instanceof Error ? err.message : '';
        // If the error indicates token issues, trigger session end
        if (message.includes('401') || message.includes('403') || message.includes('expired') || message.includes('deactivated') || message.includes('token')) {
          if (!sessionEndedRef.current) {
            sessionEndedRef.current = true;
            const reason = 'Your session has ended. Please enter your access code again.';
            dispatch({ type: 'SET_TOKEN_SESSION', payload: null });
            dispatch({ type: 'LOGOUT' });
            try { sessionStorage.setItem('pstream_session_ended_reason', reason); } catch { /* */ }
          }
        }
        dispatch({ type: 'SET_DASHBOARD_LOADING', payload: false });
      }
    };
    loadDashboard();
  }, [dispatch]);

  // Fetch preview when a movie is selected for player
  useEffect(() => {
    if (!state.selectedMovie || state.currentView !== 'player') return;
    const vid = String(state.selectedMovie.vid || state.selectedMovie.id);

    // If movieDetail is already loaded with a valid playingUrl for this vid, skip re-fetch
    // (This prevents re-fetching when navigating from detail→player for episode playback)
    if (movieDetail?.playingUrl && String(movieDetail?.video_title || '').length > 0) {
      // Check if the current detail matches the selected movie
      const detailVid = String(movieDetail.id || '');
      if (detailVid === vid || state.selectedMovieDetail?.playingUrl === movieDetail.playingUrl) {
        return;
      }
    }

    const loadPreview = async () => {
      // Reset inside the async callback (not synchronously in effect body)
      setMovieDetail(null);
      setPreviewError(null);
      dispatch({ type: 'SET_PREVIEW_LOADING', payload: true });
      try {
        if (process.env.NODE_ENV !== 'production') console.log('[PStream] Fetching preview for vid:', vid);
        const detail = await fetchPreview(vid);
        const movieDetailData = detail as MovieDetail;
        if (process.env.NODE_ENV !== 'production') console.log('[PStream] Preview loaded, playingUrl:', movieDetailData?.playingUrl?.substring(0, 80));
        if (!movieDetailData?.playingUrl) {
          if (process.env.NODE_ENV !== 'production') console.warn('[PStream] No playingUrl in preview response for vid:', vid);
          setPreviewError('This video is not available for streaming yet.');
          dispatch({ type: 'SET_PREVIEW_LOADING', payload: false });
          return;
        }
        dispatch({ type: 'SET_MOVIE_DETAIL', payload: movieDetailData });
        setMovieDetail(movieDetailData);
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') console.error('[PStream] Preview fetch failed for vid:', vid, err);
        setPreviewError('Failed to load video. Please try again.');
        dispatch({ type: 'SET_PREVIEW_LOADING', payload: false });
        setMovieDetail(null);
      }
    };
    loadPreview();
  }, [state.selectedMovie, state.currentView, dispatch]);

  // Fetch preview when a movie is selected for detail view
  useEffect(() => {
    if (!state.selectedMovie || state.currentView !== 'detail') return;
    const vid = String(state.selectedMovie.vid || state.selectedMovie.id);

    const loadPreview = async () => {
      dispatch({ type: 'SET_PREVIEW_LOADING', payload: true });
      try {
        const detail = await fetchPreview(vid);
        const movieDetailData = detail as MovieDetail;
        dispatch({ type: 'SET_MOVIE_DETAIL', payload: movieDetailData });
        setMovieDetail(movieDetailData);
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') console.error('[PStream] Detail preview fetch failed for vid:', vid, err);
        dispatch({ type: 'SET_PREVIEW_LOADING', payload: false });
        setMovieDetail(null);
      }
    };
    loadPreview();
  }, [state.selectedMovie, state.currentView, dispatch]);

  // Collect all unique movies from dashboard
  const allDashboardMovies = useMemo<Movie[]>(() => {
    if (!state.dashboard?.dashboard) return [];
    const categories = Array.isArray(state.dashboard.dashboard) ? state.dashboard.dashboard : [];
    const map = new Map<number, Movie>();
    categories.forEach((cat) => {
      const movies = Array.isArray(cat.movies) ? cat.movies : [];
      movies.forEach((m) => {
        if (!map.has(m.id)) map.set(m.id, m);
      });
    });
    return Array.from(map.values());
  }, [state.dashboard]);

  // Get similar movies for detail page
  const similarMovies = useMemo<Movie[]>(() => {
    if (!state.selectedMovie || !state.dashboard?.dashboard) return [];
    const movie = state.selectedMovie;
    const categories = Array.isArray(state.dashboard.dashboard) ? state.dashboard.dashboard : [];
    const similar: Movie[] = [];

    // Find movies from same category
    const sameCategory = categories.find(
      (cat) => Array.isArray(cat.movies) && cat.movies.some((m) => m.id === movie.id)
    );
    if (sameCategory && Array.isArray(sameCategory.movies)) {
      similar.push(...sameCategory.movies.filter((m) => m.id !== movie.id));
    }

    // Fill from other categories
    for (const cat of categories) {
      const movies = Array.isArray(cat.movies) ? cat.movies : [];
      for (const m of movies) {
        if (m.id !== movie.id && !similar.some((s) => s.id === m.id) && similar.length < 15) {
          similar.push(m);
        }
      }
      if (similar.length >= 15) break;
    }

    return similar;
  }, [state.selectedMovie, state.dashboard]);

  // Get related movies for player view
  const playerRelatedMovies = useMemo<Movie[]>(() => {
    if (!state.selectedMovie || !state.dashboard?.dashboard) return [];
    const movie = state.selectedMovie;
    const categories = Array.isArray(state.dashboard.dashboard) ? state.dashboard.dashboard : [];
    const related: Movie[] = [];

    const movieCategory = categories.find(
      (cat) => Array.isArray(cat.movies) && cat.movies.some((m) => m.id === movie.id)
    );
    if (movieCategory && Array.isArray(movieCategory.movies)) {
      related.push(...movieCategory.movies.filter((m) => m.id !== movie.id));
    }
    for (const cat of categories) {
      const movies = Array.isArray(cat.movies) ? cat.movies : [];
      for (const m of movies) {
        if (m.id !== movie.id && !related.some((rm) => rm.id === m.id) && related.length < 15) {
          related.push(m);
        }
      }
      if (related.length >= 15) break;
    }
    return related;
  }, [state.selectedMovie, state.dashboard]);

  // Render player view
  const renderPlayer = () => {
    const movie = state.selectedMovie;
    if (!movie) return null;

    // Route video through our proxy to bypass CDN hotlink / referer restrictions
    const rawUrl = movieDetail?.playingUrl || movie.playingurl || '';
    const videoSrc = rawUrl ? `/api/stream/video?url=${encodeURIComponent(rawUrl)}&token=${encodeURIComponent(state.tokenSession?.code || '')}` : '';
    const posterUrl = movieDetail?.thumbnail
      ? (movieDetail.thumbnail.startsWith('http') ? movieDetail.thumbnail : `https://munoapp.org/munowatch-api/laba/yo/naki/${movieDetail.thumbnail}.jpg`)
      : (movie.image.startsWith('http') ? movie.image : `https://munoapp.org/munowatch-api/laba/yo/naki/${movie.image}.jpg`);

    // Show error state with retry
    if (previewError) {
      return (
        <div className="pt-16 px-4 md:px-12 pb-24 md:pb-8">
          <div className="aspect-video bg-black rounded-xl flex items-center justify-center">
            <div className="text-center">
              <p className="text-white/70 text-sm mb-3">{previewError}</p>
              <button
                onClick={() => {
                  setPreviewError(null);
                  setMovieDetail(null);
                  // Re-trigger the preview fetch by dispatching select movie again
                  dispatch({ type: 'SELECT_MOVIE', payload: movie });
                }}
                className="bg-[#E50914] hover:bg-[#ff1a25] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Only render player when we have a valid video URL
    if (!videoSrc) {
      return (
        <div className="pt-16 px-4 md:px-12 pb-24 md:pb-8">
          <div className="aspect-video bg-black rounded-xl flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin w-10 h-10 border-2 border-[#E50914] border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-white/60 text-sm">Loading stream...</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="pt-16 px-4 md:px-12 pb-24 md:pb-8">
        <VideoPlayer
          key={`${movie.id}-${videoSrc}`}
          src={videoSrc}
          title={movieDetail?.video_title || movie.title}
          poster={posterUrl}
          onBack={() => {
            setMovieDetail(null);
            setPreviewError(null);
            dispatch({ type: 'GO_BACK' });
          }}
          movieId={movie.id}
        />
        {state.isPreviewLoading ? (
          <div className="mt-4 animate-pulse space-y-3">
            <div className="h-6 bg-[#1A1A1A] rounded w-2/3" />
            <div className="h-4 bg-[#1A1A1A] rounded w-full" />
            <div className="h-4 bg-[#1A1A1A] rounded w-3/4" />
          </div>
        ) : movieDetail ? (
          <div className="mt-4 px-4 md:px-0">
            {/* Minimal info below player */}
            <h2 className="text-white text-xl md:text-2xl font-bold mb-2">{movieDetail.video_title}</h2>
            <p className="text-white/70 text-sm leading-relaxed mb-4 max-w-3xl">
              {movieDetail.description || 'No description available for this title.'}
            </p>

            {/* Series badge — link to detail page to see all episodes */}
            {movieDetail.episodes && movieDetail.episodes > 0 && (
              <button
                onClick={() => {
                  setMovieDetail(null);
                  setPreviewError(null);
                  navigate('detail');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors mb-4"
              >
                <List className="w-4 h-4 text-[#E50914]" />
                <span>{movieDetail.episodes} Episodes Available</span>
                <span className="text-white/40 text-xs ml-1">View All</span>
              </button>
            )}

            {/* Related movies */}
            {playerRelatedMovies.length > 0 && (
              <div className="mb-8">
                <h3 className="text-white text-lg font-semibold mb-3">You May Also Like</h3>
                <div
                  className="flex gap-3 overflow-x-auto pb-2"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {playerRelatedMovies.slice(0, 15).map((m, i) => (
                    <MovieCard key={`rel-${m.id}-${i}`} movie={m} index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 px-0 md:px-0">
            <h2 className="text-white text-xl font-bold mb-2">{movie.title}</h2>
            <p className="text-white/70 text-sm mb-4">Enjoy watching this title on PStream.</p>
          </div>
        )}
      </div>
    );
  };

  // Render detail view
  const renderDetail = () => {
    const movie = state.selectedMovie;
    if (!movie) return null;

    return (
      <div className="pt-14">
        {state.isPreviewLoading ? (
          <div className="animate-pulse space-y-4 px-4 md:px-12 pt-4">
            <div className="w-full h-[50vh] bg-[#1A1A1A] rounded-lg" />
            <div className="h-8 bg-[#1A1A1A] rounded w-2/3" />
            <div className="h-4 bg-[#1A1A1A] rounded w-full" />
            <div className="h-4 bg-[#1A1A1A] rounded w-3/4" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-[#1A1A1A] rounded-lg" />
              ))}
            </div>
          </div>
        ) : (
          <MovieDetailPage
            movie={movie}
            detail={movieDetail}
            similarMovies={similarMovies}
          />
        )}
      </div>
    );
  };

  // Render home view
  const renderHome = () => {
    if (state.isDashboardLoading || !state.dashboard) {
      return (
        <div className="pb-8">
          <SkeletonBanner />
          <div className="space-y-8 mt-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-4 md:px-12">
                <div className="h-5 w-40 bg-[#1A1A1A] rounded animate-pulse mb-3" />
                <SkeletonRow count={6} />
              </div>
            ))}
          </div>
        </div>
      );
    }

    const { dashboard, banner } = state.dashboard;
    const dashboardArray = Array.isArray(dashboard) ? dashboard : [];
    const banners = banner ? [banner] : [];

    // Continue watching row
    const continueWatching = state.watchProgress
      .filter((wp) => wp.currentTime > 10)
      .slice(0, 10);

    // My list row
    const myList = state.watchlist.slice(0, 10);

    // Get all movies for Top 10 and New Releases
    const firstCategoryMovies = dashboardArray.length > 0 && Array.isArray(dashboardArray[0].movies)
      ? dashboardArray[0].movies
      : allDashboardMovies;

    return (
      <div className="pb-8">
        <HeroBanner banners={banners} categories={dashboardArray} />

        {/* Continue Watching */}
        {continueWatching.length > 0 && (
          <div className="px-4 md:px-12 mt-2">
            <CategoryRow
              title="Continue Watching"
              movies={continueWatching.map((wp) => ({
                id: wp.movieId,
                subscriber: '',
                paid: '',
                title: wp.title,
                image: wp.image,
                vj: wp.vj,
                vid: wp.vid,
                ldur: '',
                state: '',
                category_id: 0,
                playingurl: wp.playingurl,
              }))}
              watchProgress={continueWatching}
            />
          </div>
        )}

        {/* My List */}
        {myList.length > 0 && (
          <div className="px-4 md:px-12 mt-2">
            <CategoryRow
              title="My List"
              movies={myList.map((item) => ({
                id: item.movieId,
                subscriber: '',
                paid: '',
                title: item.title,
                image: item.image,
                vj: item.vj,
                vid: item.vid,
                ldur: item.ldur,
                state: '',
                category_id: 0,
                playingurl: item.playingurl,
              }))}
            />
          </div>
        )}

        {/* Top 10 List */}
        <TopTenList movies={firstCategoryMovies} />

        {/* Because You Watched */}
        <BecauseYouWatched
          watchProgress={state.watchProgress}
          categories={dashboardArray}
        />

        {/* New Releases */}
        <NewReleasesRow movies={allDashboardMovies} />

        {/* Category rows with See All links */}
        {dashboardArray.map((cat, i) => (
          <CategoryRow
            key={cat.category}
            title={i === 0 ? `🔥 Trending Now` : cat.category}
            movies={Array.isArray(cat.movies) ? cat.movies : []}
            watchProgress={state.watchProgress}
            index={i}
            showSeeAll
            categoryFilter={cat.category}
          />
        ))}
      </div>
    );
  };

  // Auth pages don't need navbar/bottom nav (admin has its own layout via PIN gate)
  const isAuthPage = state.currentView === 'login' || state.currentView === 'register';
  const isAdminPage = state.currentView === 'admin';

  // Auth guard: redirect to login if no token session and not on auth/admin page
  useEffect(() => {
    if (!isAuthenticated && !isAuthPage && !isAdminPage && state.hydrated) {
      navigate('login');
    }
  }, [isAuthenticated, isAuthPage, isAdminPage, state.hydrated]);

  // NOTE: Auth redirect is also handled by the HYDRATE action in the store.
  // This useEffect provides additional runtime guarding.

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {!isAuthPage && !isAdminPage && <Navbar />}

      <AnimatePresence mode="wait">
        <motion.main
          key={state.currentView}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
          className="min-h-screen"
        >
          {/* Auth pages */}
          {state.currentView === 'login' && <LoginPage />}
          {state.currentView === 'register' && <RegisterPage />}

          {/* App pages — require auth (guard all with isAuthenticated) */}
          {isAuthenticated && state.currentView === 'home' && renderHome()}
          {isAuthenticated && state.currentView === 'browse' && <BrowsePage />}
          {isAuthenticated && state.currentView === 'search' && <SearchPage />}
          {isAuthenticated && state.currentView === 'player' && renderPlayer()}
          {isAuthenticated && state.currentView === 'detail' && renderDetail()}
          {isAuthenticated && state.currentView === 'subscribe' && <SubscribePage />}
          {isAuthenticated && state.currentView === 'profile' && <ProfilePage />}
          {isAuthenticated && state.currentView === 'notifications' && <NotificationCenter />}
          {isAuthenticated && state.currentView === 'help' && <HelpCenter />}
          {isAuthenticated && state.currentView === 'kids' && <KidsPage />}
          {isAuthenticated && state.currentView === 'downloads' && <DownloadsPage />}
          {isAuthenticated && state.currentView === 'settings' && <SettingsPage />}
          {/* Admin has its own PIN gate — no student auth required */}
          {state.currentView === 'admin' && <AdminDashboard />}

          {/* Fallback loading state while redirecting (not for admin — it has its own PIN gate) */}
          {!isAuthenticated && !isAuthPage && !isAdminPage && (
            <div className="flex items-center justify-center min-h-screen">
              <div className="animate-spin w-8 h-8 border-2 border-[#E50914] border-t-transparent rounded-full" />
            </div>
          )}
        </motion.main>
      </AnimatePresence>

      {!isAuthPage && !isAdminPage && <BottomNav />}
    </div>
  );
}
