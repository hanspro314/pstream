/* PStream Movie Detail Page — Full standalone detail view */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Plus, Check, Share2, Clock, Film, Globe, HardDrive, Star,
  ArrowLeft, Download, ChevronDown, ChevronUp, X, Send, Shield,
  Calendar, Monitor, User, Clapperboard
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { StoredReview } from '@/lib/store';
import MovieCard from './MovieCard';
import type { Movie, MovieDetail as MovieDetailType } from '@/lib/types';

// ─── Helper ──────────────────────────────────────────────────────
function getImageUrl(image: string): string {
  if (!image) return '';
  if (image.startsWith('http')) return image;
  return `https://munoapp.org/munowatch-api/laba/yo/naki/${image}.jpg`;
}

// ─── Mock Cast Data ──────────────────────────────────────────────
function generateMockCast(detail: MovieDetailType) {
  const directorNames = ['James Mugisha', 'Grace Nakamya', 'David Ochieng', 'Sarah Achieng', 'Peter Okello'];
  const writerNames = ['Annette Kaggwa', 'Robert Kabuye', 'Patricia Amulo', 'Hassan Wasswa', 'Linet Njeri'];
  const castNames = [
    ['Michael Wawuyo Jr.', 'Josephine Nakamya', 'Samuel Bakaki', 'Eleanor Mwandi'],
    ['John Muhsesi', 'Diana Nabatanzi', 'Hannington Bugingo', 'Rebecca Nankinga'],
    ['Patrick Salvado', 'Flavia Tumusiime', 'Gerald Mukasa', 'Sharon Ooja'],
    ['Felix Bwanika', 'Malaika Nyanzi', 'Philip Luswata', 'Viola Asingo'],
  ];

  const catIndex = (detail.category_id || 1) % directorNames.length;
  const castIndex = (detail.category_id || 1) % castNames.length;

  return {
    director: directorNames[catIndex],
    writer: writerNames[catIndex],
    cast: castNames[castIndex].map((name, i) => ({
      name,
      role: i === 0 ? 'Lead' : i === 1 ? 'Co-star' : 'Supporting',
      avatar: null,
    })),
  };
}

