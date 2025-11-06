'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import Button from './Button';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  onAction?: () => void;
  children?: ReactNode;
}

export default function PageHeader({
  title,
  description,
  icon: Icon,
  actionLabel,
  actionIcon: ActionIcon,
  onAction,
  children,
}: PageHeaderProps) {
  return (
    <div className="mb-8 relative">
      <div className="absolute inset-0 bg-slate-100/50 rounded-2xl -z-10"></div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 bg-white border border-slate-200 shadow-soft">
        <div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">{title}</h1>
          {description && (
            <p className="text-slate-600 flex items-center gap-2">
              {/* {Icon && <Icon className="w-4 h-4" />} */}
              {description}
            </p>
          )}
        </div>
        {onAction && actionLabel && (
          <Button
            onClick={onAction}
            size="sm"
            className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-md hover:shadow-lg transition-all hover:scale-105"
          >
            {ActionIcon && <ActionIcon className="w-5 h-5 mr-2" />}
            {actionLabel}
          </Button>
        )}
        {children}
      </div>
    </div>
  );
}

