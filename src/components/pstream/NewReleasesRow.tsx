/* PStream New Releases Row — Recently added movies with NEW badge */

'use client';

import React, { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MovieCard from './MovieCard';
import type { Movie } from '@/lib/types';

interface NewReleasesRowProps {
  movies: Movie[];
}

export default function NewReleasesRow({ movies }: NewReleasesRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Sort by ID descending (higher ID = newer)
  const sortedMovies = React.useMemo(
    () => [...movies].sort((a, b) => b.id - a.id).slice(0, 20),
    [movies]
  );

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  if (sortedMovies.length === 0) return null;

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="relative group/row mb-6 md:mb-8 mt-2"
    >
      {/* Title */}
      <div className="flex items-center justify-between px-4 md:px-12 mb-3">
        <h2 className="text-white text-base md:text-lg font-semibold flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 bg-[#E50914] rounded text-[10px] font-bold text-white uppercase tracking-wider">
            New
          </span>
          New Releases
        </h2>
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

      {/* Scrollable row */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-3 overflow-x-auto px-4 md:px-12 scrollbar-hide scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {sortedMovies.map((movie, i) => (
          <NewReleaseCard key={`new-${movie.id}-${i}`} movie={movie} index={i} />
        ))}
      </div>
    </motion.div>
  );
}

function NewReleaseCard({ movie, index }: { movie: Movie; index: number }) {
  return (
    <div className="relative">
      {/* NEW badge overlay */}
      <div className="absolute top-2 left-2 z-20">
        <span className="bg-[#E50914] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg uppercase tracking-wider">
          New
        </span>
      </div>
      <MovieCard movie={movie} index={index} />
    </div>
  );
}
