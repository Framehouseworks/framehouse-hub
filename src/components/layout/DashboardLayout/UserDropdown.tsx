'use client'

import React from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  User as UserIcon,
  Settings,
  LogOut,
  ShieldCheck,
  Moon,
  Sun,
  ExternalLink,
  X,
} from 'lucide-react'
import { useAuth } from '@/providers/Auth'
import { useTheme } from '@/providers/Theme'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/utilities/cn'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

// ─── Shared avatar trigger ────────────────────────────────────────────────────
const AvatarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const { user } = useAuth()
  return (
    <button
      ref={ref}
      className={cn(
        'flex items-center gap-3 pl-4 border-l border-black/[0.03] dark:border-white/[0.03] outline-none group',
        className,
      )}
      {...props}
    >
      <div className="text-right hidden sm:block">
        <p className="text-sm font-medium text-primary leading-none mb-1 group-hover:text-gallery-gold transition-colors">
          {user?.name || 'Creative User'}
        </p>
        <p className="font-rubik text-[9px] tracking-wider text-on-surface/40 uppercase">
          {user?.roles?.[0] || 'VIEWER'}
        </p>
      </div>
      <div className="w-10 h-10 rounded-[14px] bg-gallery-surface flex items-center justify-center text-primary/30 border border-black/[0.03] dark:border-white/[0.03] overflow-hidden group-hover:border-gallery-gold/30 transition-all">
        <UserIcon size={20} className="group-hover:text-gallery-gold transition-colors" />
      </div>
    </button>
  )
})
AvatarTrigger.displayName = 'AvatarTrigger'

// ─── Shared menu content ──────────────────────────────────────────────────────
function UserMenuContent({
  onClose,
  onLogout,
  isLoggingOut,
}: {
  onClose?: () => void
  onLogout: () => void
  isLoggingOut: boolean
}) {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const isAdmin = user?.roles?.includes('admin')

  const itemCls =
    'flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl text-sm font-medium transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gallery-gold/40'

  return (
    <div className="flex flex-col">
      {/* User identity */}
      <div className="px-5 pt-2 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-[14px] bg-gallery-surface flex items-center justify-center text-primary/30 border border-black/[0.03] dark:border-white/[0.03] shrink-0">
            <UserIcon size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary leading-none mb-1 truncate">
              {user?.name || 'Creative User'}
            </p>
            <p className="text-xs text-on-surface/40 font-rubik tracking-tight truncate">
              {user?.email}
            </p>
          </div>
        </div>
      </div>

      <div className="h-px mx-4 bg-black/[0.04] dark:bg-white/[0.04]" />

      {/* Navigation items */}
      <div className="px-3 pt-3 pb-1 flex flex-col gap-0.5">
        {isAdmin && (
          <Link
            href="/admin"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className={cn(itemCls, 'text-on-surface/70 hover:bg-gallery-gold/5 hover:text-gallery-gold')}
          >
            <ShieldCheck size={18} className="text-on-surface/35 shrink-0" />
            <span>Admin Dashboard</span>
            <ExternalLink size={12} className="ml-auto opacity-30" />
          </Link>
        )}
        <Link
          href="/account"
          onClick={onClose}
          className={cn(itemCls, 'text-on-surface/70 hover:bg-gallery-gold/5 hover:text-gallery-gold')}
        >
          <Settings size={18} className="text-on-surface/35 shrink-0" />
          <span>Profile Settings</span>
        </Link>
      </div>

      <div className="h-px mx-4 my-2 bg-black/[0.04] dark:bg-white/[0.04]" />

      {/* Appearance */}
      <div className="px-3 pb-1">
        <p className="px-1 pb-2 font-rubik text-[9px] tracking-[0.2em] text-on-surface/30 uppercase">
          Appearance
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setTheme('light')}
            className={cn(
              'flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-medium transition-all active:scale-[0.97]',
              theme === 'light'
                ? 'bg-gallery-gold/10 text-gallery-gold border border-gallery-gold/20 shadow-sm'
                : 'text-on-surface/40 hover:bg-black/5 dark:hover:bg-white/5',
            )}
          >
            <Sun size={15} /> Light
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={cn(
              'flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-medium transition-all active:scale-[0.97]',
              theme === 'dark'
                ? 'bg-gallery-gold/10 text-gallery-gold border border-gallery-gold/20 shadow-sm'
                : 'text-on-surface/40 hover:bg-black/5 dark:hover:bg-white/5',
            )}
          >
            <Moon size={15} /> Dark
          </button>
        </div>
      </div>

      <div className="h-px mx-4 my-2 bg-black/[0.04] dark:bg-white/[0.04]" />

      {/* Sign out */}
      <div className="px-3 pb-3">
        <button
          onClick={onLogout}
          disabled={isLoggingOut}
          className={cn(
            itemCls,
            'text-gallery-red hover:bg-gallery-red/5 w-full',
            isLoggingOut && 'opacity-50 cursor-not-allowed',
          )}
        >
          <LogOut size={18} className={cn('shrink-0', isLoggingOut && 'animate-pulse')} />
          <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
        </button>
      </div>
    </div>
  )
}

