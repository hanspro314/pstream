/* PStream Video Player — Full-featured HTML5 video player with modern streaming controls */

'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipForward, SkipBack, PictureInPicture2, Loader2,
  ChevronLeft, Settings, Subtitles, BarChart3, X,
  List, FastForward, Captions
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import type { Episode } from '@/lib/types';

// ─── Types ───────────────────────────────────────────────────────
interface VideoPlayerProps {
  src: string;
  title: string;
  poster?: string;
  onBack: () => void;
  episodeList?: Episode[];
  currentEpisodeIndex?: number;
  onEpisodeChange?: (index: number) => void;
  movieId?: number;
}

type QualityOption = 'auto' | '1080p' | '720p' | '480p' | '360p';
type SpeedOption = '0.5' | '0.75' | '1' | '1.25' | '1.5' | '1.75' | '2';
type SubtitleLang = 'off' | 'en' | 'lg' | 'sw' | 'ar';

interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

// ─── Sample Subtitle Tracks (WebVTT-style) ───────────────────────
const subtitleData: Record<string, SubtitleCue[]> = {
  en: [
    { start: 0, end: 4, text: 'Welcome to PStream — your home for African entertainment.' },
    { start: 5, end: 9, text: 'In a world where stories connect us all...' },
    { start: 10, end: 14, text: 'One voice rises above the rest.' },
    { start: 15, end: 19, text: 'This is the journey of courage and hope.' },
    { start: 20, end: 25, text: 'Set against the beautiful landscapes of East Africa.' },
    { start: 30, end: 35, text: 'She never expected to find love here.' },
    { start: 40, end: 45, text: 'But fate had other plans.' },
    { start: 50, end: 55, text: 'The village elders gathered under the mango tree.' },
    { start: 60, end: 65, text: '"We must protect what is ours," the chief declared.' },
    { start: 70, end: 76, text: 'Music filled the air as children danced in the rain.' },
    { start: 80, end: 86, text: 'Every sunset brought a new beginning.' },
    { start: 90, end: 96, text: '"I believe in you," she whispered.' },
    { start: 100, end: 106, text: 'The journey continues in the next episode...' },
    { start: 110, end: 118, text: 'Stay tuned for more drama, love, and adventure.' },
    { start: 125, end: 132, text: 'Previously on our show...' },
    { start: 135, end: 142, text: 'Let\'s recap what happened last week.' },
    { start: 150, end: 158, text: 'The season finale approaches. Don\'t miss it!' },
    { start: 165, end: 175, text: 'Thank you for watching on PStream.' },
    { start: 180, end: 190, text: 'Credits roll...' },
  ],
  lg: [
    { start: 0, end: 4, text: 'Mukwano ogw\'ennyanja — Ennyimba ez\'omubiri.' },
    { start: 5, end: 9, text: 'Mu nsi eya bugwanjuba...' },
    { start: 10, end: 14, text: 'Endobozi eyenjawulo yenna.' },
    { start: 15, end: 19, text: 'Kino ky\'olugendo lwa obumwiru.' },
    { start: 30, end: 35, text: 'Teyali amanya nti yegenda okusanga obulamu.' },
    { start: 60, end: 65, text: '"Tuffeeko ebyaffe," omukulu yagamba.' },
    { start: 90, end: 96, text: '"Nkumanya," yagamba n\'eddembe.' },
    { start: 100, end: 106, text: 'Olugendo lugenda kugenda mu kiseera ekituuka.' },
    { start: 150, end: 158, text: 'Enkomeredde ya sizoni eri ndala!' },
  ],
  sw: [
    { start: 0, end: 4, text: 'Karibu PStream — nyumbani ya burudani ya Afrika.' },
    { start: 5, end: 9, text: 'Katika dunia ambapo hadithi zetu zinaunganisha...' },
    { start: 10, end: 14, text: 'Sauti moja inaingia juu.' },
    { start: 15, end: 19, text: 'Hii ni safari ya ujasiri na matumaini.' },
    { start: 30, end: 35, text: 'Hakuwahi kutarajia kupenda hapa.' },
    { start: 60, end: 65, text: '"Tunatakiwa kulinda tulichonacho," mkuu alisema.' },
    { start: 90, end: 96, text: '"Ninaamini kwako," alisema kwa sauti ya chini.' },
    { start: 100, end: 106, text: 'Safari inaendelea kwenye kipindi kijacho...' },
    { start: 150, end: 158, text: 'Mwisho wa msimu unakaribia!' },
  ],
  ar: [
    { start: 0, end: 4, text: 'مرحباً بكم في PStream — موطن الترفيه الأفريقي.' },
    { start: 5, end: 9, text: 'في عالم تربطنا فيه القصص جميعاً...' },
    { start: 10, end: 14, text: 'صوت واحد يعلو فوق البقية.' },
    { start: 15, end: 19, text: 'هذه رحلة الشجاعة والأمل.' },
    { start: 30, end: 35, text: 'لم تتوقع أن تجد الحب هنا.' },
    { start: 60, end: 65, text: '"يجب أن نحمي ما لنا،" أعلن الزعيم.' },
    { start: 90, end: 96, text: '"أنا أؤمن بك،" همست.' },
    { start: 100, end: 106, text: 'الرحلة تستمر في الحلقة القادمة...' },
    { start: 150, end: 158, text: 'الموسم الموسمي يقترب!' },
  ],
};

