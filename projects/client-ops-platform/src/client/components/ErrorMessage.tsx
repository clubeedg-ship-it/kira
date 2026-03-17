import { AlertTriangle } from 'lucide-react';

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
      <AlertTriangle size={16} className="shrink-0" />
      {message}
    </div>
  );
}
