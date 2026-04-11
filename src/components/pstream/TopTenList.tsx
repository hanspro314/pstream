/* PStream Top 10 List — Netflix-style numbered movie ranking */

'use client';

import React, { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { Movie } from '@/lib/types';

interface TopTenListProps {
  movies: Movie[];
}

function getImageUrl(image: string): string {
  if (!image) return '';
  if (image.startsWith('http')) return image;
  return `https://munoapp.org/munowatch-api/laba/yo/naki/${image}.jpg`;
}

export default function TopTenList({ movies }: TopTenListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  if (!movies || movies.length === 0) return null;

  const topMovies = movies.slice(0, 10);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.6;
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
      transition={{ delay: 0.2 }}
      className="relative group/row mb-6 md:mb-8 mt-2"
    >
      {/* Title */}
      <div className="flex items-center justify-between px-4 md:px-12 mb-3">
        <h2 className="text-white text-base md:text-lg font-semibold flex items-center gap-2">
          <span className="text-[#E50914] font-black text-xl md:text-2xl">10</span>
          Top 10 in Uganda Today
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
        className="flex gap-2 sm:gap-3 overflow-x-auto px-4 md:px-12 pb-4 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {topMovies.map((movie, i) => (
          <TopTenItem key={`top10-${movie.id}-${i}`} movie={movie} rank={i + 1} index={i} />
        ))}
      </div>
    </motion.div>
  );
}

function TopTenItem({ movie, rank, index }: { movie: Movie; rank: number; index: number }) {
  const { dispatch, navigate } = useAppStore();
  const [imgError, setImgError] = useState(false);
  const imageUrl = getImageUrl(movie.image);

  const handleClick = () => {
    dispatch({ type: 'SELECT_MOVIE', payload: movie });
    navigate('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'SELECT_MOVIE', payload: movie });
    navigate('player');
  };

  // First item is larger
  const isFirst = rank === 1;
  const cardWidth = isFirst ? 'w-[200px] sm:w-[240px] md:w-[280px]' : 'w-[140px] sm:w-[160px] md:w-[180px]';

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`flex-shrink-0 relative cursor-pointer group/item ${cardWidth}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
      aria-label={`View details for ${movie.title}, ranked #${rank}`}
    >
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[#1A1A1A]">
        {/* Thumbnail */}
        {!imgError && imageUrl ? (
          <img
            src={imageUrl}
            alt={movie.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover/item:scale-105"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1A1A1A] to-[#252525] flex items-center justify-center">
            <Play className="w-8 h-8 text-white/20" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Rank number — large, overlapping from the left */}
        <div className="absolute -bottom-1 -left-1 sm:-left-2 z-10 select-none">
          <span
            className={`font-black leading-none text-[#E50914] ${
              isFirst ? 'text-[80px] sm:text-[100px] md:text-[130px]' : 'text-[50px] sm:text-[60px] md:text-[75px]'
            }`}
            style={{
              textShadow: '2px 2px 0 rgba(0,0,0,0.8), -1px -1px 0 rgba(0,0,0,0.8)',
              WebkitTextStroke: '2px #000',
            }}
          >
            {rank}
          </span>
        </div>

        {/* Play button on hover */}
        <div className="absolute top-2 right-2 opacity-0 group-hover/item:opacity-100 transition-opacity z-10">
          <button
            onClick={handlePlay}
            className="w-8 h-8 rounded-full bg-[#E50914]/90 hover:bg-[#E50914] flex items-center justify-center transition-colors"
            aria-label="Play"
          >
            <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
          </button>
        </div>

        {/* Title at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-2 z-10">
          <p className="text-white text-xs sm:text-sm font-bold line-clamp-1 drop-shadow-lg pl-4 sm:pl-6 md:pl-8">
            {movie.title}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