// ─── Skip Segments (mock timestamps in seconds) ──────────────────
const SKIP_SEGMENTS = {
  intro: { start: 0, end: 120, label: 'Skip Intro' },
  recap: { start: 120, end: 180, label: 'Skip Recap' },
  credits: { start: -60, end: 0, label: 'Skip Credits' },
};

// ─── Speed Options ───────────────────────────────────────────────
const SPEED_OPTIONS: { value: SpeedOption; label: string }[] = [
  { value: '0.5', label: '0.5x' },
  { value: '0.75', label: '0.75x' },
  { value: '1', label: 'Normal' },
  { value: '1.25', label: '1.25x' },
  { value: '1.5', label: '1.5x' },
  { value: '1.75', label: '1.75x' },
  { value: '2', label: '2x' },
];

const QUALITY_OPTIONS: { value: QualityOption; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: '1080p', label: '1080p' },
  { value: '720p', label: '720p' },
  { value: '480p', label: '480p' },
  { value: '360p', label: '360p' },
];

const SUBTITLE_OPTIONS: { value: SubtitleLang; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'en', label: 'English' },
  { value: 'lg', label: 'Luganda' },
  { value: 'sw', label: 'Swahili' },
  { value: 'ar', label: 'Arabic' },
];

// ─── Helper: Load from localStorage ──────────────────────────────
function loadPref<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(`pstream_player_${key}`);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function savePref(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`pstream_player_${key}`, JSON.stringify(value));
  } catch { /* quota */ }
}

