import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function LoadingSpinner({ text = 'Processing data...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 animate-fade-in">
      <div className="relative">
        <div className="w-10 h-10 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
        <div className="w-6 h-6 border-2 border-indigo-400/20 border-b-indigo-400 rounded-full animate-spin absolute inset-2" />
      </div>
      <p className="text-xs text-[#9aa0b8] font-medium tracking-wide">{text}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4 animate-fade-in">
      <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-3 text-rose-400">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold text-white mb-1">Failed to Load Analytics</h4>
      <p className="text-xs text-[#9aa0b8] max-w-md mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg transition-colors shadow-lg shadow-violet-600/20"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Request
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title = 'No data found', message = 'Try adjusting your filters or search terms.' }: { title?: string; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4 animate-fade-in">
      <p className="text-sm font-semibold text-[#f1f1f8] mb-1">{title}</p>
      <p className="text-xs text-[#646a84] max-w-sm">{message}</p>
    </div>
  );
}
