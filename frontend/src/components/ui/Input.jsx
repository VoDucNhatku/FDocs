import { cn } from '@/utils/cn'

export function Input({ className, error, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      <input
        className={cn(
          'w-full rounded-lg border border-[var(--border)] bg-[var(--bg-surface)]',
          'px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent',
          'transition-colors',
          error && 'border-red-500 focus:ring-red-500',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
