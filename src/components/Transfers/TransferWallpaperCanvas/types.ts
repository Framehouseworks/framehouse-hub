import type { TransferWallpaper } from '@/payload-types'

export type { TransferWallpaper }

export interface TransferWallpaperCanvasProps {
  wallpapers?: TransferWallpaper[]
  className?: string
  /**
   * Callback fired when active wallpaper rotates
   */
  onWallpaperChange?: (wallpaper: TransferWallpaper) => void
}

export interface TransferWallpaperCreditBadgeProps {
  wallpaper: TransferWallpaper
  className?: string
}

export const FALLBACK_TRANSFER_WALLPAPER: TransferWallpaper = {
  id: '',
  title: 'Framehouse Curated Gallery',
  assetUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=2560&q=85',
  artistCredit: 'Framehouse Works',
  clickThroughUrl: 'https://framehouseworks.com',
  sponsorshipStatus: 'editorial',
  status: 'active',
  displayDurationSeconds: 45,
  startDate: '2026-01-01T00:00:00.000Z',
  weight: 100,
  focalPoint: 'center',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}