// ─── Star Rating Component ──────────────────────────────────────
function StarRating({
  rating,
  onRate,
  readonly = false,
  size = 'md',
}: {
  rating: number;
  onRate?: (r: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [hovered, setHovered] = useState(0);
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer'} transition-transform hover:scale-110`}
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
        >
          <Star
            className={`${sizeClass} transition-colors ${
              star <= (hovered || rating)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-white/20'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Maturity Rating Badge ───────────────────────────────────────
function MaturityBadge({ category }: { category: string }) {
  const lower = category.toLowerCase();
  let label = 'U';
  let color = 'bg-green-500/20 text-green-400 border-green-500/30';

  if (lower.includes('horror') || lower.includes('thriller')) {
    label = '18+';
    color = 'bg-red-500/20 text-red-400 border-red-500/30';
  } else if (lower.includes('drama') || lower.includes('romance')) {
    label = '13+';
    color = 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  } else if (lower.includes('action') || lower.includes('sci fi') || lower.includes('comedy')) {
    label = '16+';
    color = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  } else if (lower.includes('animation') || lower.includes('documentary')) {
    label = 'PG';
    color = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border ${color}`}>
      <Shield className="w-3 h-3" />
      {label}
    </span>
  );
}

// ─── Review Modal ────────────────────────────────────────────────
function ReviewModal({
  movieId,
  movieTitle,
  existingReview,
  onClose,
  onSubmit,
}: {
  movieId: number;
  movieTitle: string;
  existingReview: StoredReview | undefined;
  onClose: () => void;
  onSubmit: (review: StoredReview) => void;
}) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [text, setText] = useState(existingReview?.text || '');

  const handleSubmit = () => {
    if (rating === 0) return;
    const userId = 'user_' + (typeof window !== 'undefined' ? (localStorage.getItem('pstream_userId') || Math.random().toString(36).slice(2, 8)) : 'guest');
    if (typeof window !== 'undefined' && !localStorage.getItem('pstream_userId')) {
      localStorage.setItem('pstream_userId', userId);
    }
    const userName = typeof window !== 'undefined' ? (localStorage.getItem('pstream_profile') ? JSON.parse(localStorage.getItem('pstream_profile') || '{}').name || 'User' : 'User') : 'User';
    onSubmit({
      movieId,
      userId,
      userName,
      rating,
      text,
      date: Date.now(),
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#141414] rounded-2xl p-6 w-full max-w-md border border-white/10"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white text-lg font-bold">Write a Review</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-white/60 text-sm mb-4">{movieTitle}</p>

        <div className="mb-4">
          <p className="text-white/70 text-sm mb-2">Your Rating</p>
          <StarRating rating={rating} onRate={setRating} size="lg" />
        </div>

        <div className="mb-6">
          <p className="text-white/70 text-sm mb-2">Your Review</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your thoughts about this title..."
            className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg p-3 text-white text-sm resize-none h-24 focus:outline-none focus:border-[#E50914]/50 placeholder:text-white/30"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={rating === 0}
          className={`w-full py-3 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
            rating > 0
              ? 'bg-[#E50914] hover:bg-[#ff1a25] text-white'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          }`}
        >
          <Send className="w-4 h-4" />
          Submit Review
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Episodes Section ────────────────────────────────────────────
function EpisodesSection({ detail, onPlayEpisode }: { detail: MovieDetailType; onPlayEpisode: (ep: number) => void }) {
  const [selectedSeason, setSelectedSeason] = useState(1);
  const episodeCount = detail.episodes || 0;
  const seasons = Math.max(1, Math.ceil(episodeCount / 10));

  const episodes = useMemo(() => {
    const start = (selectedSeason - 1) * 10 + 1;
    const end = Math.min(start + 9, episodeCount);
    const eps = [];
    for (let i = start; i <= end; i++) {
      eps.push({
        number: i,
        title: `Episode ${i}`,
        duration: detail.duration || '',
      });
    }
    return eps;
  }, [selectedSeason, episodeCount, detail.duration]);

  if (episodeCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="mt-8"
    >
      <h2 className="text-white text-xl md:text-2xl font-bold mb-4">Episodes</h2>

      {/* Season tabs */}
      {seasons > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {Array.from({ length: seasons }, (_, i) => (
            <button
              key={i}
              onClick={() => setSelectedSeason(i + 1)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedSeason === i + 1
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              Season {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Episode list */}
      <div className="space-y-3 max-h-96 overflow-y-auto rounded-lg" style={{ scrollbarWidth: 'thin' }}>
        {episodes.map((ep) => (
          <button
            key={ep.number}
            onClick={() => onPlayEpisode(ep.number)}
            className="w-full flex items-center gap-4 p-3 rounded-lg bg-[#1A1A1A] hover:bg-[#222] transition-colors group text-left"
          >
            {/* Thumbnail placeholder */}
            <div className="w-28 h-16 flex-shrink-0 rounded-md bg-[#252525] overflow-hidden relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <Play className="w-6 h-6 text-white/40 group-hover:text-[#E50914] transition-colors" />
              </div>
              {detail.thumbnail && (
                <img
                  src={getImageUrl(detail.thumbnail)}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-40"
                  loading="lazy"
                />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[#E50914] text-sm font-bold">{ep.number}</span>
                <span className="text-white text-sm font-medium truncate">{ep.title}</span>
              </div>
              {ep.duration && (
                <p className="text-white/50 text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {ep.duration}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main MovieDetailPage Component ──────────────────────────────
export default function MovieDetailPage({
  movie,
  detail,
  similarMovies,
}: {
  movie: Movie;
  detail: MovieDetailType | null;
  similarMovies: Movie[];
}) {
  const { state, dispatch, navigate, goBack, isInWatchlist } = useAppStore();
  const [showFullSynopsis, setShowFullSynopsis] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloadBlocked, setDownloadBlocked] = useState(false);

  const inWatchlist = isInWatchlist(movie.id);
  const cast = detail ? generateMockCast(detail) : null;

  // Reviews for this movie
  const movieReviews = useMemo(
    () => state.userReviews.filter((r) => r.movieId === movie.id),
    [state.userReviews, movie.id]
  );

  const averageRating = useMemo(() => {
    if (movieReviews.length === 0) return 0;
    return movieReviews.reduce((sum, r) => sum + r.rating, 0) / movieReviews.length;
  }, [movieReviews]);

  const currentUserId = typeof window !== 'undefined'
    ? (localStorage.getItem('pstream_userId') || 'guest')
    : 'guest';

  const existingReview = useMemo(
    () => movieReviews.find((r) => r.userId === currentUserId),
    [movieReviews, currentUserId]
  );

  // ─── Handlers ──────────────────────────────────────────────────
  const handlePlay = () => {
    dispatch({ type: 'SELECT_MOVIE', payload: movie });
    navigate('player');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleListToggle = () => {
    if (inWatchlist) {
      dispatch({ type: 'REMOVE_FROM_WATCHLIST', payload: movie.id });
    } else {
      dispatch({
        type: 'ADD_TO_WATCHLIST',
        payload: {
          movieId: movie.id,
          title: detail?.video_title || movie.title,
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

  const handleShare = async () => {
    const shareData = {
      title: detail?.video_title || movie.title,
      text: `Check out "${detail?.video_title || movie.title}" on PStream!`,
      url: typeof window !== 'undefined' ? window.location.href : '',
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Silently fail
      }
    }
  };

  const handleDownload = () => {
    // Only allow download if token tier is 'download' (admin OTP users are not token-based)
    const isDownloadTier = state.tokenSession?.tier === 'download';
    if (!isDownloadTier) {
      // Show upgrade prompt for stream-only / trial users
      setDownloadBlocked(true);
      return;
    }
    const url = detail?.playingUrl || movie.playingurl;
    if (!url) return;
    // Route through our proxy to bypass CDN hotlink protection
    const title = (detail?.video_title || movie.title).replace(/[^a-zA-Z0-9 ]/g, '');
    const filename = title.replace(/ +/g, '_') + '.mp4';
    const tokenCode = state.tokenSession?.code || '';
    const proxyUrl = `/api/stream/video?url=${encodeURIComponent(url)}&download=1&filename=${encodeURIComponent(filename)}${tokenCode ? '&token=' + encodeURIComponent(tokenCode) : ''}`;
    // Use a hidden anchor to trigger download
    const a = document.createElement('a');
    a.href = proxyUrl;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSubmitReview = useCallback((review: StoredReview) => {
    dispatch({ type: 'ADD_REVIEW', payload: review });
  }, [dispatch]);

  const handleMovieClick = (m: Movie) => {
    dispatch({ type: 'SELECT_MOVIE', payload: m });
    navigate('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePlayEpisode = (ep: number) => {
    dispatch({ type: 'SELECT_MOVIE', payload: movie });
    navigate('player');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    goBack();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── Info Items ────────────────────────────────────────────────
  const infoItems = [
    { icon: Film, label: 'Genre', value: detail?.genre || 'N/A' },
    { icon: Clock, label: 'Duration', value: detail?.duration || movie.ldur || 'N/A' },
    { icon: HardDrive, label: 'File Size', value: detail?.size || 'N/A' },
    { icon: Globe, label: 'Language', value: detail?.lang_name || 'English' },
    { icon: User, label: 'VJ', value: detail?.vjname || movie.vj || 'N/A' },
    { icon: Monitor, label: 'Quality', value: 'HD' },
    { icon: Calendar, label: 'Release', value: '2024' },
  ];

  const synopsis = detail?.description || 'No description available for this title.';
  const isLongSynopsis = synopsis.length > 200;

  const backdropUrl = detail?.thumbnail
    ? getImageUrl(detail.thumbnail)
    : getImageUrl(movie.image);

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Hero Section */}
      <div className="relative w-full h-[50vh] sm:h-[60vh] md:h-[70vh] overflow-hidden">
        {!imgError && backdropUrl ? (
          <img
            src={backdropUrl}
            alt={detail?.video_title || movie.title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1A1A1A] via-[#141414] to-[#0A0A0A]" />
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/60 to-[#0A0A0A]/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/80 via-transparent to-transparent" />

        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={handleBack}
          className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </motion.button>
      </div>

      {/* Content below hero */}
      <div className="relative -mt-32 z-10 px-4 md:px-12 pb-24 md:pb-12">
        {/* Title & Metadata */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 drop-shadow-lg">
            {detail?.video_title || movie.title}
          </h1>

          {/* Metadata badges */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {detail?.genre && (
              <span className="px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium">
                {detail.genre}
              </span>
            )}
            <span className="px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium">
              2024
            </span>
            {(detail?.duration || movie.ldur) && (
              <span className="px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {detail?.duration || movie.ldur}
              </span>
            )}
            <MaturityBadge category={detail?.genre || ''} />
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6"
        >
          <button
            onClick={handlePlay}
            className="flex items-center gap-2 bg-[#E50914] hover:bg-[#ff1a25] text-white px-5 sm:px-8 py-2.5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-colors"
          >
            <Play className="w-5 h-5" fill="white" />
            Play
          </button>

          <button
            onClick={handleListToggle}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              inWatchlist
                ? 'bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/30'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {inWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {inWatchlist ? 'In My List' : 'My List'}
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 bg-white/10 text-white hover:bg-white/20 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Share2 className="w-4 h-4" />
            {copied ? 'Copied!' : 'Share'}
          </button>

          <button
            onClick={() => setShowReviewModal(true)}
            className="flex items-center gap-2 bg-white/10 text-white hover:bg-white/20 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Star className="w-4 h-4" />
            Rate
          </button>

          <button
            onClick={handleDownload}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              state.tokenSession?.tier === 'download'
                ? 'bg-white/10 text-white hover:bg-white/20'
                : 'bg-white/5 text-white/40 cursor-not-allowed'
            }`}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{state.tokenSession?.tier === 'download' ? 'Download' : 'Stream Only'}</span>
          </button>
        </motion.div>

        {/* Rating summary */}
        {movieReviews.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 mb-6 p-3 rounded-lg bg-[#1A1A1A]"
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{averageRating.toFixed(1)}</div>
              <StarRating rating={Math.round(averageRating)} readonly size="sm" />
              <p className="text-white/50 text-xs mt-1">{movieReviews.length} review{movieReviews.length !== 1 ? 's' : ''}</p>
            </div>
            {existingReview && (
              <div className="ml-auto text-right">
                <p className="text-white/50 text-xs">Your rating</p>
                <StarRating rating={existingReview.rating} readonly size="sm" />
              </div>
            )}
          </motion.div>
        )}

        {/* Info Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6"
        >
          {infoItems.map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-[#1A1A1A] rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-3.5 h-3.5 text-[#E50914]" />
                <span className="text-white/50 text-[10px] uppercase tracking-wider font-medium">{label}</span>
              </div>
              <p className="text-white text-sm font-medium truncate">{value}</p>
            </div>
          ))}
        </motion.div>

        {/* Synopsis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-8"
        >
          <h2 className="text-white text-lg font-bold mb-2">Synopsis</h2>
          <p className="text-white/70 text-sm leading-relaxed max-w-3xl">
            {showFullSynopsis ? synopsis : (isLongSynopsis ? synopsis.slice(0, 200) + '...' : synopsis)}
          </p>
          {isLongSynopsis && (
            <button
              onClick={() => setShowFullSynopsis(!showFullSynopsis)}
              className="flex items-center gap-1 text-[#E50914] text-sm font-medium mt-2 hover:text-[#ff1a25] transition-colors"
            >
              {showFullSynopsis ? (
                <>Show Less <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Read More <ChevronDown className="w-4 h-4" /></>
              )}
            </button>
          )}
        </motion.div>

        {/* Cast & Crew */}
        {cast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <h2 className="text-white text-lg font-bold mb-4">Cast & Crew</h2>
            <div className="space-y-4">
              {/* Director & Writer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 bg-[#1A1A1A] rounded-lg p-3">
                  <div className="w-10 h-10 rounded-full bg-[#E50914]/20 flex items-center justify-center flex-shrink-0">
                    <Clapperboard className="w-5 h-5 text-[#E50914]" />
                  </div>
                  <div>
                    <p className="text-white/50 text-xs">Director</p>
                    <p className="text-white text-sm font-medium">{cast.director}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-[#1A1A1A] rounded-lg p-3">
                  <div className="w-10 h-10 rounded-full bg-[#E50914]/20 flex items-center justify-center flex-shrink-0">
                    <Film className="w-5 h-5 text-[#E50914]" />
                  </div>
                  <div>
                    <p className="text-white/50 text-xs">Writer</p>
                    <p className="text-white text-sm font-medium">{cast.writer}</p>
                  </div>
                </div>
              </div>

              {/* Cast members */}
              <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                {cast.cast.map((member) => (
                  <div key={member.name} className="flex-shrink-0 w-20 text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-[#E50914]/30 to-[#E50914]/10 flex items-center justify-center border-2 border-white/10">
                      <User className="w-6 h-6 text-white/40" />
                    </div>
                    <p className="text-white text-xs font-medium mt-2 line-clamp-1">{member.name}</p>
                    <p className="text-white/40 text-[10px] mt-0.5">{member.role}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Episodes Section (for series) */}
        {detail && detail.episodes > 0 && (
          <EpisodesSection detail={detail} onPlayEpisode={handlePlayEpisode} />
        )}

        {/* User Reviews Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white text-lg font-bold">Reviews</h2>
              {movieReviews.length > 0 && (
                <p className="text-white/50 text-sm mt-0.5">{movieReviews.length} review{movieReviews.length !== 1 ? 's' : ''}</p>
              )}
            </div>
            <button
              onClick={() => setShowReviewModal(true)}
              className="flex items-center gap-1.5 bg-[#E50914] hover:bg-[#ff1a25] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Write a Review
            </button>
          </div>

          {movieReviews.length === 0 ? (
            <div className="bg-[#1A1A1A] rounded-lg p-8 text-center">
              <Star className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-white/50 text-sm">No reviews yet. Be the first to share your thoughts!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {movieReviews.map((review, i) => (
                <div key={`${review.userId}-${i}`} className="bg-[#1A1A1A] rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E50914] to-[#E50914]/50 flex items-center justify-center text-white text-xs font-bold">
                      {review.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{review.userName}</p>
                      <p className="text-white/40 text-xs">
                        {new Date(review.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <StarRating rating={review.rating} readonly size="sm" />
                  </div>
                  {review.text && (
                    <p className="text-white/70 text-sm leading-relaxed">{review.text}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Similar / More Like This */}
        {similarMovies.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <h2 className="text-white text-lg font-bold mb-4">More Like This</h2>
            <div
              className="flex gap-3 overflow-x-auto pb-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {similarMovies.slice(0, 15).map((m, i) => (
                <div key={`${m.id}-${i}`} onClick={() => handleMovieClick(m)}>
                  <MovieCard movie={m} index={i} />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Download Blocked — Upgrade Prompt */}
      <AnimatePresence>
        {downloadBlocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setDownloadBlocked(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141414] border border-white/10 rounded-2xl p-6 max-w-sm w-full text-center"
            >
              <div className="w-14 h-14 rounded-full bg-[#E50914]/10 flex items-center justify-center mx-auto mb-4">
                <Download className="w-7 h-7 text-[#E50914]" />
              </div>
              <h3 className="text-white text-lg font-semibold mb-2">Download Not Available</h3>
              <p className="text-white/60 text-sm mb-6">
                Your current plan only includes streaming. Upgrade to Stream + Download to save movies and watch offline.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setDownloadBlocked(false); navigate('subscribe'); }}
                  className="flex-1 bg-[#E50914] hover:bg-[#E50914]/90 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                  Upgrade
                </button>
                <button
                  onClick={() => setDownloadBlocked(false)}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <AnimatePresence>
        {showReviewModal && (
          <ReviewModal
            movieId={movie.id}
            movieTitle={detail?.video_title || movie.title}
            existingReview={existingReview}
            onClose={() => setShowReviewModal(false)}
            onSubmit={handleSubmitReview}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
