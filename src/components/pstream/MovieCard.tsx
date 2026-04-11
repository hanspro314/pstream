/* PStream Movie Card — Individual movie thumbnail card */

'use client';

import React, { useState } from 'react';
import { Play, Plus, Check, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import type { Movie } from '@/lib/types';

interface MovieCardProps {
  movie: Movie;
  index?: number;
  showProgress?: boolean;
  progress?: number;
}

function getImageUrl(image: string): string {
  if (!image) return '';
  if (image.startsWith('http')) return image;
  return `https://munoapp.org/munowatch-api/laba/yo/naki/${image}.jpg`;
}

export default function MovieCard({ movie, index = 0, showProgress, progress }: MovieCardProps) {
  const { navigate, dispatch, isInWatchlist } = useAppStore();
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const inWatchlist = isInWatchlist(movie.id);

  const imageUrl = getImageUrl(movie.image);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'SELECT_MOVIE', payload: movie });
    navigate('player');
  };

  const handleListToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inWatchlist) {
      dispatch({ type: 'REMOVE_FROM_WATCHLIST', payload: movie.id });
    } else {
      dispatch({
        type: 'ADD_TO_WATCHLIST',
        payload: {
          movieId: movie.id,
          title: movie.title,
          image: movie.image,
          vid: movie.vid,
          playingurl: movie.playingurl,
          vj: movie.vj,
          ldur: movie.ldur,
          addedAt: Date.now(),
        },
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="group relative flex-shrink-0 w-[130px] sm:w-[150px] md:w-[170px] cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handlePlay}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handlePlay(e as unknown as React.MouseEvent); }}
      aria-label={`Play ${movie.title}`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[#1A1A1A]">
        {!imgError && imageUrl ? (
          <img
            src={imageUrl}
            alt={movie.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1A1A1A] to-[#252525]">
            <Play className="w-8 h-8 text-white/30" />
          </div>
        )}

        {/* Hover overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 transition-opacity"
        >
          <button
            className="w-10 h-10 rounded-full bg-[#E50914] flex items-center justify-center hover:bg-[#ff1a25] transition-colors"
            aria-label="Play"
          >
            <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
          </button>
          <button
            onClick={handleListToggle}
            className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
            aria-label={inWatchlist ? 'Remove from list' : 'Add to list'}
          >
            {inWatchlist ? (
              <Check className="w-4 h-4 text-white" />
            ) : (
              <Plus className="w-4 h-4 text-white" />
            )}
          </button>
        </motion.div>

        {/* Duration badge */}
        {movie.ldur && (
          <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] text-white flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {movie.ldur}
          </div>
        )}

        {/* Progress bar */}
        {showProgress && progress !== undefined && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div
              className="h-full bg-[#E50914] transition-all"
              style={{ width: `${Math.min(progress * 100, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-2 px-0.5">
        <h3 className="text-white text-xs sm:text-sm font-medium line-clamp-1 group-hover:text-[#E50914] transition-colors">
          {movie.title}
        </h3>
        <p className="text-white/50 text-[10px] sm:text-xs mt-0.5 line-clamp-1">{movie.vj}</p>
      </div>
    </motion.div>
  );
}
