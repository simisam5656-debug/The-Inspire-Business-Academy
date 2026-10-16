/**
 * AiEnhanceButton — inline ✨ button that triggers AI field enhancement.
 *
 * Shows a suggestion bubble with Accept / Dismiss controls.
 */
import React from 'react';
import { Sparkles, Check, X, Loader2, AlertCircle } from 'lucide-react';

interface Props {
  /** Current field value to enhance */
  value: string;
  /** Called when admin accepts the suggestion; receives the improved text */
  onAccept: (improved: string) => void;
  /** Optional CSS class for the trigger button */
  className?: string;
  /** Whether AI is currently loading */
  loading: boolean;
  /** AI suggestion text (null = none pending) */
  suggestion: string | null;
  /** Error message if AI failed */
  error: string | null;
  /** Trigger enhancement */
  onEnhance: () => void;
  /** Dismiss suggestion */
  onDismiss: () => void;
  /** Label override */
  label?: string;
}

export const AiEnhanceButton: React.FC<Props> = ({
  value,
  onAccept,
  className = '',
  loading,
  suggestion,
  error,
  onEnhance,
  onDismiss,
  label,
}) => {
  const hasValue = value.trim().length > 0;

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={onEnhance}
        disabled={loading || !hasValue}
        title={hasValue ? 'AI se improve karein' : 'Pehle kuch likhein'}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all
          ${hasValue
            ? 'text-[#1F3FBF] bg-blue-50 hover:bg-blue-100 border border-blue-200'
            : 'text-slate-300 bg-slate-50 border border-slate-200 cursor-not-allowed'}
          ${className}`}
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Sparkles className="w-3 h-3" />
        )}
        {loading ? 'Improving...' : (label || '✨ AI Enhance')}
      </button>

      {/* Suggestion Bubble */}
      {suggestion && (
        <div className="absolute left-0 top-full mt-1 z-50 w-80 bg-white border border-blue-200 rounded-xl shadow-lg p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#1F3FBF]">
            <Sparkles className="w-3 h-3 text-[#FFC20E]" />
            AI Suggestion
          </div>
          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
            {suggestion}
          </p>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => onAccept(suggestion)}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#1F3FBF] text-white text-[11px] font-bold rounded-lg hover:bg-blue-800 transition-colors"
            >
              <Check className="w-3 h-3" /> Accept
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-3 h-3" /> Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Error mini-toast */}
      {error && (
        <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-red-50 border border-red-200 rounded-lg p-2 flex items-start gap-1.5">
          <AlertCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-red-700">{error}</p>
          <button type="button" onClick={onDismiss} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
