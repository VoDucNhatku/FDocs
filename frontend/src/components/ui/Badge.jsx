import { cn } from '@/utils/cn'

export function Badge({ children, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        'bg-[var(--bg-muted)] text-[var(--text-muted)] border border-[var(--border)]',
        className,
      )}
    >
      {children}
    </span>
  )
}
