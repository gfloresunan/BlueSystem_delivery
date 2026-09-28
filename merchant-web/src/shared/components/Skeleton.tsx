import React from 'react';

export const SkeletonText: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => (
  <div className={`bg-slate-800/60 rounded-md animate-pulse ${className}`} />
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-obsidian-900 border border-slate-800/80 p-5 rounded-xl space-y-4 animate-pulse ${className}`}>
    <div className="flex items-center justify-between">
      <SkeletonText className="h-3 w-28" />
      <div className="w-8 h-8 rounded-lg bg-slate-800/80" />
    </div>
    <SkeletonText className="h-7 w-36" />
    <SkeletonText className="h-3 w-24" />
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="bg-obsidian-900 border border-slate-800 rounded-xl overflow-hidden animate-pulse">
    <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
      <SkeletonText className="h-5 w-40" />
      <SkeletonText className="h-8 w-24 rounded-lg" />
    </div>
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
          <div className="space-y-2">
            <SkeletonText className="h-4 w-48" />
            <SkeletonText className="h-3 w-32" />
          </div>
          <SkeletonText className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonChart: React.FC = () => (
  <div className="bg-obsidian-900 border border-slate-800 p-5 rounded-xl space-y-4 animate-pulse">
    <div className="flex items-center justify-between">
      <SkeletonText className="h-5 w-48" />
      <SkeletonText className="h-4 w-20" />
    </div>
    <div className="h-44 flex items-end gap-3 pt-6">
      {[40, 65, 30, 85, 50, 95, 70, 60, 45, 80].map((height, i) => (
        <div
          key={i}
          className="flex-1 bg-slate-800/60 rounded-t-md transition-all"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  </div>
);
