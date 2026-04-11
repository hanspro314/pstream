/* PStream Skeleton Card — Loading placeholder */

'use client';

import React from 'react';

interface SkeletonCardProps {
  className?: string;
}

export default function SkeletonCard({ className = '' }: SkeletonCardProps) {
  return (
    <div
      className={`bg-[#1A1A1A] rounded-lg overflow-hidden animate-pulse ${className}`}
    >
      <div className="w-full aspect-[2/3] bg-[#222]" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-[#222] rounded w-3/4" />
        <div className="h-2 bg-[#222] rounded w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonRow({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} className="min-w-[140px] max-w-[140px]" />
      ))}
    </div>
  );
}

export function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonBanner() {
  return (
    <div className="w-full h-[50vh] md:h-[70vh] bg-[#1A1A1A] animate-pulse rounded-b-2xl" />
  );
}

export function SkeletonDetail() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="w-full aspect-video bg-[#1A1A1A] rounded-xl" />
      <div className="space-y-3 p-4">
        <div className="h-6 bg-[#222] rounded w-2/3" />
        <div className="h-4 bg-[#222] rounded w-1/3" />
        <div className="h-4 bg-[#222] rounded w-full" />
        <div className="h-4 bg-[#222] rounded w-5/6" />
      </div>
    </div>
  );
}
