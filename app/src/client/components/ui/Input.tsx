import { type InputHTMLAttributes, type ReactNode, forwardRef, useId } from 'react';

import { cn } from '../../lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, id, label, error, helperText, icon, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="w-full space-y-1.5">
        {label ? (
          <label htmlFor={inputId} className="text-xs font-medium text-text-secondary">
            {label}
          </label>
        ) : null}

        <div className="relative">
          {icon ? (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-text-tertiary">{icon}</span>
          ) : null}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={Boolean(error)}
            className={cn(
              'h-9 w-full rounded-md border border-border bg-bg-surface px-3 text-sm text-text-primary placeholder:text-text-tertiary',
              'transition-colors duration-fast ease-out focus-visible:border-border-accent focus-visible:outline-none',
              error ? 'border-error focus-visible:border-error' : '',
              icon ? 'pl-9' : '',
              className
            )}
            {...props}
          />
        </div>

        {error ? <p className="text-xs text-error">{error}</p> : null}
        {!error && helperText ? <p className="text-xs text-text-tertiary">{helperText}</p> : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
