/* PStream Downloads Page — Offline content management */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Trash2, Play, Pause, Check, Wifi, WifiOff,
  HardDrive, AlertCircle, Settings, Search, FolderOpen,
  RefreshCw, ChevronRight, X, Monitor, Film
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { DownloadItem } from '@/lib/types';

// ─── Demo Downloads ───────────────────────────────────────────────
function generateDemoDownloads(): DownloadItem[] {
  const now = Date.now();
  return [
    {
      movieId: 101, title: 'Kampala Nights S2E1', image: 'kampala1',
      vid: 'v101', size: '245 MB', downloadedAt: now - 1000 * 60 * 30,
      progress: 100, status: 'completed',
    },
    {
      movieId: 102, title: 'The Pearl of Africa', image: 'pearl1',
      vid: 'v102', size: '380 MB', downloadedAt: now - 1000 * 60 * 60 * 2,
      progress: 100, status: 'completed',
    },
    {
      movieId: 103, title: 'East Africa Stories E5', image: 'eastafrica1',
      vid: 'v103', size: '310 MB', downloadedAt: now - 1000 * 60 * 60 * 5,
      progress: 100, status: 'completed',
    },
    {
      movieId: 104, title: 'Love in Jinja', image: 'jinja1',
      vid: 'v104', size: '290 MB', downloadedAt: now - 1000 * 60 * 60 * 12,
      progress: 100, status: 'expired',
    },
    {
      movieId: 105, title: 'Mountain Warriors', image: 'mountain1',
      vid: 'v105', size: '420 MB', downloadedAt: now - 1000 * 60 * 60 * 24,
      progress: 100, status: 'completed',
    },
    {
      movieId: 106, title: 'The Karamoja Chronicles', image: 'karamoja1',
      vid: 'v106', size: '350 MB', downloadedAt: now,
      progress: 67, status: 'downloading',
    },
  ];
}

type SortOption = 'recent' | 'name' | 'size' | 'status';
type FilterOption = 'all' | 'completed' | 'downloading' | 'expired';

