'use client';

import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  className = '',
}: ModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative bg-white shadow-xl ${sizeClasses[size]} w-full max-h-[90vh] overflow-hidden  animate-scale-up ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 shadow bg-slate-50 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">{title}</h2>
            {description && (
              <p className="text-sm text-slate-600">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl hover:bg-white transition-all text-slate-500 hover:text-slate-900 hover:rotate-90 duration-200"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)] bg-white">
          {children}
        </div>
      </div>
    </div>
  );
}
