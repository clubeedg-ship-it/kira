import { type ReactNode, type SelectHTMLAttributes, forwardRef, useId } from 'react';

import { cn } from '../../lib/cn';

interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  placeholder?: string;
  icon?: ReactNode;
  options?: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, id, label, error, helperText, placeholder, icon, options, children, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;

    return (
      <div className="w-full space-y-1.5">
        {label ? (
          <label htmlFor={selectId} className="text-xs font-medium text-text-secondary">
            {label}
          </label>
        ) : null}

        <div className="relative">
          {icon ? <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-text-tertiary">{icon}</span> : null}
          <select
            ref={ref}
            id={selectId}
            aria-invalid={Boolean(error)}
            className={cn(
              'h-9 w-full appearance-none rounded-md border border-border bg-bg-surface px-3 text-sm text-text-primary',
              'transition-colors duration-fast ease-out focus-visible:border-border-accent focus-visible:outline-none',
              'pr-9',
              error ? 'border-error focus-visible:border-error' : '',
              icon ? 'pl-9' : '',
              className
            )}
            {...props}
          >
            {placeholder ? (
              <option value="" disabled>
                {placeholder}
              </option>
            ) : null}
            {options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
            {children}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-text-tertiary">▾</span>
        </div>

        {error ? <p className="text-xs text-error">{error}</p> : null}
        {!error && helperText ? <p className="text-xs text-text-tertiary">{helperText}</p> : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
