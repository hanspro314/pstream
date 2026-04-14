/* PStream Browse Page — All categories with genre filters, sorting, and search-based discovery
 *
 * When "All" is selected, automatically searches popular genres in the background
 * and merges results with dashboard movies so users see the FULL library (~230+).
 */

'use client';

import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { fetchSearch } from '@/lib/api';
import MovieCard from './MovieCard';
import { SkeletonGrid } from './SkeletonCard';
import { ArrowUpDown, Film, ChevronDown, Loader2 } from 'lucide-react';
import type { Movie, SortOption, SearchResult } from '@/lib/types';

const genres = ['All', 'Action', 'Sci Fi', 'Romance', 'Horror', 'Drama', 'Comedy', 'Thriller', 'Documentary', 'Animation'];

// Terms to search when "All" is selected — covers the full catalog
const DISCOVERY_TERMS = [
  'Action', 'Romance', 'Comedy', 'Horror', 'Drama',
  'Thriller', 'Documentary', 'Animation', 'Adventure',
  'Crime', 'Fantasy', 'Mystery', 'War', 'Family',
  'a', 'e', 'i', 'love', 'the',
];

export default function BrowsePage() {
  const { state, dispatch, navigate } = useAppStore();

  // Search-based genre discovery state
  const [genreSearchResults, setGenreSearchResults] = useState<SearchResult[]>([]);
  const [isGenreSearching, setIsGenreSearching] = useState(false);
  const [hasMoreGenreResults, setHasMoreGenreResults] = useState(false);
  const [genreSearchPage, setGenreSearchPage] = useState(0);

  // Broad search state for "All" view
  const [broadResults, setBroadResults] = useState<SearchResult[]>([]);
  const [isBroadSearching, setIsBroadSearching] = useState(false);
  const [broadSearched, setBroadSearched] = useState(false);
  const broadSearchRef = useRef(false); // prevent double-fire

  // Dashboard movies
  const allMovies = useMemo<Movie[]>(() => {
    if (!state.dashboard?.dashboard) return [];
    const categories = Array.isArray(state.dashboard.dashboard) ? state.dashboard.dashboard : [];
    const moviesMap = new Map<number, Movie>();
    categories.forEach((cat) => {
      const movies = Array.isArray(cat.movies) ? cat.movies : [];
      movies.forEach((movie) => {
        if (!moviesMap.has(movie.id)) {
          moviesMap.set(movie.id, movie);
        }
      });
    });
    return Array.from(moviesMap.values());
  }, [state.dashboard]);

  // ─── Broad search for "All" view ────────────────────
  // Searches multiple genre terms in background to discover 230+ movies
  useEffect(() => {
    if (state.browseGenreFilter !== 'All') return;
    if (broadSearchRef.current) return;
    if (allMovies.length === 0) return; // wait for dashboard first

    broadSearchRef.current = true;
    let cancelled = false;

    const discoverAll = async () => {
      setIsBroadSearching(true);
      const allIds = new Set<number>();
      const allItems: SearchResult[] = [];

      // Add dashboard movie IDs so we can skip them in search results
      allMovies.forEach((m) => allIds.add(m.id));

      // Search terms sequentially (avoid upstream rate limiting)
      for (const term of DISCOVERY_TERMS) {
        if (cancelled) break;
        try {
          const results = await fetchSearch(term, 0);
          const arr = Array.isArray(results) ? results : [];
          for (const item of arr) {
            if (!allIds.has(item.id)) {
              allIds.add(item.id);
              allItems.push(item);
            }
          }
          // Also fetch page 1 for each genre for deeper coverage
          if (arr.length >= 10) {
            try {
              const page2 = await fetchSearch(term, 1);
              const arr2 = Array.isArray(page2) ? page2 : [];
              for (const item of arr2) {
                if (!allIds.has(item.id)) {
                  allIds.add(item.id);
                  allItems.push(item);
                }
              }
            } catch { /* skip page 2 on error */ }
          }
        } catch { /* skip failed term */ }
      }

      if (!cancelled) {
        setBroadResults(allItems);
        setBroadSearched(true);
        setIsBroadSearching(false);
      }
    };

    discoverAll();
    return () => { cancelled = true; };
  }, [state.browseGenreFilter, allMovies.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Genre-specific search ─────────────────────────
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

  // Convert search results to Movie objects
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

  // Convert broad search results to Movie objects
  const broadMovies = useMemo<Movie[]>(() => {
    return broadResults.map((r) => ({
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
  }, [broadResults]);

  // Combine dashboard + search results, deduplicate by id
  const combinedMovies = useMemo<Movie[]>(() => {
    if (state.browseGenreFilter === 'All') {
      // For "All": merge dashboard + broad search results
      if (!broadSearched) return allMovies;
      const moviesMap = new Map<number, Movie>();
      // Dashboard movies first (they have richer data)
      allMovies.forEach((m) => moviesMap.set(m.id, m));
      // Broad search results fill in the gaps
      broadMovies.forEach((m) => {
        if (!moviesMap.has(m.id)) moviesMap.set(m.id, m);
      });
      return Array.from(moviesMap.values());
    }

    // For specific genre: merge search results with dashboard category matches
    const genre = state.browseGenreFilter.toLowerCase();
    const categoryMatches = allMovies.filter((m) => {
      const categories = Array.isArray(state.dashboard?.dashboard) ? state.dashboard.dashboard : [];
      return categories.some(
        (cat) => cat.category.toLowerCase() === genre && Array.isArray(cat.movies) && cat.movies.some((cm) => cm.id === m.id)
      );
    });

    const moviesMap = new Map<number, Movie>();
    categoryMatches.forEach((m) => moviesMap.set(m.id, m));
    genreMovies.forEach((m) => {
      if (!moviesMap.has(m.id)) moviesMap.set(m.id, m);
    });

    return Array.from(moviesMap.values());
  }, [allMovies, genreMovies, broadMovies, state.browseGenreFilter, state.dashboard, broadSearched]);

  // Sort
  const filteredMovies = useMemo(() => {
    let filtered = combinedMovies;

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
  }, [combinedMovies, state.browseSort]);

  // Handle movie click — go to detail page
  const handleMovieClick = useCallback((movie: Movie) => {
    dispatch({ type: 'SELECT_MOVIE', payload: movie });
    navigate('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [dispatch, navigate]);

  if (state.isDashboardLoading && state.browseGenreFilter === 'All') {
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
        {state.browseGenreFilter === 'All' && isBroadSearching && (
          <span className="text-[#E50914] ml-1">— discovering more...</span>
        )}
        {hasMoreGenreResults && state.browseGenreFilter !== 'All' && (
          <span className="text-[#E50914] ml-1">— more available</span>
        )}
      </p>

      {/* Loading indicator for genre/broad search */}
      {(isGenreSearching || isBroadSearching) && state.browseGenreFilter !== 'All' && (
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
      ) : isGenreSearching || (isBroadSearching && combinedMovies.length === 0) ? (
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
