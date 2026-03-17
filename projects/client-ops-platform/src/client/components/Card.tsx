import type { ReactNode } from 'react';

type CardProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function Card({ title, description, children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {(title || description) && (
        <div className="px-6 py-4 border-b border-gray-100">
          {title && <h3 className="text-base font-medium text-gray-900">{title}</h3>}
          {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
        </div>
      )}
      <div className="px-6 py-4">{children}</div>
    </div>
  );
}