export default function DownloadsPage() {
  const { dispatch, navigate } = useAppStore();
  const [downloads, setDownloads] = useState<DownloadItem[]>(generateDemoDownloads);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDownloads = useMemo(() => {
    let filtered = [...downloads];

    // Filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(d => d.status === filterBy);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(d => d.title.toLowerCase().includes(q));
    }

    // Sort
    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => b.downloadedAt - a.downloadedAt);
        break;
      case 'name':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'size':
        filtered.sort((a, b) => parseInt(b.size) - parseInt(a.size));
        break;
      case 'status':
        filtered.sort((a, b) => {
          const order = { downloading: 0, completed: 1, expired: 2, paused: 3 };
          return (order[a.status] ?? 4) - (order[b.status] ?? 4);
        });
        break;
    }

    return filtered;
  }, [downloads, sortBy, filterBy, searchQuery]);

  const totalSize = useMemo(() => {
    return downloads
      .filter(d => d.status === 'completed' || d.status === 'downloading')
      .reduce((sum, d) => sum + parseInt(d.size), 0);
  }, [downloads]);

  const completedCount = useMemo(() => downloads.filter(d => d.status === 'completed').length, [downloads]);
  const downloadingCount = useMemo(() => downloads.filter(d => d.status === 'downloading').length, [downloads]);
  const expiredCount = useMemo(() => downloads.filter(d => d.status === 'expired').length, [downloads]);

  const handleDelete = useCallback((movieId: number) => {
    setDownloads(prev => prev.filter(d => d.movieId !== movieId));
  }, []);

  const handleDeleteAllCompleted = useCallback(() => {
    setDownloads(prev => prev.filter(d => d.status !== 'completed'));
  }, []);

  const handleRetryExpired = useCallback((movieId: number) => {
    setDownloads(prev => prev.map(d =>
      d.movieId === movieId ? { ...d, status: 'downloading' as const, progress: 0 } : d
    ));
  }, []);

  const handlePlay = useCallback((item: DownloadItem) => {
    const movie = {
      id: item.movieId,
      subscriber: '', paid: '', title: item.title, image: item.image,
      vj: '', vid: item.vid, ldur: '', state: '', category_id: 0,
      playingurl: '',
    };
    dispatch({ type: 'SELECT_MOVIE', payload: movie });
    navigate('player');
  }, [dispatch, navigate]);

  const formatSize = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb} MB`;
  };

  const getStatusBadge = (status: DownloadItem['status']) => {
    switch (status) {
      case 'completed':
        return <span className="flex items-center gap-1 text-green-400 text-xs"><Check className="w-3 h-3" /> Ready</span>;
      case 'downloading':
        return <span className="flex items-center gap-1 text-blue-400 text-xs"><Download className="w-3 h-3 animate-bounce" /> Downloading</span>;
      case 'expired':
        return <span className="flex items-center gap-1 text-orange-400 text-xs"><AlertCircle className="w-3 h-3" /> Expired</span>;
      case 'paused':
        return <span className="flex items-center gap-1 text-yellow-400 text-xs"><Pause className="w-3 h-3" /> Paused</span>;
    }
  };

  const getImageUrl = (image: string) => {
    if (image.startsWith('http')) return image;
    return `https://munoapp.org/munowatch-api/laba/yo/naki/${image}.jpg`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="pt-20 px-4 md:px-12 pb-24 md:pb-8"
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-xl md:text-2xl font-bold">Downloads</h1>
            <p className="text-white/50 text-sm mt-1">Watch offline, anytime, anywhere</p>
          </div>
          {downloads.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#1A1A1A] rounded-lg px-3 py-1.5">
                <HardDrive className="w-3.5 h-3.5 text-white/40" />
                <span className="text-white/60 text-xs">{formatSize(totalSize)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Stats cards */}
        {downloads.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="bg-[#1A1A1A] rounded-xl p-3 text-center">
              <p className="text-white text-lg font-bold">{completedCount}</p>
              <p className="text-white/40 text-[10px]">Completed</p>
            </div>
            <div className="bg-[#1A1A1A] rounded-xl p-3 text-center">
              <p className="text-white text-lg font-bold">{downloadingCount}</p>
              <p className="text-white/40 text-[10px]">Downloading</p>
            </div>
            <div className="bg-[#1A1A1A] rounded-xl p-3 text-center">
              <p className="text-white text-lg font-bold">{expiredCount}</p>
              <p className="text-white/40 text-[10px]">Expired</p>
            </div>
          </div>
        )}

        {/* Storage info */}
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/5 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-white/50" />
              <span className="text-white/70 text-xs font-medium">Storage Used</span>
            </div>
            <span className="text-white/50 text-xs">{formatSize(totalSize)} used</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
              style={{ width: `${Math.min((totalSize / 2048) * 100, 100)}%` }}
            />
          </div>
          <p className="text-white/30 text-[10px] mt-1">{formatSize(2048 - totalSize)} available of 2 GB</p>
        </div>

        {/* Search and filter */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search downloads..."
              className="w-full bg-[#1A1A1A] text-white placeholder:text-white/30 rounded-xl pl-10 pr-4 py-2.5 text-sm border border-white/10 focus:outline-none focus:border-[#E50914]/50"
            />
          </div>
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as FilterOption)}
            className="bg-[#1A1A1A] text-white text-sm rounded-xl px-3 border border-white/10 focus:outline-none appearance-none cursor-pointer"
          >
            <option value="all">All</option>
            <option value="completed">Completed</option>
            <option value="downloading">Downloading</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/40 text-xs">{filteredDownloads.length} downloads</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-transparent text-white/50 text-xs focus:outline-none cursor-pointer"
          >
            <option value="recent">Most Recent</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
            <option value="status">Status</option>
          </select>
        </div>

        {/* Download list */}
        {filteredDownloads.length > 0 ? (
          <div className="space-y-2">
            {filteredDownloads.map((item, index) => (
              <motion.div
                key={item.movieId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center gap-3 bg-[#1A1A1A] hover:bg-[#222] rounded-xl p-3 transition-colors group"
              >
                {/* Thumbnail */}
                <div className="w-20 h-14 rounded-lg overflow-hidden bg-[#252525] flex-shrink-0 relative cursor-pointer" onClick={() => item.status === 'completed' && handlePlay(item)}>
                  <img
                    src={getImageUrl(item.image)}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  {item.status === 'completed' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-5 h-5 text-white" fill="white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-white text-sm font-medium line-clamp-1">{item.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(item.status)}
                    <span className="text-white/30 text-[10px]">{item.size}</span>
                  </div>

                  {/* Progress bar for downloading items */}
                  {item.status === 'downloading' && (
                    <div className="mt-2 w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Time info */}
                  <p className="text-white/30 text-[10px] mt-1">
                    {new Date(item.downloadedAt).toLocaleDateString('en-UG', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {item.status === 'completed' && (
                    <button
                      onClick={() => handlePlay(item)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      aria-label="Play"
                    >
                      <Play className="w-4 h-4 text-[#E50914]" />
                    </button>
                  )}
                  {item.status === 'expired' && (
                    <button
                      onClick={() => handleRetryExpired(item.movieId)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      aria-label="Retry download"
                    >
                      <RefreshCw className="w-4 h-4 text-white/50" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item.movieId)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors opacity-50 group-hover:opacity-100"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-white/50 hover:text-[#E50914]" />
                  </button>
                </div>
              </motion.div>
            ))}

            {/* Batch actions */}
            {completedCount > 1 && (
              <button
                onClick={handleDeleteAllCompleted}
                className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/70 rounded-xl p-3 text-sm transition-colors mt-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete all completed ({completedCount})
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center mb-4">
              <FolderOpen className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-white/60 text-base font-medium mb-1">
              {searchQuery || filterBy !== 'all' ? 'No matching downloads' : 'No downloads yet'}
            </p>
            <p className="text-white/30 text-sm">
              {searchQuery || filterBy !== 'all'
                ? 'Try a different filter or search term'
                : 'Download movies and series to watch offline'
              }
            </p>
          </div>
        )}

        {/* Download settings info */}
        <div className="mt-6 bg-[#1A1A1A] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-4 h-4 text-white/50" />
            <span className="text-white/70 text-sm font-medium">Download Settings</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white/40 text-xs">Download Quality</span>
              <span className="text-white/60 text-xs font-medium">Standard (480p)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/40 text-xs">Wi-Fi Only</span>
              <span className="text-white/60 text-xs font-medium">On</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/40 text-xs">Auto-Delete Expired</span>
              <span className="text-white/60 text-xs font-medium">On (after 7 days)</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
