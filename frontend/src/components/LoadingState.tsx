import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export function LoadingSpinner({ text = 'Querying MapReduce analytics...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 animate-fade-in">
      <div className="relative">
        <div className="w-9 h-9 border-2 border-[#282A30] border-t-[#F4B860] rounded-full animate-spin" />
        <div className="w-5 h-5 border-2 border-[#282A30] border-b-[#2DD4BF] rounded-full animate-spin absolute inset-2" />
      </div>
      <p className="text-xs text-[#A1A1AA] font-medium tracking-wide">{text}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4 animate-fade-in">
      <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3 text-red-400">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold text-[#F4F4F5] mb-1">Failed to Load Analytics</h4>
      <p className="text-xs text-[#A1A1AA] max-w-md mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#F4B860] hover:bg-[#F6C47B] text-[#101114] text-xs font-semibold rounded-lg transition-colors shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Request
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title = 'No movies or records found',
  message = 'Try adjusting your search criteria, rating thresholds, or genre filters.'
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4 rounded-xl border border-dashed border-[#282A30] bg-[#191B20]/40 animate-fade-in">
      <p className="text-sm font-semibold text-[#F4F4F5] mb-1">{title}</p>
      <p className="text-xs text-[#A1A1AA] max-w-sm">{message}</p>
    </div>
  );
}
