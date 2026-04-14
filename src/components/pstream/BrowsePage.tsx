/* PStream Browse Page — Full movie catalog with genre filters, sorting, and search-based discovery
 *
 * "All" tab fetches the COMPLETE library via /api/stream/library (server-side, ~900+ movies).
 * Genre tabs use search for category-specific results with pagination.
 * Uses the same multi-endpoint strategy as the Munowatch Python CLI.
 */

'use client';

import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { fetchLibrary, fetchSearch } from '@/lib/api';
import MovieCard from './MovieCard';
import { SkeletonGrid } from './SkeletonCard';
import { ArrowUpDown, Film, ChevronDown, Loader2 } from 'lucide-react';
import type { Movie, SortOption, SearchResult } from '@/lib/types';

const genres = ['All', 'Action', 'Sci Fi', 'Romance', 'Horror', 'Drama', 'Comedy', 'Thriller', 'Documentary', 'Animation'];

export default function BrowsePage() {
  const { state, dispatch, navigate } = useAppStore();

  // ─── Full library state (server-side, "All" tab) ─────────────
  const [libraryMovies, setLibraryMovies] = useState<Movie[]>([]);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [libraryRetryCount, setLibraryRetryCount] = useState(0);

  // ─── Genre search state ──────────────────────────────────────
  const [genreSearchResults, setGenreSearchResults] = useState<SearchResult[]>([]);
  const [isGenreSearching, setIsGenreSearching] = useState(false);
  const [hasMoreGenreResults, setHasMoreGenreResults] = useState(false);
  const [genreSearchPage, setGenreSearchPage] = useState(0);

  // ─── Fetch full library on mount (with retry) ───────────────
  useEffect(() => {
    if (libraryLoaded) return;

    const loadLibrary = async () => {
      setIsLibraryLoading(true);
      try {
        const results: SearchResult[] = await fetchLibrary();
        const movies: Movie[] = results.map((r) => ({
          id: r.id,
          subscriber: r.subscriber || '',
          paid: r.paid || '',
          title: r.title,
          image: r.image,
          vj: r.vj || '',
          vid: r.vid || String(r.id),
          ldur: r.ldur || '',
          state: '',
          category_id: r.category_id || 0,
          playingurl: r.playingurl || '',
        }));
        if (movies.length > 0) {
          setLibraryMovies(movies);
          setLibraryLoaded(true);
        } else if (libraryRetryCount < 2) {
          // Retry if we got empty results (server may be building cache)
          setLibraryRetryCount((c) => c + 1);
          setTimeout(() => loadLibrary(), 3000);
        } else {
          setLibraryLoaded(true); // Give up after 2 retries
        }
      } catch {
        // Retry on network errors
        if (libraryRetryCount < 2) {
          setLibraryRetryCount((c) => c + 1);
          setTimeout(() => loadLibrary(), 3000);
        } else {
          setLibraryLoaded(true); // Give up after 2 retries
        }
      } finally {
        setIsLibraryLoading(false);
      }
    };

    loadLibrary();
  }, [libraryLoaded, libraryRetryCount]);

  // ─── Genre-specific search ───────────────────────────────────
  useEffect(() => {
    const genre = state.browseGenreFilter;
    if (genre === 'All') {
      setGenreSearchResults([]);
      setGenreSearchPage(0);
      setHasMoreGenreResults(false);
      return;
    }

    const searchByGenre = async () => {
      setIsGenreSearching(true);
      setGenreSearchResults([]);
      setGenreSearchPage(0);
      try {
        const results = await fetchSearch(genre, 0);
        const arr = Array.isArray(results) ? results : [];
        setGenreSearchResults(arr);
        setHasMoreGenreResults(arr.length >= 10);
      } catch {
        setGenreSearchResults([]);
        setHasMoreGenreResults(false);
      } finally {
        setIsGenreSearching(false);
      }
    };

    searchByGenre();
  }, [state.browseGenreFilter]);

  // Load more genre results
  const handleLoadMoreGenre = useCallback(async () => {
    if (isGenreSearching || !hasMoreGenreResults || state.browseGenreFilter === 'All') return;

    const nextPage = genreSearchPage + 1;
    setIsGenreSearching(true);
    try {
      const results = await fetchSearch(state.browseGenreFilter, nextPage);
      const arr = Array.isArray(results) ? results : [];
      if (arr.length === 0) {
        setHasMoreGenreResults(false);
      } else {
        setGenreSearchResults((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const newItems = arr.filter((r) => !existingIds.has(r.id));
          return [...prev, ...newItems];
        });
        setGenreSearchPage(nextPage);
        if (arr.length < 10) setHasMoreGenreResults(false);
      }
    } catch {
      // Silently fail
    } finally {
      setIsGenreSearching(false);
    }
  }, [isGenreSearching, hasMoreGenreResults, genreSearchPage, state.browseGenreFilter]);

  // Convert genre search results to Movie objects
  const genreMovies = useMemo<Movie[]>(() => {
    return genreSearchResults.map((r) => ({
      id: r.id,
      subscriber: r.subscriber || '',
      paid: r.paid || '',
      title: r.title,
      image: r.image,
      vj: r.vj || '',
      vid: r.vid || String(r.id),
      ldur: r.ldur || '',
      state: '',
      category_id: r.category_id || 0,
      playingurl: r.playingurl || '',
    }));
  }, [genreSearchResults]);

  // ─── Determine which movies to display ───────────────────────
  const displayMovies = useMemo<Movie[]>(() => {
    if (state.browseGenreFilter === 'All') {
      // Use the full library
      return libraryMovies;
    }

    // For specific genre: merge search results with matching library movies
    // Search the upstream by genre name AND filter library by title/category keywords
    const genre = state.browseGenreFilter.toLowerCase();
    const genreKeywords: Record<string, string[]> = {
      'action': ['action', 'fight', 'war', 'battle', 'strike', 'mission', 'force'],
      'sci fi': ['sci', 'space', 'alien', 'future', 'robot', 'star', 'mars', 'planet', 'galaxy'],
      'romance': ['romance', 'love', 'heart', 'wedding', 'kiss', 'valentine', 'couple'],
      'horror': ['horror', 'haunt', 'ghost', 'demon', 'evil', 'dead', 'fear', 'scream', 'curse'],
      'drama': ['drama', 'life', 'story', 'family', 'court', 'judge', 'trial'],
      'comedy': ['comedy', 'funny', 'laugh', 'fun', 'joke', 'prank'],
      'thriller': ['thriller', 'mystery', 'detective', 'crime', 'murder', 'suspect', 'kill'],
      'documentary': ['documentary', 'true', 'story'],
      'animation': ['animation', 'cartoon', 'animated', 'anime'],
    };
    const keywords = genreKeywords[genre] || [genre];
    const libraryMatches = libraryMovies.filter((m) => {
      const titleLower = m.title.toLowerCase();
      return keywords.some((kw) => titleLower.includes(kw));
    });

    const moviesMap = new Map<number, Movie>();
    genreMovies.forEach((m) => moviesMap.set(m.id, m));
    libraryMatches.forEach((m) => {
      if (!moviesMap.has(m.id)) moviesMap.set(m.id, m);
    });

    return Array.from(moviesMap.values());
  }, [libraryMovies, genreMovies, state.browseGenreFilter]);

  // Sort
  const filteredMovies = useMemo(() => {
    let filtered = displayMovies;

    switch (state.browseSort) {
      case 'az':
        filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'latest':
        filtered = [...filtered].sort((a, b) => b.id - a.id);
        break;
      case 'popular':
      default:
        break;
    }

    return filtered;
  }, [displayMovies, state.browseSort]);

  // Handle movie click — go to detail page
  const handleMovieClick = useCallback((movie: Movie) => {
    dispatch({ type: 'SELECT_MOVIE', payload: movie });
    navigate('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [dispatch, navigate]);

  // ─── Loading state ───────────────────────────────────────────
  const isInitialLoading = state.browseGenreFilter === 'All'
    ? isLibraryLoading && libraryMovies.length === 0
    : isGenreSearching && genreSearchResults.length === 0;

  if (isInitialLoading) {
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
        <h1 className="text-white text-xl md:text-2xl font-bold">
          {state.browseGenreFilter === 'All' ? 'Browse Movies' : state.browseGenreFilter}
        </h1>
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
      <p className="text-white/50 text-sm mb-4">
        {filteredMovies.length} movies found
        {state.browseGenreFilter === 'All' && isLibraryLoading && libraryMovies.length > 0 && (
          <span className="text-[#E50914] ml-1">— loading more...</span>
        )}
        {hasMoreGenreResults && state.browseGenreFilter !== 'All' && (
          <span className="text-[#E50914] ml-1">— more available</span>
        )}
      </p>

      {/* Loading indicator for genre search */}
      {isGenreSearching && state.browseGenreFilter !== 'All' && (
        <div className="flex items-center gap-2 mb-4">
          <Loader2 className="w-4 h-4 text-[#E50914] animate-spin" />
          <span className="text-white/40 text-xs">Searching for more...</span>
        </div>
      )}

      {/* Movie grid */}
      {filteredMovies.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {filteredMovies.map((movie, i) => (
              <div key={movie.id} onClick={() => handleMovieClick(movie)}>
                <MovieCard movie={movie} index={i} />
              </div>
            ))}
          </div>

          {/* Load More button for genre search */}
          {hasMoreGenreResults && !isGenreSearching && state.browseGenreFilter !== 'All' && (
            <div className="flex justify-center mt-8">
              <button
                onClick={handleLoadMoreGenre}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#1A1A1A] hover:bg-[#252525] border border-white/10 hover:border-[#E50914]/30 text-white/70 hover:text-white text-sm font-medium transition-all"
              >
                <ChevronDown className="w-4 h-4" />
                Load More {state.browseGenreFilter} Movies
              </button>
            </div>
          )}
        </>
      ) : isInitialLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />
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
