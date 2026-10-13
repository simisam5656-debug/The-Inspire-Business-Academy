import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0F1F5C]/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        ref={modalRef}
        className={`relative w-full ${sizeClasses[size]} bg-white rounded-2xl shadow-xl border border-[#1F3FBF]/15 overflow-hidden z-10 transition-all transform scale-100 animate-in fade-in zoom-in-95 duration-150`}
      >
        {/* Header */}
        {(title || description) && (
          <div className="p-5 sm:p-6 pb-3 border-b border-slate-100 flex items-start justify-between gap-4">
            <div>
              {title && (
                <h3 id="modal-title" className="text-lg font-bold font-display text-[#0F1F5C]">
                  {title}
                </h3>
              )}
              {description && (
                <p id="modal-description" className="text-xs sm:text-sm text-[#0F1F5C]/75 mt-1 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            <IconButton
              aria-label="Close dialog"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-400 hover:text-[#0F1F5C] -mr-1"
            >
              <X className="w-4 h-4" />
            </IconButton>
          </div>
        )}

        {/* Content */}
        <div className="p-5 sm:p-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