// ─── Mobile bottom sheet ──────────────────────────────────────────────────────
// Portal into document.body to escape the TopBar's backdrop-filter containing
// block (backdrop-filter creates a new fixed-position containing block per spec,
// which would otherwise anchor our fixed sheet relative to the 80px header).
function MobileUserSheet({
  onLogout,
  isLoggingOut,
}: {
  onLogout: () => void
  isLoggingOut: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Lock body scroll while sheet is open
  React.useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // Close on Escape
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const portalContent = (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={cn(
          'fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Account menu"
        className={cn(
          'fixed bottom-0 left-0 right-0 z-[60]',
          'bg-background/98 dark:bg-[#1a1c1c]/98 backdrop-blur-[28px]',
          'rounded-t-[28px]',
          'shadow-[0px_-24px_64px_rgba(0,0,0,0.18)]',
          'border-t border-black/[0.04] dark:border-white/[0.04]',
          'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
          <div className="w-9 h-1 bg-on-surface/20 rounded-full" />
        </div>

        {/* Sheet header */}
        <div className="flex items-center justify-between px-5 pt-1 pb-2">
          <span className="font-rubik text-[9px] tracking-[0.22em] text-on-surface/35 uppercase">
            Account
          </span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close account menu"
            className="w-7 h-7 flex items-center justify-center rounded-full bg-on-surface/5 text-on-surface/40 active:scale-90 transition-transform"
          >
            <X size={14} />
          </button>
        </div>

        <UserMenuContent
          onClose={() => setOpen(false)}
          onLogout={onLogout}
          isLoggingOut={isLoggingOut}
        />

        {/* Safe area inset */}
        <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </div>
    </>
  )

  return (
    <>
      <AvatarTrigger
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Open account menu"
      />
      {mounted ? createPortal(portalContent, document.body) : null}
    </>
  )
}

// ─── Desktop dropdown ─────────────────────────────────────────────────────────
function DesktopUserDropdown({
  onLogout,
  isLoggingOut,
}: {
  onLogout: () => void
  isLoggingOut: boolean
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AvatarTrigger aria-label="Open account menu" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-64 p-0 bg-white dark:bg-[#1a1c1c] border-black/[0.05] dark:border-white/[0.05] rounded-[20px] shadow-[0px_20px_40px_rgba(0,0,0,0.1)] overflow-hidden"
        align="end"
        sideOffset={12}
      >
        <UserMenuContent onLogout={onLogout} isLoggingOut={isLoggingOut} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Exported component ───────────────────────────────────────────────────────
// CSS-only breakpoint switching avoids hydration mismatches — no JS media query
// needed. display:none removes both variants from the a11y tree when hidden.
export const UserDropdown: React.FC = () => {
  const { logout } = useAuth()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    toast.promise(logout(), {
      loading: 'Signing out of your archive...',
      success: () => {
        router.push('/login')
        return 'Successfully signed out.'
      },
      error: 'Failed to sign out. Please try again.',
      finally: () => setIsLoggingOut(false),
    })
  }

  return (
    <>
      {/* Mobile: bottom sheet — hidden at lg+ */}
      <div className="lg:hidden">
        <MobileUserSheet onLogout={handleLogout} isLoggingOut={isLoggingOut} />
      </div>
      {/* Desktop: dropdown — hidden below lg */}
      <div className="hidden lg:block">
        <DesktopUserDropdown onLogout={handleLogout} isLoggingOut={isLoggingOut} />
      </div>
    </>
  )
}
