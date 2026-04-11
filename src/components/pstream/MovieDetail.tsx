/* PStream Movie Detail Panel — Info below the video player */

'use client';

import React from 'react';
import {
  Plus, Check, Heart, Share2, Clock, Film, Globe, HardDrive, Star
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import MovieCard from './MovieCard';
import type { MovieDetail as MovieDetailType, Movie } from '@/lib/types';

interface MovieDetailPanelProps {
  detail: MovieDetailType;
  relatedMovies: Movie[];
}

export default function MovieDetailPanel({ detail, relatedMovies }: MovieDetailPanelProps) {
  const { dispatch, isInWatchlist, navigate } = useAppStore();
  const inWatchlist = isInWatchlist(detail.id);

  const handleListToggle = () => {
    if (inWatchlist) {
      dispatch({ type: 'REMOVE_FROM_WATCHLIST', payload: detail.id });
    } else {
      dispatch({
        type: 'ADD_TO_WATCHLIST',
        payload: {
          movieId: detail.id,
          title: detail.video_title,
          image: detail.thumbnail,
          vid: detail.video_name,
          playingurl: detail.playingUrl,
          vj: detail.vjname,
          ldur: detail.duration,
          addedAt: Date.now(),
        },
      });
    }
  };

  const handleMovieClick = (movie: Movie) => {
    dispatch({ type: 'SELECT_MOVIE', payload: movie });
    navigate('player');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const infoItems = [
    { icon: Film, label: 'Genre', value: detail.genre || 'N/A' },
    { icon: Clock, label: 'Duration', value: detail.duration || 'N/A' },
    { icon: HardDrive, label: 'Size', value: detail.size || 'N/A' },
    { icon: Star, label: 'VJ', value: detail.vjname || 'N/A' },
    { icon: Globe, label: 'Language', value: detail.lang_name || 'N/A' },
  ];

  return (
    <div className="mt-4 md:mt-6">
      {/* Title and description */}
      <div className="px-4 md:px-0">
        <h2 className="text-white text-xl md:text-2xl font-bold mb-2">{detail.video_title}</h2>

        {/* Action buttons */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={handleListToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              inWatchlist
                ? 'bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/30'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {inWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {inWatchlist ? 'In My List' : 'Add to List'}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 text-sm font-medium transition-colors">
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 text-sm font-medium transition-colors">
            <Heart className="w-4 h-4" />
            Rate
          </button>
        </div>

        {/* Description */}
        <p className="text-white/70 text-sm leading-relaxed mb-6 max-w-3xl">
          {detail.description || 'No description available for this title.'}
        </p>

        {/* Info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-8">
          {infoItems.map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-[#1A1A1A] rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-3.5 h-3.5 text-[#E50914]" />
                <span className="text-white/50 text-[10px] uppercase tracking-wider font-medium">{label}</span>
              </div>
              <p className="text-white text-sm font-medium">{value}</p>
            </div>
          ))}
        </div>

        {/* Episodes section — episodes is a count from API */}
        {typeof detail.episodes === 'number' && detail.episodes > 0 && (
          <div className="mb-8 bg-[#1A1A1A] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Film className="w-4 h-4 text-[#E50914]" />
              <h3 className="text-white text-lg font-semibold">Episodes</h3>
            </div>
            <p className="text-white/50 text-sm">This title has {detail.episodes} episode{detail.episodes > 1 ? 's' : ''} available.</p>
          </div>
        )}
      </div>

      {/* Related movies */}
      {relatedMovies.length > 0 && (
        <div className="mb-8">
          <h3 className="text-white text-lg font-semibold mb-3 px-4 md:px-0">You May Also Like</h3>
          <div
            className="flex gap-3 overflow-x-auto px-4 md:px-0 pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {relatedMovies.slice(0, 15).map((movie, i) => (
              <MovieCard key={`${movie.id}-${i}`} movie={movie} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
