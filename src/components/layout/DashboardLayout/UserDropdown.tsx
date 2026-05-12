'use client'

import React from 'react'
import Link from 'next/link'
import {
  User as UserIcon,
  Settings,
  LogOut,
  ShieldCheck,
  Moon,
  Sun,
  LayoutDashboard,
  ExternalLink,
} from 'lucide-react'
import { useAuth } from '@/providers/Auth'
import { useTheme } from '@/providers/Theme'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/utilities/cn'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export const UserDropdown: React.FC = () => {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
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

  const isAdmin = user?.roles?.includes('admin')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 pl-4 border-l border-black/[0.03] dark:border-white/[0.03] outline-none group">
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
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-64 p-2 bg-white dark:bg-[#1a1c1c] border-black/[0.05] dark:border-white/[0.05] rounded-[20px] shadow-[0px_20px_40px_rgba(0,0,0,0.1)]"
        align="end"
        sideOffset={12}
      >
        <DropdownMenuLabel className="px-3 py-4">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-primary truncate max-w-[200px]">
              {user?.name}
            </p>
            <p className="text-xs leading-none text-on-surface/40 font-rubik tracking-tight mt-1 truncate max-w-[200px]">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-black/[0.03] dark:border-white/[0.03] mx-2" />

        <DropdownMenuGroup className="p-1">
          {isAdmin && (
            <DropdownMenuItem
              asChild
              className="rounded-xl px-3 py-2.5 focus:bg-gallery-gold/5 focus:text-gallery-gold cursor-pointer transition-colors group"
            >
              <Link
                href="/admin"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center w-full"
              >
                <ShieldCheck className="mr-3 h-4 w-4 text-on-surface/40 group-focus:text-gallery-gold" />
                <span className="font-medium">Admin Dashboard</span>
                <ExternalLink className="ml-auto h-3 w-3 opacity-30" />
              </Link>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            asChild
            className="rounded-xl px-3 py-2.5 focus:bg-gallery-gold/5 focus:text-gallery-gold cursor-pointer transition-colors group"
          >
            <Link href="/dashboard" className="flex items-center w-full">
              <LayoutDashboard className="mr-3 h-4 w-4 text-on-surface/40 group-focus:text-gallery-gold" />
              <span className="font-medium">Platform Overview</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            asChild
            className="rounded-xl px-3 py-2.5 focus:bg-gallery-gold/5 focus:text-gallery-gold cursor-pointer transition-colors group"
          >
            <Link href="/account" className="flex items-center w-full">
              <Settings className="mr-3 h-4 w-4 text-on-surface/40 group-focus:text-gallery-gold" />
              <span className="font-medium">Profile Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-black/[0.03] dark:border-white/[0.03] mx-2" />

        <DropdownMenuGroup className="p-1">
          <DropdownMenuLabel className="px-3 pt-2 pb-1 font-rubik text-[9px] tracking-[0.2em] text-on-surface/30 uppercase">
            APPEARANCE
          </DropdownMenuLabel>
          <div className="grid grid-cols-2 gap-1 p-1">
            <button
              onClick={() => setTheme('light')}
              className={cn(
                'flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all',
                theme === 'light'
                  ? 'bg-gallery-gold/10 text-gallery-gold border border-gallery-gold/20 shadow-sm'
                  : 'text-on-surface/40 hover:bg-black/5 dark:hover:bg-white/5',
              )}
            >
              <Sun size={14} /> Light
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={cn(
                'flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all',
                theme === 'dark'
                  ? 'bg-gallery-gold/10 text-gallery-gold border border-gallery-gold/20 shadow-sm'
                  : 'text-on-surface/40 hover:bg-black/5 dark:hover:bg-white/5',
              )}
            >
              <Moon size={14} /> Dark
            </button>
          </div>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-black/[0.03] dark:border-white/[0.03] mx-2" />

        <div className="p-1">
          <DropdownMenuItem
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={cn(
              'rounded-xl px-3 py-2.5 text-gallery-red focus:bg-gallery-red/5 focus:text-gallery-red cursor-pointer transition-colors group',
              isLoggingOut && 'opacity-50 cursor-not-allowed',
            )}
          >
            <LogOut className={cn('mr-3 h-4 w-4', isLoggingOut && 'animate-pulse')} />
            <span className="font-medium">{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
