/**
 * BSD-CUSTOMER-INTELLIGENCE-CONTRACT-v1.0-FROZEN
 * Skeleton UI for Customer Intelligence Loading State
 */

import React from 'react';

export const CustomerSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-slate-800/80 rounded-xl" />
          <div className="h-4 w-96 bg-slate-800/50 rounded-lg" />
        </div>
        <div className="h-10 w-36 bg-slate-800/70 rounded-xl" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-obsidian-900 border border-slate-800 rounded-2xl p-4.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-slate-800 rounded" />
              <div className="w-8 h-8 rounded-xl bg-slate-800" />
            </div>
            <div className="h-6 w-28 bg-slate-800 rounded-lg" />
            <div className="h-3 w-32 bg-slate-800/60 rounded" />
          </div>
        ))}
      </div>

      {/* Filter Bar Skeleton */}
      <div className="bg-obsidian-900 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 justify-between">
          <div className="h-9 flex-1 bg-slate-800/70 rounded-xl" />
          <div className="h-9 w-64 bg-slate-800/70 rounded-xl" />
        </div>
        <div className="h-6 w-80 bg-slate-800/50 rounded-lg" />
      </div>

      {/* Table Skeleton */}
      <div className="bg-obsidian-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="h-8 w-full bg-slate-800/60 rounded-xl" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-12 w-full bg-slate-800/40 rounded-xl" />
        ))}
      </div>
    </div>
  );
};
