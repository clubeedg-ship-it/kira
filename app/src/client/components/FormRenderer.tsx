import { useState } from 'react';

export interface FormField {
  name: string;
  type: 'text' | 'textarea' | 'email' | 'tel' | 'url' | 'password' | 'number' | 'select' | 'checkbox' | 'date';
  label: string;
  placeholder?: string;
  required?: boolean;
  default?: string;
  options?: Array<{ label: string; value: string }>;
}

export interface FormAction {
  label: string;
  type: 'submit' | 'link' | 'cancel';
  url?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface FormDefinition {
  title: string;
  description?: string;
  fields: FormField[];
  actions: FormAction[];
}

interface FormRendererProps {
  definition: FormDefinition;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
}

export default function FormRenderer({ definition, onSubmit, onCancel }: FormRendererProps) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const defaults: Record<string, unknown> = {};
    for (const f of definition.fields) {
      defaults[f.name] = f.type === 'checkbox' ? false : (f.default || '');
    }
    return defaults;
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (name: string, value: unknown) => setValues(v => ({ ...v, [name]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(values);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-zinc-100">Submitted successfully</h3>
        {onCancel && (
          <button onClick={onCancel} className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
            Dismiss
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {definition.description && (
        <p className="text-sm text-zinc-400">{definition.description}</p>
      )}

      {definition.fields.map((field) => (
        <div key={field.name} className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-300">
            {field.label}
            {field.required && <span className="text-violet-400 ml-1">*</span>}
          </label>

          {field.type === 'textarea' ? (
            <textarea
              value={(values[field.name] as string) || ''}
              onChange={e => set(field.name, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              rows={4}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors resize-y"
            />
          ) : field.type === 'select' ? (
            <select
              value={(values[field.name] as string) || ''}
              onChange={e => set(field.name, e.target.value)}
              required={field.required}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
            >
              <option value="">{field.placeholder || 'Select...'}</option>
              {field.options?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : field.type === 'checkbox' ? (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!values[field.name]}
                onChange={e => set(field.name, e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
              />
              <span className="text-sm text-zinc-400">{field.placeholder || field.label}</span>
            </label>
          ) : (
            <input
              type={field.type}
              value={(values[field.name] as string) || ''}
              onChange={e => set(field.name, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
            />
          )}
        </div>
      ))}

      <div className="flex gap-3 pt-2">
        {definition.actions.map((action, i) => {
          if (action.type === 'link') {
            return (
              <a
                key={i}
                href={action.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 text-sm font-medium rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                {action.label}
              </a>
            );
          }
          if (action.type === 'cancel') {
            return (
              <button
                key={i}
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 text-sm font-medium rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                {action.label}
              </button>
            );
          }
          const variantClass =
            action.variant === 'danger'
              ? 'bg-red-600 hover:bg-red-500'
              : action.variant === 'secondary'
              ? 'bg-zinc-700 hover:bg-zinc-600'
              : 'bg-violet-600 hover:bg-violet-500';
          return (
            <button
              key={i}
              type="submit"
              disabled={submitting}
              className={`px-5 py-2.5 text-sm font-medium rounded-lg text-white ${variantClass} transition-colors disabled:opacity-50`}
            >
              {submitting ? 'Submitting...' : action.label}
            </button>
          );
        })}
      </div>
    </form>
  );
}
