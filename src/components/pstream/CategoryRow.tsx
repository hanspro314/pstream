/* PStream Category Row — Horizontal scrollable movie row */

'use client';

import React, { useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ChevronRightIcon } from 'lucide-react';
import MovieCard from './MovieCard';
import { useAppStore } from '@/lib/store';
import type { Movie, WatchProgress } from '@/lib/types';

interface CategoryRowProps {
  title: string;
  movies: Movie[];
  watchProgress?: WatchProgress[];
  index?: number;
  showSeeAll?: boolean;
  categoryFilter?: string;
}

export default function CategoryRow({ title, movies, watchProgress, index = 0, showSeeAll = false, categoryFilter }: CategoryRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const { dispatch, navigate } = useAppStore();

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
    setTimeout(checkScroll, 300);
  };

  const handleSeeAll = () => {
    if (categoryFilter) {
      dispatch({ type: 'SET_BROWSE_GENRE_FILTER', payload: categoryFilter });
      dispatch({ type: 'SET_BROWSE_CATEGORY', payload: categoryFilter });
    }
    navigate('browse');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!movies || movies.length === 0) return null;

  return (
    <div className="relative group/row mb-6 md:mb-8" style={{ animationDelay: `${index * 100}ms` }}>
      {/* Title with optional See All */}
      <div className="flex items-center justify-between px-4 md:px-12 mb-3">
        <h2 className="text-white text-base md:text-lg font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
          {showSeeAll && (
            <button
              onClick={handleSeeAll}
              className="flex items-center gap-1 text-white/60 hover:text-[#E50914] text-sm font-medium transition-colors"
            >
              See All
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          )}
          <div className="flex gap-1">
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
      </div>

      {/* Scrollable row */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-3 overflow-x-auto px-4 md:px-12 scrollbar-hide scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {movies.map((movie, i) => {
          const progressEntry = watchProgress?.find((wp) => wp.movieId === movie.id);
          return (
            <MovieCard
              key={`${movie.id}-${i}`}
              movie={movie}
              index={i}
              showProgress={!!progressEntry}
              progress={progressEntry?.currentTime && progressEntry?.duration ? progressEntry.currentTime / progressEntry.duration : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
