import { type HTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md';

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-bg-overlay text-text-secondary',
  primary: 'bg-primary-900 text-primary-200',
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning',
  danger: 'bg-error-subtle text-error',
  info: 'bg-info-subtle text-info'
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'h-[18px] px-2 text-xs',
  md: 'h-[22px] px-2.5 text-xs'
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

export function Badge({ className, variant = 'default', size = 'sm', ...props }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full font-medium', variantClasses[variant], sizeClasses[size], className)}
      {...props}
    />
  );
}
