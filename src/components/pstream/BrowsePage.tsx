/* PStream Browse Page — All categories with genre filters and sorting */

'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import MovieCard from './MovieCard';
import { SkeletonGrid } from './SkeletonCard';
import { ArrowUpDown } from 'lucide-react';
import type { Movie, SortOption } from '@/lib/types';

const genres = ['All', 'Action', 'Sci Fi', 'Romance', 'Horror', 'Drama', 'Comedy', 'Thriller', 'Documentary', 'Animation'];

export default function BrowsePage() {
  const { state, dispatch, navigate } = useAppStore();

  const allMovies = useMemo<Movie[]>(() => {
    if (!state.dashboard) return [];
    const moviesMap = new Map<number, Movie>();
    state.dashboard.dashboard.forEach((cat) => {
      cat.movies.forEach((movie) => {
        if (!moviesMap.has(movie.id)) {
          moviesMap.set(movie.id, movie);
        }
      });
    });
    return Array.from(moviesMap.values());
  }, [state.dashboard]);

  const filteredMovies = useMemo(() => {
    let filtered = allMovies;

    // Genre filter
    if (state.browseGenreFilter !== 'All') {
      const genre = state.browseGenreFilter.toLowerCase();
      filtered = filtered.filter((m) =>
        state.dashboard?.dashboard.some(
          (cat) => cat.category.toLowerCase() === genre && cat.movies.some((cm) => cm.id === m.id)
        )
      );
      // If no match from categories, show all (fallback)
      if (filtered.length === 0) filtered = allMovies;
    }

    // Sort
    switch (state.browseSort) {
      case 'az':
        filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'latest':
        filtered = [...filtered].sort((a, b) => b.id - a.id);
        break;
      case 'popular':
      default:
        // Keep original order
        break;
    }

    return filtered;
  }, [allMovies, state.browseGenreFilter, state.browseSort, state.dashboard]);

  if (state.isDashboardLoading) {
    return (
      <div className="pt-20 px-4 md:px-12 pb-24 md:pb-8">
        <div className="h-8 w-48 bg-[#1A1A1A] rounded animate-pulse mb-6" />
        <div className="flex gap-2 mb-6 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-20 bg-[#1A1A1A] rounded-full animate-pulse" />
          ))}
        </div>
        <SkeletonGrid />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-20 px-4 md:px-12 pb-24 md:pb-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white text-xl md:text-2xl font-bold">Browse Movies</h1>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-white/50" />
          <select
            value={state.browseSort}
            onChange={(e) => dispatch({ type: 'SET_BROWSE_SORT', payload: e.target.value as SortOption })}
            className="bg-[#1A1A1A] text-white text-sm rounded-lg px-3 py-1.5 border border-white/10 focus:outline-none focus:border-[#E50914]/50 appearance-none cursor-pointer"
            aria-label="Sort movies"
          >
            <option value="latest">Latest</option>
            <option value="az">A - Z</option>
            <option value="popular">Popular</option>
          </select>
        </div>
      </div>

      {/* Genre filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {genres.map((genre) => (
          <button
            key={genre}
            onClick={() => dispatch({ type: 'SET_BROWSE_GENRE_FILTER', payload: genre })}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              state.browseGenreFilter === genre
                ? 'bg-[#E50914] text-white'
                : 'bg-[#1A1A1A] text-white/60 hover:text-white hover:bg-[#252525]'
            }`}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Movie count */}
      <p className="text-white/50 text-sm mb-4">{filteredMovies.length} movies found</p>

      {/* Movie grid */}
      {filteredMovies.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {filteredMovies.map((movie, i) => (
            <MovieCard key={movie.id} movie={movie} index={i} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center mb-4">
            <Film className="w-8 h-8 text-white/30" />
          </div>
          <p className="text-white/70 text-lg font-medium mb-2">No movies found</p>
          <p className="text-white/40 text-sm">Try selecting a different genre</p>
        </div>
      )}
    </motion.div>
  );
}

// Need to import Film for empty state
import { Film } from 'lucide-react';
