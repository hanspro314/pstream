/* PStream Because You Watched — Personalized recommendations based on watch history */

'use client';

import React, { useRef, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MovieCard from './MovieCard';
import type { Movie, WatchProgress, DashboardCategory } from '@/lib/types';

interface BecauseYouWatchedProps {
  watchProgress: WatchProgress[];
  categories: DashboardCategory[];
}

export default function BecauseYouWatched({ watchProgress, categories }: BecauseYouWatchedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Find the most recently watched movie
  const recentMovie = useMemo(() => {
    if (watchProgress.length === 0) return null;
    const sorted = [...watchProgress].sort((a, b) => b.lastWatched - a.lastWatched);
    return sorted[0];
  }, [watchProgress]);

  // Find the category of the recently watched movie
  const recentCategory = useMemo(() => {
    if (!recentMovie) return null;
    return categories.find((cat) =>
      Array.isArray(cat.movies) && cat.movies.some((m) => m.id === recentMovie.movieId)
    );
  }, [recentMovie, categories]);

  // Get similar movies from the same category
  const similarMovies = useMemo(() => {
    const cat = recentCategory || (categories.length > 0 ? categories[0] : null);
    if (!cat || !Array.isArray(cat.movies)) return [];
    const movieList = cat.movies.filter((m) => m.id !== recentMovie?.movieId);
    return movieList.slice(0, 15);
  }, [recentCategory, categories, recentMovie]);

  const headerTitle = recentMovie
    ? `Because you watched ${recentMovie.title}`
    : `Because you watched ${categories[0]?.category || 'something'}`;

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
    setTimeout(checkScroll, 300);
  };

  if (similarMovies.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="relative group/row mb-6 md:mb-8 mt-2"
    >
      {/* Title */}
      <div className="flex items-center justify-between px-4 md:px-12 mb-3">
        <h2 className="text-white text-base md:text-lg font-semibold truncate mr-4">{headerTitle}</h2>
        <div className="flex gap-1 flex-shrink-0">
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all opacity-0 group-hover/row:opacity-100"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all opacity-0 group-hover/row:opacity-100"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable row */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-3 overflow-x-auto px-4 md:px-12 scrollbar-hide scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {similarMovies.map((movie, i) => (
          <MovieCard key={`byw-${movie.id}-${i}`} movie={movie} index={i} />
        ))}
      </div>
    </motion.div>
  );
}
