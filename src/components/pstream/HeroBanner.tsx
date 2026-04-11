/* PStream Hero Banner — Featured movie banner with auto-rotate */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Play, Plus, Check, Info, ChevronRight, ChevronLeft, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import type { DashboardBanner, Movie } from '@/lib/types';

interface HeroBannerProps {
  banners: DashboardBanner[];
  categories: { category: string; movies: Movie[] }[];
}

function getBannerImage(banner: DashboardBanner): string {
  if (banner.thumbnail) {
    return banner.thumbnail.startsWith('http') ? banner.thumbnail : `https://munoapp.org/munowatch-api/laba/yo/naki/${banner.thumbnail}.jpg`;
  }
  if (banner.image) {
    return banner.image.startsWith('http') ? banner.image : `https://munoapp.org/munowatch-api/laba/yo/naki/${banner.image}.jpg`;
  }
  // Fallback: use first movie image from first category
  return '';
}

export default function HeroBanner({ banners, categories }: HeroBannerProps) {
  const { navigate, dispatch, isInWatchlist } = useAppStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [muted, setMuted] = useState(true);

  // Use banners if available, otherwise pick from first category movies
  const items = banners.length > 0
    ? banners.map((b) => ({
        id: String(b.id),
        title: b.video_title,
        description: b.description,
        image: getBannerImage(b),
        playingUrl: b.playingUrl,
        vid: String(b.id),
      }))
    : categories[0]?.movies.slice(0, 5).map((m) => ({
        id: String(m.id),
        title: m.title,
        description: `${m.vj} • ${m.ldur}`,
        image: m.image.startsWith('http') ? m.image : `https://munoapp.org/munowatch-api/laba/yo/naki/${m.image}.jpg`,
        playingUrl: m.playingurl,
        vid: m.vid,
      })) ?? [];

  const currentItem = items[currentIndex];
  const inWatchlist = currentItem ? isInWatchlist(Number(currentItem.id)) : false;

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setImgError(false);
  }, [items.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    setImgError(false);
  }, [items.length]);

  // Auto-rotate every 8 seconds
  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(goNext, 8000);
    return () => clearInterval(timer);
  }, [items.length, goNext]);

  if (!currentItem) return null;

  const handlePlay = () => {
    const movie: Movie = {
      id: Number(currentItem.id),
      subscriber: '',
      paid: '',
      title: currentItem.title,
      image: currentItem.image,
      vj: '',
      vid: currentItem.vid,
      ldur: '',
      state: '',
      category_id: 0,
      playingurl: currentItem.playingUrl,
    };
    dispatch({ type: 'SELECT_MOVIE', payload: movie });
    navigate('player');
  };

  const handleListToggle = () => {
    const movieId = Number(currentItem.id);
    if (inWatchlist) {
      dispatch({ type: 'REMOVE_FROM_WATCHLIST', payload: movieId });
    } else {
      dispatch({
        type: 'ADD_TO_WATCHLIST',
        payload: {
          movieId,
          title: currentItem.title,
          image: currentItem.image,
          vid: currentItem.vid,
          playingurl: currentItem.playingUrl,
          vj: '',
          ldur: '',
          addedAt: Date.now(),
        },
      });
    }
  };

  return (
    <div className="relative w-full h-[55vh] sm:h-[60vh] md:h-[75vh] lg:h-[85vh] overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          {/* Background image */}
          {!imgError && currentItem.image ? (
            <Image
              src={currentItem.image}
              alt={currentItem.title}
              fill
              className="object-cover"
              priority
              sizes="100vw"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1A1A1A] via-[#141414] to-[#0A0A0A]" />
          )}

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-[#0A0A0A]/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/90 via-[#0A0A0A]/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[#0A0A0A] to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="absolute bottom-12 sm:bottom-16 md:bottom-24 left-4 md:left-12 right-4 md:right-12 z-10">
        <motion.div
          key={`content-${currentIndex}`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-xl"
        >
          {/* Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-[#E50914] px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider">
              Featured
            </span>
            <span className="text-white/60 text-xs">Stream. Discover. Enjoy.</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-2 md:mb-4 leading-tight drop-shadow-lg">
            {currentItem.title}
          </h1>

          {/* Description */}
          <p className="text-white/70 text-sm md:text-base mb-4 md:mb-6 line-clamp-2 md:line-clamp-3 max-w-lg">
            {currentItem.description}
          </p>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlay}
              className="flex items-center gap-2 bg-[#E50914] hover:bg-[#ff1a25] text-white px-5 md:px-8 py-2.5 md:py-3 rounded-lg font-semibold text-sm md:text-base transition-colors"
            >
              <Play className="w-5 h-5" fill="white" />
              Play Now
            </button>
            <button
              onClick={handleListToggle}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-medium text-sm transition-colors"
            >
              {inWatchlist ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              My List
            </button>
            <button
              className="hidden md:flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-2.5 rounded-lg transition-colors"
              aria-label="More info"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Navigation arrows (desktop) */}
      {items.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors z-20"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors z-20"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {items.length > 1 && (
        <div className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrentIndex(i); setImgError(false); }}
              className={`h-1 rounded-full transition-all ${
                i === currentIndex ? 'w-6 bg-[#E50914]' : 'w-2 bg-white/40'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
