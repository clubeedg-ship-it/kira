import { cn } from '../../lib/cn';

export interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  colorClassName?: string;
}

export function ProgressBar({ value, max = 100, showLabel = false, colorClassName }: ProgressBarProps) {
  const safeMax = max > 0 ? max : 100;
  const safeValue = Math.min(Math.max(value, 0), safeMax);
  const percent = Math.round((safeValue / safeMax) * 100);

  return (
    <div className="w-full space-y-1.5">
      {showLabel ? <div className="text-right text-xs text-text-secondary">{percent}%</div> : null}
      <div className="h-1 w-full overflow-hidden rounded-full bg-bg-wash">
        <div
          className={cn('h-full rounded-full bg-primary-500 transition-all duration-slow ease-out', colorClassName)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
