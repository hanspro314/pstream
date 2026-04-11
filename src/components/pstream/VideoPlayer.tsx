/* PStream Video Player — Full custom HTML5 video player with controls */

'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipForward, SkipBack, PictureInPicture2, Loader2,
  ChevronLeft, Settings
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';

interface VideoPlayerProps {
  src: string;
  title: string;
  poster?: string;
  onBack: () => void;
}

export default function VideoPlayer({ src, title, poster, onBack }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { state, dispatch } = useAppStore();
  const selectedMovie = state.selectedMovie;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const formatTime = (time: number): string => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const h = Math.floor(time / 3600);
    const m = Math.floor((time % 3600) / 60);
    const s = Math.floor(time % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch {
      // PiP not supported
    }
  }, []);

  const seek = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, video.duration));
  }, []);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const bar = progressRef.current;
    if (!video || !bar) return;
    const rect = bar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const val = parseFloat(e.target.value);
    video.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  }, []);

  // Auto-save progress every 5 seconds
  useEffect(() => {
    if (!selectedMovie) return;
    saveIntervalRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.paused || video.currentTime < 5) return;
      dispatch({
        type: 'UPDATE_WATCH_PROGRESS',
        payload: {
          movieId: selectedMovie.id,
          title: selectedMovie.title,
          image: selectedMovie.image,
          vid: selectedMovie.vid,
          playingurl: selectedMovie.playingurl,
          vj: selectedMovie.vj,
          currentTime: video.currentTime,
          duration: video.duration,
          lastWatched: Date.now(),
        },
      });
    }, 5000);
    return () => {
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, [selectedMovie, dispatch]);

  // Save progress on unmount
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (!video || !selectedMovie || video.currentTime < 5) return;
      dispatch({
        type: 'UPDATE_WATCH_PROGRESS',
        payload: {
          movieId: selectedMovie.id,
          title: selectedMovie.title,
          image: selectedMovie.image,
          vid: selectedMovie.vid,
          playingurl: selectedMovie.playingurl,
          vj: selectedMovie.vj,
          currentTime: video.currentTime,
          duration: video.duration,
          lastWatched: Date.now(),
        },
      });
    };
  }, [selectedMovie, dispatch]);

  // Restore progress on mount
  useEffect(() => {
    if (!selectedMovie) return;
    const progress = state.watchProgress.find((w) => w.movieId === selectedMovie.id);
    if (progress && progress.currentTime > 10 && videoRef.current) {
      videoRef.current.currentTime = progress.currentTime;
    }
  }, [selectedMovie, state.watchProgress]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (state.currentView !== 'player') return;
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seek(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seek(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.volume = Math.min(videoRef.current.volume + 0.1, 1);
            setVolume(videoRef.current.volume);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.volume = Math.max(videoRef.current.volume - 0.1, 0);
            setVolume(videoRef.current.volume);
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [state.currentView, togglePlay, toggleFullscreen, toggleMute, seek]);

  // Auto-hide controls
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (isPlaying && !showVolumeSlider) {
      timeout = setTimeout(() => setShowControls(false), 3000);
    }
    return () => clearTimeout(timeout);
  }, [isPlaying, showVolumeSlider, currentTime]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative w-full aspect-video bg-black rounded-xl overflow-hidden group"
      onMouseMove={() => setShowControls(true)}
      onClick={togglePlay}
    >
      {/* Video element — only render when we have a valid src */}
      {src ? (
        <video
          ref={videoRef}
          src={src}
          poster={poster || undefined}
          className="w-full h-full object-contain"
          playsInline
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={() => {
            if (videoRef.current) {
              setCurrentTime(videoRef.current.currentTime);
              const buf = videoRef.current.buffered;
              if (buf.length > 0) {
                setBuffered(buf.end(buf.length - 1));
              }
            }
          }}
          onDurationChange={() => {
            if (videoRef.current) setDuration(videoRef.current.duration);
          }}
          onLoadedData={() => setIsLoading(false)}
          onWaiting={() => setIsLoading(true)}
          onCanPlay={() => setIsLoading(false)}
          onEnded={() => setIsPlaying(false)}
          onError={() => setIsLoading(false)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0A0A0A]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-[#E50914] animate-spin mx-auto mb-3" />
            <p className="text-white/60 text-sm">Loading stream...</p>
          </div>
        </div>
      )}

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
          <Loader2 className="w-12 h-12 text-[#E50914] animate-spin" />
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between p-3 md:p-4 bg-gradient-to-b from-black/80 to-transparent">
          <button
            onClick={(e) => { e.stopPropagation(); onBack(); }}
            className="flex items-center gap-2 text-white hover:text-[#E50914] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <h3 className="text-white text-sm font-medium line-clamp-1 px-4">{title}</h3>
          <div className="w-20" />
        </div>

        {/* Center play button */}
        <div className="flex items-center justify-center gap-8">
          <button
            onClick={(e) => { e.stopPropagation(); seek(-10); }}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            aria-label="Rewind 10s"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#E50914]/90 flex items-center justify-center text-white hover:bg-[#E50914] transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7" fill="white" />
            ) : (
              <Play className="w-7 h-7 ml-1" fill="white" />
            )}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); seek(10); }}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            aria-label="Forward 10s"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom bar */}
        <div className="p-3 md:p-4 bg-gradient-to-t from-black/80 to-transparent">
          {/* Progress bar */}
          <div
            ref={progressRef}
            onClick={(e) => { e.stopPropagation(); handleProgressClick(e); }}
            className="relative w-full h-1.5 bg-white/20 rounded-full cursor-pointer group/progress hover:h-2.5 transition-all mb-3"
          >
            {/* Buffered */}
            <div
              className="absolute top-0 left-0 h-full bg-white/30 rounded-full"
              style={{ width: `${bufferedPercent}%` }}
            />
            {/* Progress */}
            <div
              className="absolute top-0 left-0 h-full bg-[#E50914] rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-[#E50914] rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity"
              style={{ left: `${progressPercent}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                className="text-white hover:text-[#E50914] transition-colors"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>

              {/* Volume */}
              <div
                className="flex items-center gap-1"
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                  className="text-white hover:text-[#E50914] transition-colors"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
                <div
                  className={`overflow-hidden transition-all duration-200 ${
                    showVolumeSlider ? 'w-20 opacity-100' : 'w-0 opacity-0'
                  }`}
                >
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => { e.stopPropagation(); handleVolumeChange(e); }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full h-1 accent-[#E50914] cursor-pointer"
                    aria-label="Volume"
                  />
                </div>
              </div>

              <span className="text-white/70 text-xs font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); togglePiP(); }}
                className="text-white hover:text-[#E50914] transition-colors hidden md:block"
                aria-label="Picture in Picture"
              >
                <PictureInPicture2 className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                className="text-white hover:text-[#E50914] transition-colors"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
