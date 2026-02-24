import { type HTMLAttributes } from 'react';

import { cn } from '../../lib/cn';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'h-5 w-5 text-[10px]',
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base'
};

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  name?: string;
  src?: string | null;
  size?: AvatarSize;
}

function getInitials(name?: string): string {
  if (!name) {
    return 'K';
  }

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function Avatar({ className, name, src, size = 'md', ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary-500 to-accent-500 font-semibold text-white',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {src ? <img src={src} alt={name ?? 'User avatar'} className="h-full w-full object-cover" /> : getInitials(name)}
    </div>
  );
}
