import { Navigate, Outlet, NavLink, useParams } from 'react-router-dom'
import { BookOpen, Upload, LogOut, Key } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useGeminiKey } from '@/context/GeminiKeyContext'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { CommandPalette } from '@/components/CommandPalette'
import { cn } from '@/utils/cn'
import { useState } from 'react'

export function AppLayout() {
  const { isAuthenticated, logout } = useAuth()
  const { hasKey } = useGeminiKey()
  const [paletteAction, setPaletteAction] = useState(null)
  const { docId } = useParams()

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen bg-[var(--bg-base)] overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="flex h-14 items-center px-4 border-b border-[var(--border)]">
          <span className="font-bold text-[var(--text-primary)]">FDocs</span>
        </div>

        <nav className="flex flex-col gap-1 p-3 flex-1">
          <SidebarLink to="/library" icon={<BookOpen size={16} />}>Library</SidebarLink>
          <SidebarLink to="/upload" icon={<Upload size={16} />}>Upload</SidebarLink>
        </nav>

        <div className="p-3 border-t border-[var(--border)] flex flex-col gap-2">
          {!hasKey && (
            <NavLink
              to="/settings/api-key"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-amber-600 bg-amber-50 hover:bg-amber-100 font-medium"
            >
              <Key size={14} /> Chưa có Gemini Key
            </NavLink>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--bg-muted)] transition-colors"
          >
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-[var(--border)] px-6 bg-[var(--bg-surface)]">
          <button
            onClick={() => setPaletteAction(null)}
            className="text-xs text-[var(--text-muted)] border border-[var(--border)] rounded-md px-3 py-1.5 hover:bg-[var(--bg-muted)] transition-colors"
            onClickCapture={(e) => {
              e.preventDefault()
              document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
            }}
          >
            ⌘K — Lệnh nhanh
          </button>
          <ThemeSwitcher />
        </header>

        <div className="flex-1 overflow-y-auto">
          <Outlet context={{ pendingAction: paletteAction, clearAction: () => setPaletteAction(null) }} />
        </div>
      </main>

      <CommandPalette docId={docId} onAction={setPaletteAction} />
    </div>
  )
}

function SidebarLink({ to, icon, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
          isActive
            ? 'bg-[var(--accent)] text-[var(--accent-fg)] font-medium'
            : 'text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]',
        )
      }
    >
      {icon}
      {children}
    </NavLink>
  )
}
