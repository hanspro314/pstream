/* PStream App Shell — Main layout wrapper with navigation */

'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { fetchDashboard, fetchPreview, fetchWithCache } from '@/lib/api';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import HeroBanner from './HeroBanner';
import CategoryRow from './CategoryRow';
import VideoPlayer from './VideoPlayer';
import MovieDetailPanel from './MovieDetail';
import BrowsePage from './BrowsePage';
import SearchPage from './SearchPage';
import SubscribePage from './SubscribePage';
import ProfilePage from './ProfilePage';
import { SkeletonBanner, SkeletonRow } from './SkeletonCard';
import type { Movie, MovieDetail } from '@/lib/types';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function AppShell() {
  const { state, dispatch } = useAppStore();
  const [movieDetail, setMovieDetail] = useState<MovieDetail | null>(null);

  // Fetch dashboard on mount
  useEffect(() => {
    const loadDashboard = async () => {
      dispatch({ type: 'SET_DASHBOARD_LOADING', payload: true });
      try {
        const data = await fetchWithCache('dashboard', fetchDashboard);
        dispatch({ type: 'SET_DASHBOARD', payload: data });
      } catch {
        dispatch({ type: 'SET_DASHBOARD_LOADING', payload: false });
      }
    };
    loadDashboard();
  }, [dispatch]);

  // Fetch preview when a movie is selected for player
  useEffect(() => {
    if (!state.selectedMovie || state.currentView !== 'player') return;
    const vid = state.selectedMovie.vid || String(state.selectedMovie.id);

    const loadPreview = async () => {
      dispatch({ type: 'SET_PREVIEW_LOADING', payload: true });
      try {
        const detail = await fetchPreview(vid);
        const movieDetail = detail as MovieDetail;
        dispatch({ type: 'SET_MOVIE_DETAIL', payload: movieDetail });
        setMovieDetail(movieDetail);
      } catch {
        dispatch({ type: 'SET_PREVIEW_LOADING', payload: false });
        setMovieDetail(null);
      }
    };
    loadPreview();
  }, [state.selectedMovie, state.currentView, dispatch]);

  // Render player view
  const renderPlayer = () => {
    const movie = state.selectedMovie;
    if (!movie) return null;

    const videoSrc = movieDetail?.playingUrl || movie.playingurl || '';
    const posterUrl = movieDetail?.thumbnail
      ? (movieDetail.thumbnail.startsWith('http') ? movieDetail.thumbnail : `https://munoapp.org/munowatch-api/laba/yo/naki/${movieDetail.thumbnail}.jpg`)
      : (movie.image.startsWith('http') ? movie.image : `https://munoapp.org/munowatch-api/laba/yo/naki/${movie.image}.jpg`);

    // Find related movies from dashboard
    const relatedMovies: Movie[] = [];
    if (state.dashboard?.dashboard) {
      const categories = Array.isArray(state.dashboard.dashboard) ? state.dashboard.dashboard : [];
      const movieCategory = categories.find(
        (cat) => Array.isArray(cat.movies) && cat.movies.some((m) => m.id === movie.id)
      );
      if (movieCategory && Array.isArray(movieCategory.movies)) {
        relatedMovies.push(...movieCategory.movies.filter((m) => m.id !== movie.id));
      }
      // Add some from other categories too
      for (const cat of categories) {
        const movies = Array.isArray(cat.movies) ? cat.movies : [];
        for (const m of movies) {
          if (m.id !== movie.id && !relatedMovies.some((rm) => rm.id === m.id) && relatedMovies.length < 15) {
            relatedMovies.push(m);
          }
        }
        if (relatedMovies.length >= 15) break;
      }
    }

    return (
      <div className="pt-16 px-4 md:px-12 pb-24 md:pb-8">
        <VideoPlayer
          src={videoSrc}
          title={movie.title}
          poster={posterUrl}
          onBack={() => {
            setMovieDetail(null);
            dispatch({ type: 'GO_BACK' });
          }}
        />
        {state.isPreviewLoading ? (
          <div className="mt-4 animate-pulse space-y-3">
            <div className="h-6 bg-[#1A1A1A] rounded w-2/3" />
            <div className="h-4 bg-[#1A1A1A] rounded w-full" />
            <div className="h-4 bg-[#1A1A1A] rounded w-3/4" />
          </div>
        ) : movieDetail ? (
          <MovieDetailPanel detail={movieDetail} relatedMovies={relatedMovies} />
        ) : (
          <div className="mt-6 px-0 md:px-0">
            <h2 className="text-white text-xl font-bold mb-2">{movie.title}</h2>
            <p className="text-white/70 text-sm mb-4">Enjoy watching this title on PStream.</p>
          </div>
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

        {/* Category rows */}
        {dashboardArray.map((cat, i) => (
          <div key={cat.category} className="mt-2">
            <CategoryRow
              title={i === 0 ? `🔥 Trending Now` : cat.category}
              movies={Array.isArray(cat.movies) ? cat.movies : []}
              watchProgress={state.watchProgress}
              index={i}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Navbar />

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
          {state.currentView === 'home' && renderHome()}
          {state.currentView === 'browse' && <BrowsePage />}
          {state.currentView === 'search' && <SearchPage />}
          {state.currentView === 'player' && renderPlayer()}
          {state.currentView === 'subscribe' && <SubscribePage />}
          {state.currentView === 'profile' && <ProfilePage />}
        </motion.main>
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
