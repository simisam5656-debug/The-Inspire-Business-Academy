import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { isSafeHttpsUrl } from '../../utils/url';

export interface ImagePreviewFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isRoman?: boolean;
  required?: boolean;
  helpText?: string;
  previewHeight?: string;
  aspect?: 'square' | 'video' | 'banner' | 'avatar';
  className?: string;
}

export const ImagePreviewField: React.FC<ImagePreviewFieldProps> = ({
  label,
  value,
  onChange,
  placeholder = 'https://example.com/image.jpg',
  isRoman = false,
  required = false,
  helpText,
  aspect = 'video',
  className = '',
}) => {
  const [loadError, setLoadError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Reset load state whenever URL changes
  useEffect(() => {
    if (!value || !value.trim()) {
      setLoadError(false);
      setLoaded(false);
      return;
    }
    // Verify HTTPS
    if (!isSafeHttpsUrl(value.trim())) {
      setLoadError(true);
      setLoaded(false);
      return;
    }
    setLoadError(false);
    setLoaded(false);
  }, [value]);

  const trimmed = value?.trim() || '';
  const isHttps = isSafeHttpsUrl(trimmed);
  const hasValue = trimmed.length > 0;

  const aspectClass = {
    square: 'w-20 h-20',
    avatar: 'w-20 h-20 rounded-full',
    video: 'w-40 h-24',
    banner: 'w-full h-32',
  }[aspect];

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {helpText && <span className="text-[11px] text-slate-500">{helpText}</span>}
      </div>

      <div className="relative">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={`w-full p-2.5 text-xs border rounded-lg focus:ring-2 focus:ring-[#1F3FBF] pr-8 ${
            hasValue && (!isHttps || loadError)
              ? 'border-red-300 bg-red-50/30'
              : hasValue && loaded
              ? 'border-emerald-300 bg-emerald-50/20'
              : 'border-slate-200'
          }`}
        />
        {hasValue && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
            title="Clear"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Validation and Preview Status */}
      {hasValue && (
        <div className="mt-2 space-y-2">
          {!isHttps && (
            <div className="flex items-center gap-1.5 text-[11px] text-red-600 font-semibold p-2 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isRoman
                  ? 'Sirf secure HTTPS link darkaar hai (https:// se shuru hona chahiye).'
                  : 'Must be a secure HTTPS link (starting with https://).'}
              </span>
            </div>
          )}

          {isHttps && loadError && (
            <div className="flex items-center gap-1.5 text-[11px] text-red-600 font-semibold p-2 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isRoman
                  ? 'Yeh link direct image nahi hai (This link is not a direct image).'
                  : 'This link is not a direct image'}
              </span>
            </div>
          )}

          {isHttps && (
            <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-lg">
              <div
                className={`${aspectClass} overflow-hidden bg-slate-200 border border-slate-300 shrink-0 flex items-center justify-center rounded-lg`}
              >
                <img
                  src={trimmed}
                  alt={label}
                  className="w-full h-full object-cover"
                  onLoad={() => {
                    setLoaded(true);
                    setLoadError(false);
                  }}
                  onError={() => {
                    setLoadError(true);
                    setLoaded(false);
                  }}
                />
              </div>

              <div className="text-[11px] space-y-0.5">
                {loaded && !loadError ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isRoman ? 'Direct image preview kamyab' : 'Valid direct image'}
                  </span>
                ) : loadError ? (
                  <span className="text-red-600 font-medium">
                    {isRoman ? 'Tasveer load karne mein nakam' : 'Failed to load image preview'}
                  </span>
                ) : (
                  <span className="text-slate-500">
                    {isRoman ? 'Tasveer jaanch ho rahi hai...' : 'Verifying image...'}
                  </span>
                )}
                <p className="text-[10px] text-slate-500 truncate max-w-xs">{trimmed}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
