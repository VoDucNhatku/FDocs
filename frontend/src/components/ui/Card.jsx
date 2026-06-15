import { cn } from '@/utils/cn'

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children }) {
  return <div className={cn('px-6 py-4 border-b border-[var(--border)]', className)}>{children}</div>
}

export function CardContent({ className, children }) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>
}
