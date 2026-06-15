import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/utils/cn'

const THEME_CONFIG = {
  neutral: { label: 'Neutral', icon: '☀', bg: '#F8FAFC', accent: '#4F46E5' },
  cream: { label: 'Cream', icon: '📄', bg: '#FDFBF7', accent: '#B45309' },
  dark: { label: 'Dark', icon: '🌙', bg: '#09090B', accent: '#818CF8' },
}

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] p-1">
      {Object.entries(THEME_CONFIG).map(([key, config]) => (
        <button
          key={key}
          onClick={() => setTheme(key)}
          title={config.label}
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-md text-xs transition-all',
            theme === key
              ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm'
              : 'hover:bg-[var(--bg-muted)] text-[var(--text-muted)]',
          )}
        >
          {config.icon}
        </button>
      ))}
    </div>
  )
}
