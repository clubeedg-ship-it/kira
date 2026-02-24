import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

import { cn } from '../../lib/cn';
import { Button } from './Button';

type ModalSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-[400px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[720px]'
};

export interface ModalProps {
  open: boolean;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  onClose: () => void;
}

export function Modal({ open, title, children, footer, size = 'md', onClose }: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <button className="absolute inset-0 cursor-default" aria-label="Close modal" onClick={onClose} />
      <div className={cn('relative w-full rounded-lg border border-border bg-bg-raised p-6 shadow-lg', sizeClasses[size])}>
        {title ? (
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-xl font-semibold text-text-primary">{title}</h3>
            <Button variant="ghost" size="sm" aria-label="Close modal" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : null}

        <div>{children}</div>
        {footer ? <div className="mt-5 flex items-center justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}
