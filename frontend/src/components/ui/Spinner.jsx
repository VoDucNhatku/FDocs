import { cn } from '@/utils/cn'

export function Spinner({ size = 'md', className }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' }
  return (
    <span
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]',
        sizes[size],
        className,
      )}
    />
  )
}
