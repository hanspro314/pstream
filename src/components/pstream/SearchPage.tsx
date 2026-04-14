/* PStream Search Page — Search bar with instant results, pagination, and series support */

'use client';

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { Search, Clock, X, TrendingUp, Film, ChevronDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { fetchSearch } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import MovieCard from './MovieCard';
import type { Movie, SearchResult } from '@/lib/types';

export default function SearchPage() {
  const { state, dispatch, navigate } = useAppStore();
  const debouncedQuery = useDebounce(state.searchQuery, 500);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const [allResults, setAllResults] = useState<SearchResult[]>([]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset results when query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) {
      setAllResults([]);
      setCurrentPage(0);
      setHasMoreResults(true);
      if (state.searchResults.length > 0) {
        dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
      }
      return;
    }
    // Reset and fetch first page
    setAllResults([]);
    setCurrentPage(0);
    setHasMoreResults(true);
  }, [debouncedQuery, dispatch]);

  // Fetch search results (first page or triggered by query change)
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) return;

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const doSearch = async () => {
      dispatch({ type: 'SET_SEARCH_LOADING', payload: true });
      try {
        const results = await fetchSearch(debouncedQuery.trim(), 0);
        if (!abortRef.current?.signal.aborted) {
          const resultsArray = Array.isArray(results) ? results : [];
          setAllResults(resultsArray);
          setCurrentPage(0);
          setHasMoreResults(resultsArray.length > 0);
          dispatch({ type: 'SET_SEARCH_RESULTS', payload: resultsArray });
          dispatch({ type: 'ADD_RECENT_SEARCH', payload: debouncedQuery.trim() });
        }
      } catch {
        if (!abortRef.current?.signal.aborted) {
          dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
        }
      }
    };

    doSearch();
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, [debouncedQuery, dispatch]);

  // Load more results (next page)
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMoreResults || !debouncedQuery.trim()) return;

    const nextPage = currentPage + 1;
    setIsLoadingMore(true);

    try {
      const results = await fetchSearch(debouncedQuery.trim(), nextPage);
      const resultsArray = Array.isArray(results) ? results : [];

      if (resultsArray.length === 0) {
        // No more results from upstream
        setHasMoreResults(false);
      } else {
        // Merge with existing results, deduplicate by id
        setAllResults((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const newItems = resultsArray.filter((r) => !existingIds.has(r.id));
          const merged = [...prev, ...newItems];
          dispatch({ type: 'SET_SEARCH_RESULTS', payload: merged });
          return merged;
        });
        setCurrentPage(nextPage);
        // If upstream returned fewer results than expected, likely no more pages
        if (resultsArray.length < 10) {
          setHasMoreResults(false);
        }
      }
    } catch {
      // Network error — don't change hasMore, user can retry
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMoreResults, debouncedQuery, currentPage, dispatch]);

  const handleClear = useCallback(() => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: '' });
    dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
    setAllResults([]);
    setCurrentPage(0);
    setHasMoreResults(true);
    inputRef.current?.focus();
  }, [dispatch]);

  const handleRecentClick = useCallback((term: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: term });
  }, [dispatch]);

  // Navigate to DETAIL page (not player) so series episodes are visible
  const handleMovieClick = useCallback((result: SearchResult) => {
    const movie: Movie = {
      id: result.id,
      subscriber: result.subscriber || '',
      paid: result.paid || '',
      title: result.title,
      image: result.image,
      vj: result.vj || '',
      vid: result.vid || String(result.id),
      ldur: result.ldur || '',
      state: '',
      category_id: result.category_id || 0,
      playingurl: result.playingurl || '',
    };
    dispatch({ type: 'SELECT_MOVIE', payload: movie });
    navigate('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [dispatch, navigate]);

  const trendingTerms = ['Action', 'Romance', 'Comedy', 'Horror', 'Drama'];

  const displayResults = allResults.length > 0 ? allResults : state.searchResults;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-20 px-4 md:px-12 pb-24 md:pb-8"
    >
      {/* Search bar */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            ref={inputRef}
            type="text"
            value={state.searchQuery}
            onChange={(e) => dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value })}
            placeholder="Search movies, series, actors..."
            className="w-full bg-[#1A1A1A] text-white text-base md:text-lg rounded-xl pl-12 pr-12 py-4 border border-white/10 focus:outline-none focus:border-[#E50914]/50 focus:ring-1 focus:ring-[#E50914]/30 placeholder:text-white/30 transition-all"
            aria-label="Search movies"
          />
          {state.searchQuery && (
            <button
              onClick={handleClear}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {state.isSearchLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center py-12"
          >
            <div className="w-8 h-8 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />
          </motion.div>
        ) : displayResults.length > 0 ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-white/50 text-sm mb-4">
              {displayResults.length} results for &ldquo;{state.searchQuery}&rdquo;
              {hasMoreResults && <span className="text-[#E50914] ml-1">— scroll down for more</span>}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
              {displayResults.map((result, i) => (
                <div key={`${result.id}-${i}`} onClick={() => handleMovieClick(result)}>
                  <MovieCard
                    movie={{
                      id: result.id,
                      subscriber: result.subscriber || '',
                      paid: result.paid || '',
                      title: result.title,
                      image: result.image,
                      vj: result.vj || '',
                      vid: result.vid || String(result.id),
                      ldur: result.ldur || '',
                      state: '',
                      category_id: result.category_id || 0,
                      playingurl: result.playingurl || '',
                    }}
                    index={i}
                  />
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {hasMoreResults && !state.isSearchLoading && (
              <div ref={loaderRef} className="flex justify-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#1A1A1A] hover:bg-[#252525] border border-white/10 hover:border-[#E50914]/30 text-white/70 hover:text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading more...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Load More
                    </>
                  )}
                </button>
              </div>
            )}

            {/* End of results */}
            {!hasMoreResults && displayResults.length > 0 && (
              <p className="text-white/30 text-xs text-center mt-6">
                Showing all available results
              </p>
            )}
          </motion.div>
        ) : state.searchQuery.length >= 2 ? (
          <motion.div
            key="no-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center mb-4">
              <Film className="w-8 h-8 text-white/30" />
            </div>
            <p className="text-white/70 text-lg font-medium mb-2">No results found</p>
            <p className="text-white/40 text-sm mb-6">Try different keywords or check the spelling</p>
            <div className="flex flex-wrap justify-center gap-2">
              {trendingTerms.map((term) => (
                <button
                  key={term}
                  onClick={() => handleRecentClick(term)}
                  className="px-3 py-1.5 rounded-full bg-[#1A1A1A] text-white/60 text-sm hover:bg-[#252525] hover:text-white transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="suggestions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Recent searches */}
            {state.recentSearches.length > 0 && (
              <div className="mb-8">
                <h3 className="text-white text-base font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Recent Searches
                </h3>
                <div className="flex flex-wrap gap-2">
                  {state.recentSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => handleRecentClick(term)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1A1A1A] text-white/70 text-sm hover:bg-[#252525] hover:text-white transition-colors"
                    >
                      <Clock className="w-3 h-3" />
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending */}
            <div>
              <h3 className="text-white text-base font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Trending Searches
              </h3>
              <div className="flex flex-wrap gap-2">
                {trendingTerms.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleRecentClick(term)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1A1A1A] text-white/70 text-sm hover:bg-[#252525] hover:text-white transition-colors"
                  >
                    <TrendingUp className="w-3 h-3" />
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
