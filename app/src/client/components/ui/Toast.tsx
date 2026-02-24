import { type ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

import { cn } from '../../lib/cn';
import { Button } from './Button';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

const variantClasses: Record<ToastVariant, string> = {
  success: 'border-l-success',
  error: 'border-l-error',
  info: 'border-l-info',
  warning: 'border-l-warning'
};

const variantIcons: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-success" />,
  error: <AlertCircle className="h-4 w-4 text-error" />,
  info: <Info className="h-4 w-4 text-info" />,
  warning: <AlertTriangle className="h-4 w-4 text-warning" />
};

export interface ToastProps {
  title: string;
  description?: string;
  variant?: ToastVariant;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
}

export function Toast({ title, description, variant = 'info', actionLabel, onAction, onClose }: ToastProps) {
  return (
    <div
      className={cn(
        'w-full max-w-sm rounded-lg border border-border bg-bg-raised p-3 shadow-md',
        'border-l-4 text-sm',
        variantClasses[variant]
      )}
      role="status"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5">{variantIcons[variant]}</span>
        <div className="flex-1">
          <p className="font-semibold text-text-primary">{title}</p>
          {description ? <p className="mt-1 text-text-secondary">{description}</p> : null}
          {actionLabel && onAction ? (
            <button className="mt-2 text-xs font-semibold text-primary-300 hover:text-primary-200" onClick={onAction}>
              {actionLabel}
            </button>
          ) : null}
        </div>
        {onClose ? (
          <Button variant="ghost" size="sm" aria-label="Close toast" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
