import { type HTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

type CardVariant = 'flat' | 'raised' | 'elevated';

const variantClasses: Record<CardVariant, string> = {
  flat: 'bg-bg-surface border-border-subtle shadow-none',
  raised: 'bg-bg-raised border-border shadow-sm',
  elevated: 'bg-bg-raised border-border-strong shadow-md'
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

export function Card({ className, variant = 'flat', ...props }: CardProps) {
  return <div className={cn('rounded-lg border p-5', variantClasses[variant], className)} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 space-y-1', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('font-display text-lg font-semibold text-text-primary', className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-text-secondary', className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-4', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-5 flex items-center justify-end gap-2', className)} {...props} />;
}