// ─── Component ───────────────────────────────────────────────────
export default function VideoPlayer({
  src,
  title,
  poster,
  onBack,
  episodeList,
  currentEpisodeIndex,
  onEpisodeChange,
  movieId,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipAutoHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const statsTapRef = useRef<{ count: number; timer: ReturnType<typeof setTimeout> | null }>({ count: 0, timer: null });
  const isTouchRef = useRef(false);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { state, dispatch } = useAppStore();
  const selectedMovie = state.selectedMovie;
  const userSettings = state.profile.settings;

  // ─── State: Core Player ──────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(() => loadPref('volume', 1));
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // ─── State: Settings ─────────────────────────────────────────
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // Auto-play when src changes
  useEffect(() => {
    if (!src) return;
    console.log('[PStream] VideoPlayer src set:', src.substring(0, 80));
    const video = videoRef.current;
    if (!video) return;
    // Small delay to ensure the video element has loaded the src
    const timer = setTimeout(() => {
      video.play().then(() => {
        console.log('[PStream] Auto-play started successfully');
      }).catch((err) => {
        console.log('[PStream] Auto-play blocked (normal for browsers), user can click play:', err.message);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [src]);
  const [quality, setQuality] = useState<QualityOption>(() => loadPref<QualityOption>('quality', 'auto'));
  const [speed, setSpeed] = useState<SpeedOption>(() => loadPref<SpeedOption>('speed', '1'));
  const [subtitleLang, setSubtitleLang] = useState<SubtitleLang>(() => loadPref<SubtitleLang>('subtitleLang', 'off'));

  // ─── State: Next Episode / Autoplay ──────────────────────────
  const [showNextEpisode, setShowNextEpisode] = useState(false);
  const [countdown, setCountdown] = useState(10);

  // ─── State: Double-Tap Seek ──────────────────────────────────
  const [seekAnimation, setSeekAnimation] = useState<'left' | 'right' | null>(null);

  // ─── State: Skip Buttons ────────────────────────────────────
  const [skipButton, setSkipButton] = useState<'intro' | 'recap' | 'credits' | null>(null);
  const [skipVisible, setSkipVisible] = useState(false);

  // ─── State: Stats Overlay ────────────────────────────────────
  const [showStats, setShowStats] = useState(false);

  // ─── State: Video Resolution (for stats) ────────────────────
  const [videoResolution, setVideoResolution] = useState('N/A');

  // ─── State: Episode Playlist ─────────────────────────────────
  const [showPlaylist, setShowPlaylist] = useState(false);

  // ─── Computed: Next episode info ────────────────────────────
  const nextEpisode = useMemo(() => {
    if (!episodeList || currentEpisodeIndex === undefined) return null;
    if (currentEpisodeIndex < episodeList.length - 1) {
      return episodeList[currentEpisodeIndex + 1];
    }
    return null;
  }, [episodeList, currentEpisodeIndex]);

  const hasNextEpisode = !!nextEpisode;

  // ─── Computed: Current subtitle cue ─────────────────────────
  const currentCue = useMemo(() => {
    if (subtitleLang === 'off') return null;
    const cues = subtitleData[subtitleLang];
    if (!cues) return null;
    return cues.find(c => currentTime >= c.start && currentTime <= c.end) || null;
  }, [currentTime, subtitleLang]);

  // ─── Computed: Subtitle font size ───────────────────────────
  const subtitleFontSize = useMemo(() => {
    const size = userSettings.subtitleSize || 'medium';
    switch (size) {
      case 'small': return 'text-sm';
      case 'large': return 'text-2xl';
      default: return 'text-lg';
    }
  }, [userSettings.subtitleSize]);

  // ─── Helpers ─────────────────────────────────────────────────
  const formatTime = (time: number): string => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const h = Math.floor(time / 3600);
    const m = Math.floor((time % 3600) / 60);
    const s = Math.floor(time % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const clearControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
  }, []);

  const resetControlsTimeout = useCallback(() => {
    clearControlsTimeout();
    controlsTimeoutRef.current = setTimeout(() => {
      if (!showSettingsMenu) setShowControls(false);
    }, 3000);
  }, [clearControlsTimeout, showSettingsMenu]);

  // ─── Player Controls ────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      console.warn('[PStream] togglePlay: video ref not available');
      return;
    }
    if (video.paused) {
      video.play().catch((err) => {
        console.error('[PStream] Play failed:', err.message);
      });
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
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, video.duration || 0));
  }, []);

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(time, video.duration || 0));
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
    savePref('volume', val);
  }, []);

  // ─── Settings Handlers ──────────────────────────────────────
  const handleQualityChange = useCallback((q: QualityOption) => {
    setQuality(q);
    savePref('quality', q);
  }, []);

  const handleSpeedChange = useCallback((s: SpeedOption) => {
    setSpeed(s);
    savePref('speed', s);
    const video = videoRef.current;
    if (video) {
      video.playbackRate = parseFloat(s);
    }
  }, []);

  const handleSubtitleLangChange = useCallback((lang: SubtitleLang) => {
    setSubtitleLang(lang);
    savePref('subtitleLang', lang);
  }, []);

  const toggleSubtitles = useCallback(() => {
    if (subtitleLang === 'off') {
      handleSubtitleLangChange('en');
    } else {
      handleSubtitleLangChange('off');
    }
  }, [subtitleLang, handleSubtitleLangChange]);

  // ─── Next Episode Handlers ──────────────────────────────────
  const handlePlayNextEpisode = useCallback(() => {
    if (!nextEpisode || onEpisodeChange === undefined || currentEpisodeIndex === undefined) return;
    if (countdownRef.current) clearInterval(countdownRef.current);
    setShowNextEpisode(false);
    setCountdown(10);
    onEpisodeChange(currentEpisodeIndex + 1);
  }, [nextEpisode, onEpisodeChange, currentEpisodeIndex]);

  const handleCancelNextEpisode = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setShowNextEpisode(false);
    setCountdown(10);
  }, []);

  // ─── Skip Button Handlers ───────────────────────────────────
  const handleSkip = useCallback((type: 'intro' | 'recap' | 'credits') => {
    const video = videoRef.current;
    if (!video) return;
    if (type === 'intro') {
      video.currentTime = SKIP_SEGMENTS.intro.end;
    } else if (type === 'recap') {
      video.currentTime = SKIP_SEGMENTS.recap.end;
    } else if (type === 'credits') {
      video.currentTime = video.duration - 1;
    }
    setSkipVisible(false);
    setSkipButton(null);
    if (skipAutoHideRef.current) clearTimeout(skipAutoHideRef.current);
  }, []);

  // ─── Touch handling (mobile) ──────────────────────────
  // Uses onTouchEnd to handle single-tap (show/hide controls) and
  // double-tap (seek ±10s) while preventing synthetic click events.
  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    // Don't handle touches on control elements (they have their own handlers)
    if ((e.target as HTMLElement).closest('[data-controls]')) return;

    const now = Date.now();
    const touch = e.changedTouches[0];
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = touch.clientX - rect.left;
    const halfWidth = rect.width / 2;
    const isLeft = x < halfWidth;

    // Mark this as a touch interaction so the synthetic onClick is ignored
    isTouchRef.current = true;

    if (now - lastTapRef.current.time < 250) {
      // Double tap detected — cancel pending single tap and seek
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      const direction = isLeft ? 'left' : 'right';
      setSeekAnimation(direction);
      seek(direction === 'left' ? -10 : 10);
      setTimeout(() => setSeekAnimation(null), 600);
      lastTapRef.current = { time: 0, x: 0 };
    } else {
      // Possible single tap — wait 250ms to distinguish from double tap
      lastTapRef.current = { time: now, x };
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
      }
      singleTapTimerRef.current = setTimeout(() => {
        singleTapTimerRef.current = null;
        // Single tap confirmed — toggle controls visibility (YouTube mobile style)
        setShowControls(prev => !prev);
      }, 250);
    }

    // Prevent browser from synthesizing a click event from this touch
    e.preventDefault();
  }, [seek]);

  // ─── Stats Toggle (7 taps or 'S' key) ──────────────────────
  const handleStatsTap = useCallback(() => {
    const newCount = statsTapRef.current.count + 1;
    statsTapRef.current.count = newCount;

    if (statsTapRef.current.timer) {
      clearTimeout(statsTapRef.current.timer);
    }

    if (newCount >= 7) {
      setShowStats(prev => !prev);
      statsTapRef.current.count = 0;
      statsTapRef.current.timer = null;
    } else {
      statsTapRef.current.timer = setTimeout(() => {
        statsTapRef.current.count = 0;
        statsTapRef.current.timer = null;
      }, 2000);
    }
  }, []);

  // ─── Effects ────────────────────────────────────────────────

  // Apply playback rate on mount and when speed changes
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = parseFloat(speed);
    }
  }, [speed]);

  // Auto-save progress every 5 seconds
  useEffect(() => {
    const mid = movieId ?? selectedMovie?.id;
    if (!mid) return;
    saveIntervalRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.paused || video.currentTime < 5) return;
      dispatch({
        type: 'UPDATE_WATCH_PROGRESS',
        payload: {
          movieId: mid,
          title: selectedMovie?.title || title,
          image: selectedMovie?.image || '',
          vid: selectedMovie?.vid || String(mid),
          playingurl: selectedMovie?.playingurl || src,
          vj: selectedMovie?.vj || '',
          currentTime: video.currentTime,
          duration: video.duration,
          lastWatched: Date.now(),
        },
      });
    }, 5000);
    return () => {
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, [movieId, selectedMovie, title, src, dispatch]);

  // Save progress on unmount
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      const mid = movieId ?? selectedMovie?.id;
      if (!video || !mid || video.currentTime < 5) return;
      dispatch({
        type: 'UPDATE_WATCH_PROGRESS',
        payload: {
          movieId: mid,
          title: selectedMovie?.title || title,
          image: selectedMovie?.image || '',
          vid: selectedMovie?.vid || String(mid),
          playingurl: selectedMovie?.playingurl || src,
          vj: selectedMovie?.vj || '',
          currentTime: video.currentTime,
          duration: video.duration,
          lastWatched: Date.now(),
        },
      });
    };
  }, [movieId, selectedMovie, title, src, dispatch]);

  // Restore progress on mount
  useEffect(() => {
    const mid = movieId ?? selectedMovie?.id;
    if (!mid) return;
    const progress = state.watchProgress.find(w => w.movieId === mid);
    if (progress && progress.currentTime > 10 && videoRef.current) {
      videoRef.current.currentTime = progress.currentTime;
    }
  }, [movieId, selectedMovie?.id, state.watchProgress]);

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
        case 'c':
          e.preventDefault();
          toggleSubtitles();
          break;
        case 's':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setShowStats(prev => !prev);
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [state.currentView, togglePlay, toggleFullscreen, toggleMute, seek, toggleSubtitles]);

  // Auto-hide controls
  useEffect(() => {
    if (isPlaying && !showVolumeSlider && !showSettingsMenu) {
      resetControlsTimeout();
    }
    return () => clearControlsTimeout();
  }, [isPlaying, showVolumeSlider, showSettingsMenu, currentTime, resetControlsTimeout, clearControlsTimeout]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Close settings menu on outside click
  useEffect(() => {
    if (!showSettingsMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
        setShowSettingsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSettingsMenu]);

  // Ref to track previous skip button for efficient updates
  const skipButtonRef = useRef<'intro' | 'recap' | 'credits' | null>(null);

  // Cleanup countdown and single-tap timer on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
    };
  }, []);

  // ─── Computed Values ────────────────────────────────────────
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;
  const showNextEpisodeBtn = hasNextEpisode && duration > 30 && currentTime >= duration - 30 && currentTime < duration - 1;
  const bufferHealth = buffered - currentTime;

  const hasEpisodes = episodeList && episodeList.length > 0;

  // ─── Circular Timer Component ──────────────────────────────
  const circumference = 2 * Math.PI * 18;

  // ─── JSX ────────────────────────────────────────────────────
  return (
    <div className="flex gap-3 items-start">
      {/* Main Video Player */}
      <div className="flex-1 min-w-0">
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative w-full aspect-video bg-black rounded-xl overflow-visible group"
          onMouseMove={() => {
            setShowControls(true);
            if (isPlaying) resetControlsTimeout();
          }}
          onTouchEnd={handleTouchEnd}
          onClick={(e) => {
            // Ignore synthetic clicks generated from touch events
            if (isTouchRef.current) {
              isTouchRef.current = false;
              return;
            }
            // If clicking on any control button, let the button handle it (they all stopPropagation)
            if ((e.target as HTMLElement).closest('[data-controls]')) return;
            // If settings menu is open, clicking outside closes it
            if (showSettingsMenu) {
              setShowSettingsMenu(false);
              return;
            }
            // Desktop: click on video area toggles play/pause (YouTube desktop style)
            setShowControls(true);
            togglePlay();
          }}
        >
          {/* Video element */}
          <div className="absolute inset-0 overflow-hidden rounded-xl">
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
                  const t = videoRef.current.currentTime;
                  const d = videoRef.current.duration;
                  setCurrentTime(t);
                  const buf = videoRef.current.buffered;
                  if (buf.length > 0) {
                    setBuffered(buf.end(buf.length - 1));
                  }
                  // Skip Intro / Recap / Credits detection
                  if (d > 0) {
                    let newSkip: 'intro' | 'recap' | 'credits' | null = null;
                    if (t >= SKIP_SEGMENTS.intro.start && t < SKIP_SEGMENTS.intro.end && d > 180) {
                      newSkip = 'intro';
                    } else if (t >= SKIP_SEGMENTS.recap.start && t < SKIP_SEGMENTS.recap.end && d > 180) {
                      newSkip = 'recap';
                    } else if (d > 60 && t >= d + SKIP_SEGMENTS.credits.start && t < d + SKIP_SEGMENTS.credits.end) {
                      newSkip = 'credits';
                    }
                    if (newSkip !== skipButtonRef.current) {
                      skipButtonRef.current = newSkip;
                      setSkipButton(newSkip);
                      setSkipVisible(!!newSkip);
                      if (skipAutoHideRef.current) clearTimeout(skipAutoHideRef.current);
                      if (newSkip) {
                        skipAutoHideRef.current = setTimeout(() => setSkipVisible(false), 5000);
                      }
                    }
                  }
                }
              }}
              onDurationChange={() => {
                if (videoRef.current) setDuration(videoRef.current.duration);
              }}
              onWaiting={() => setIsLoading(true)}
              onCanPlay={() => setIsLoading(false)}
              onEnded={() => {
                setIsPlaying(false);
                // Trigger next episode + autoplay countdown
                if (hasNextEpisode && userSettings.autoplay) {
                  setShowNextEpisode(true);
                  setCountdown(10);
                  if (countdownRef.current) clearInterval(countdownRef.current);
                  countdownRef.current = setInterval(() => {
                    setCountdown(prev => {
                      if (prev <= 1) {
                        if (countdownRef.current) clearInterval(countdownRef.current);
                        // Auto-play next episode
                        setTimeout(() => {
                          if (nextEpisode && onEpisodeChange !== undefined && currentEpisodeIndex !== undefined) {
                            onEpisodeChange(currentEpisodeIndex + 1);
                            setShowNextEpisode(false);
                          }
                        }, 100);
                        return 0;
                      }
                      return prev - 1;
                    });
                  }, 1000);
                }
              }}
              onError={(e) => {
                const video = videoRef.current;
                const detail = video
                  ? `code=${video.error?.code} msg=${video.error?.message} networkState=${video.networkState} readyState=${video.readyState}`
                  : 'no video ref';
                console.error('[PStream] Video error:', detail);
                setIsLoading(false);
                let errorMsg = 'Failed to load video.';
                if (video?.error) {
                  switch (video.error.code) {
                    case 1: errorMsg = 'Video loading was aborted.'; break;
                    case 2: errorMsg = 'Network error — the video source may be unreachable.'; break;
                    case 3: errorMsg = 'Video decoding failed — the format may not be supported by your browser.'; break;
                    case 4: errorMsg = 'Video source not supported or the URL is invalid.'; break;
                  }
                }
                setVideoError(errorMsg);
              }}
              onLoadStart={() => {
                setVideoError(null);
                setShowNextEpisode(false);
                setCountdown(10);
                setSkipButton(null);
                setSkipVisible(false);
                setShowControls(true);
                setIsLoading(true);
                setVideoResolution('N/A');
                skipButtonRef.current = null;
                if (countdownRef.current) clearInterval(countdownRef.current);
              }}
              onLoadedData={() => {
                console.log('[PStream] Video data loaded, resolution:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
                setIsLoading(false);
                setVideoError(null);
                if (videoRef.current) {
                  setVideoResolution(`${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
                }
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0A0A0A]">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-[#E50914] animate-spin mx-auto mb-3" />
                <p className="text-white/60 text-sm">Loading stream...</p>
              </div>
            </div>
          )}
          </div>

          {/* Loading spinner */}
          <AnimatePresence>
            {isLoading && !videoError && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-black/40 z-10"
              >
                <Loader2 className="w-12 h-12 text-[#E50914] animate-spin" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Video error overlay */}
          <AnimatePresence>
            {videoError && !isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-black/80 z-20"
              >
                <div className="text-center px-6">
                  <p className="text-white/80 text-sm mb-4">{videoError}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setVideoError(null);
                      // Try to reload the video
                      if (videoRef.current) {
                        videoRef.current.load();
                        videoRef.current.play().catch(() => {});
                      }
                    }}
                    className="bg-[#E50914] hover:bg-[#ff1a25] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Subtitle overlay */}
          <AnimatePresence>
            {currentCue && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-16 md:bottom-20 left-0 right-0 z-20 flex justify-center px-4 pointer-events-none"
              >
                <p
                  className={`${subtitleFontSize} text-white text-center font-medium px-3 py-1 rounded max-w-[80%]`}
                  style={{
                    textShadow: '0 0 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7), 0 2px 4px rgba(0,0,0,0.8)',
                    WebkitTextStroke: '0.5px rgba(0,0,0,0.5)',
                  }}
                >
                  {currentCue.text}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Double-tap seek animation */}
          <AnimatePresence>
            {seekAnimation && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                className="absolute top-1/2 -translate-y-1/2 z-30 pointer-events-none"
                style={{ left: seekAnimation === 'left' ? '15%' : 'auto', right: seekAnimation === 'right' ? '15%' : 'auto' }}
              >
                <div className="flex items-center gap-1 text-white text-xl font-bold">
                  {seekAnimation === 'left' ? (
                    <>
                      <span className="text-3xl">&laquo;</span>
                      <span className="text-lg">10</span>
                    </>
                  ) : (
                    <>
                      <span className="text-lg">10</span>
                      <span className="text-3xl">&raquo;</span>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Skip Intro / Recap / Credits button */}
          <AnimatePresence>
            {skipVisible && skipButton && (
              <motion.div
                initial={{ opacity: 0, x: 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 60 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="absolute bottom-20 md:bottom-24 right-3 md:right-4 z-20"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSkip(skipButton);
                  }}
                  className="flex items-center gap-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white font-semibold text-sm px-5 py-2.5 rounded-md transition-colors"
                >
                  <FastForward className="w-4 h-4" />
                  {SKIP_SEGMENTS[skipButton].label}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Video Statistics Overlay */}
          <AnimatePresence>
            {showStats && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-14 left-3 md:top-16 md:left-4 z-30 bg-black/75 backdrop-blur-sm rounded-lg p-3 text-xs font-mono text-white/90 pointer-events-none select-none min-w-[200px]"
              >
                <div className="space-y-1">
                  <div>Resolution: <span className="text-[#E50914]">{videoResolution}</span></div>
                  <div>Time: <span className="text-[#E50914]">{formatTime(currentTime)}</span> / <span className="text-white/60">{formatTime(duration)}</span></div>
                  <div>Buffer: <span className={`${bufferHealth < 2 ? 'text-yellow-400' : 'text-green-400'}`}>{bufferHealth.toFixed(1)}s</span></div>
                  <div>Quality: <span className="text-[#E50914]">{quality}</span></div>
                  <div>Speed: <span className="text-[#E50914]">{speed}x</span></div>
                  <div className="truncate">Source: <span className="text-white/50">{src ? (src.length > 40 ? src.slice(0, 40) + '...' : src) : 'N/A'}</span></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Next Episode countdown overlay */}
          <AnimatePresence>
            {showNextEpisode && nextEpisode && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 p-6 max-w-lg">
                  {/* Thumbnail */}
                  <div className="relative w-36 md:w-44 aspect-video rounded-lg overflow-hidden bg-[#1A1A1A] flex-shrink-0">
                    <img
                      src={nextEpisode.thumbnail}
                      alt={nextEpisode.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    {/* Circular countdown timer */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg viewBox="0 0 36 36" className="w-12 h-12 drop-shadow-lg">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
                        <circle
                          cx="18" cy="18" r="16" fill="none" stroke="#E50914" strokeWidth="2.5"
                          strokeDasharray={circumference}
                          strokeDashoffset={circumference * (1 - countdown / 10)}
                          strokeLinecap="round"
                          transform="rotate(-90 18 18)"
                          style={{ transition: 'stroke-dashoffset 0.5s linear' }}
                        />
                      </svg>
                      <span className="absolute text-white font-bold text-lg">{countdown}</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="text-center md:text-left">
                    <p className="text-white/60 text-sm mb-1">Next Episode</p>
                    <h4 className="text-white text-lg font-semibold mb-1 line-clamp-2">
                      {nextEpisode.title || nextEpisode.episode_name || `Episode ${nextEpisode.episode}`}
                    </h4>
                    {nextEpisode.duration && (
                      <p className="text-white/50 text-sm mb-4">{nextEpisode.duration}</p>
                    )}
                    <div className="flex items-center gap-3 justify-center md:justify-start">
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePlayNextEpisode(); }}
                        className="bg-[#E50914] hover:bg-[#E50914]/90 text-white font-semibold text-sm px-5 py-2.5 rounded-md transition-colors"
                      >
                        Watch Now
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCancelNextEpisode(); }}
                        className="bg-white/10 hover:bg-white/20 text-white text-sm px-5 py-2.5 rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls overlay */}
          <div
            data-controls
            className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 ${
              showControls && !showNextEpisode ? 'opacity-100' : 'opacity-0 pointer-events-none'
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

              <div className="flex items-center gap-2">
                {/* Next Episode quick button (shows near end of video) */}
                <AnimatePresence>
                  {showNextEpisodeBtn && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={(e) => { e.stopPropagation(); handlePlayNextEpisode(); }}
                      className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      Next Ep
                    </motion.button>
                  )}
                </AnimatePresence>

                {/* Episode playlist toggle */}
                {hasEpisodes && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowPlaylist(prev => !prev); }}
                    className="text-white hover:text-[#E50914] transition-colors"
                    aria-label="Toggle episode list"
                  >
                    <List className="w-5 h-5" />
                  </button>
                )}

                {/* Stats icon */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleStatsTap(); }}
                  className="text-white/60 hover:text-white transition-colors"
                  aria-label="Toggle video stats"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>

                <div className="w-2" />
              </div>
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
                <div className="flex items-center gap-2 md:gap-3">
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

                  {/* Speed indicator */}
                  {speed !== '1' && (
                    <span className="text-[#E50914] text-xs font-semibold hidden sm:inline">
                      {speed === '1' ? '' : `${speed}x`}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                  {/* CC / Subtitles toggle */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSubtitles(); }}
                    className={`transition-colors ${
                      subtitleLang !== 'off' ? 'text-[#E50914]' : 'text-white hover:text-[#E50914]'
                    }`}
                    aria-label={subtitleLang !== 'off' ? 'Disable subtitles' : 'Enable subtitles'}
                  >
                    {subtitleLang !== 'off' ? (
                      <Captions className="w-5 h-5" />
                    ) : (
                      <Subtitles className="w-5 h-5" />
                    )}
                  </button>

                  {/* PiP */}
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePiP(); }}
                    className="text-white hover:text-[#E50914] transition-colors hidden md:block"
                    aria-label="Picture in Picture"
                  >
                    <PictureInPicture2 className="w-5 h-5" />
                  </button>

                  {/* Settings gear */}
                  <div className="relative" ref={settingsMenuRef}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowSettingsMenu(prev => !prev); resetControlsTimeout(); }}
                      className={`transition-colors ${showSettingsMenu ? 'text-[#E50914]' : 'text-white hover:text-[#E50914]'}`}
                      aria-label="Settings"
                    >
                      <Settings className="w-5 h-5" />
                    </button>

                    {/* Settings Menu Popup */}
                    <AnimatePresence>
                      {showSettingsMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute bottom-full right-0 mb-2 w-56 bg-[#1A1A1A] border border-white/10 rounded-lg shadow-2xl z-50 custom-scrollbar"
                          style={{ maxHeight: 'min(50vh, 350px)', overflowY: 'auto' }}
                        >
                          {/* Quality Section */}
                          <div className="p-3 border-b border-white/10">
                            <h4 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Quality</h4>
                            <div className="space-y-1">
                              {QUALITY_OPTIONS.map(opt => (
                                <button
                                  key={opt.value}
                                  onClick={(e) => { e.stopPropagation(); handleQualityChange(opt.value); }}
                                  className="flex items-center justify-between w-full px-2 py-1.5 rounded text-sm hover:bg-white/10 transition-colors"
                                >
                                  <span className="text-white">{opt.label}</span>
                                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                                    quality === opt.value ? 'border-[#E50914]' : 'border-white/30'
                                  }`}>
                                    {quality === opt.value && (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-2 h-2 rounded-full bg-[#E50914]"
                                      />
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Speed Section */}
                          <div className="p-3 border-b border-white/10">
                            <h4 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Speed</h4>
                            <div className="space-y-1">
                              {SPEED_OPTIONS.map(opt => (
                                <button
                                  key={opt.value}
                                  onClick={(e) => { e.stopPropagation(); handleSpeedChange(opt.value); }}
                                  className="flex items-center justify-between w-full px-2 py-1.5 rounded text-sm hover:bg-white/10 transition-colors"
                                >
                                  <span className="text-white">{opt.label}</span>
                                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                                    speed === opt.value ? 'border-[#E50914]' : 'border-white/30'
                                  }`}>
                                    {speed === opt.value && (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-2 h-2 rounded-full bg-[#E50914]"
                                      />
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Subtitles Section */}
                          <div className="p-3">
                            <h4 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Subtitles</h4>
                            <div className="space-y-1">
                              {SUBTITLE_OPTIONS.map(opt => (
                                <button
                                  key={opt.value}
                                  onClick={(e) => { e.stopPropagation(); handleSubtitleLangChange(opt.value); }}
                                  className="flex items-center justify-between w-full px-2 py-1.5 rounded text-sm hover:bg-white/10 transition-colors"
                                >
                                  <span className="text-white">{opt.label}</span>
                                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                                    subtitleLang === opt.value ? 'border-[#E50914]' : 'border-white/30'
                                  }`}>
                                    {subtitleLang === opt.value && (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-2 h-2 rounded-full bg-[#E50914]"
                                      />
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Fullscreen */}
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

        {/* Mobile episode playlist overlay */}
        <AnimatePresence>
          {hasEpisodes && showPlaylist && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="lg:hidden mt-3 overflow-hidden"
            >
              <div className="bg-[#141414] rounded-xl border border-white/10 p-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-semibold text-sm">Episodes</h4>
                  <button
                    onClick={() => setShowPlaylist(false)}
                    className="text-white/50 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar">
                  {episodeList!.map((ep, idx) => (
                    <button
                      key={ep.id}
                      onClick={() => {
                        if (onEpisodeChange !== undefined) onEpisodeChange(idx);
                        setShowPlaylist(false);
                      }}
                      className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors text-left ${
                        idx === currentEpisodeIndex
                          ? 'bg-[#E50914]/15 border border-[#E50914]/50'
                          : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="relative w-28 flex-shrink-0 aspect-video rounded overflow-hidden bg-[#1A1A1A]">
                        <img
                          src={ep.thumbnail}
                          alt={ep.title || ep.episode_name || `Episode ${ep.episode}`}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        {idx === currentEpisodeIndex && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <div className="flex gap-0.5 items-end h-3">
                              <div className="w-0.5 bg-[#E50914] animate-pulse" style={{ height: '40%' }} />
                              <div className="w-0.5 bg-[#E50914] animate-pulse" style={{ height: '70%', animationDelay: '0.1s' }} />
                              <div className="w-0.5 bg-[#E50914] animate-pulse" style={{ height: '50%', animationDelay: '0.2s' }} />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium line-clamp-2">
                          {ep.title || ep.episode_name || `Episode ${ep.episode}`}
                        </p>
                        <p className="text-white/50 text-xs mt-0.5">
                          {ep.duration || `${ep.episode} min`}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop Episode Playlist Sidebar */}
      <AnimatePresence>
        {hasEpisodes && showPlaylist && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
            className="hidden lg:block w-64 xl:w-72 flex-shrink-0"
          >
            <div className="bg-[#141414] rounded-xl border border-white/10 sticky top-20">
              <div className="flex items-center justify-between p-3 border-b border-white/10">
                <h4 className="text-white font-semibold text-sm">Episodes</h4>
                <button
                  onClick={() => setShowPlaylist(false)}
                  className="text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar">
                {episodeList!.map((ep, idx) => (
                  <button
                    key={ep.id}
                    onClick={() => {
                      if (onEpisodeChange !== undefined) onEpisodeChange(idx);
                    }}
                    className={`flex items-center gap-3 w-full p-3 text-left transition-colors border-b border-white/5 last:border-b-0 ${
                      idx === currentEpisodeIndex
                        ? 'bg-[#E50914]/10'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="relative w-24 flex-shrink-0 aspect-video rounded overflow-hidden bg-[#1A1A1A]">
                      <img
                        src={ep.thumbnail}
                        alt={ep.title || ep.episode_name || `Episode ${ep.episode}`}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      {idx === currentEpisodeIndex && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="flex gap-0.5 items-end h-3">
                            <div className="w-0.5 bg-[#E50914] animate-pulse" style={{ height: '40%' }} />
                            <div className="w-0.5 bg-[#E50914] animate-pulse" style={{ height: '70%', animationDelay: '0.1s' }} />
                            <div className="w-0.5 bg-[#E50914] animate-pulse" style={{ height: '50%', animationDelay: '0.2s' }} />
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[10px] px-1 rounded">
                        {ep.duration}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium line-clamp-2 ${idx === currentEpisodeIndex ? 'text-[#E50914]' : 'text-white'}`}>
                        {ep.title || ep.episode_name || `Episode ${ep.episode}`}
                      </p>
                      {ep.season && (
                        <p className="text-white/40 text-xs mt-0.5">S{ep.season} E{ep.episode}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
