'use client'

import * as React from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import { cn } from '@/utilities/cn'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PhotonResult {
  geometry: { coordinates: [number, number] } // [lon, lat]
  properties: {
    name?: string
    street?: string
    housenumber?: string
    city?: string
    state?: string
    country?: string
    postcode?: string
    osm_type?: string
  }
}

interface PhotonResponse {
  features: PhotonResult[]
}

interface LocationSearchProps {
  value: string
  onChange: (address: string) => void
  onLocationSelect: (result: PhotonResult) => void
  hasExistingGps: boolean
  className?: string
  placeholder?: string
  inputClassName?: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildDisplayName(props: PhotonResult['properties']): string {
  return [props.name, props.street, props.city, props.state, props.country]
    .filter(Boolean)
    .join(', ')
}

// ─── OSM Mini-Map ────────────────────────────────────────────────────────────

// ─── OSM Tile Map ────────────────────────────────────────────────────────────

function latLonToTile(lat: number, lon: number, zoom: number) {
  const n = Math.pow(2, zoom)
  const x = Math.floor(((lon + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
  // Fractional pixel offset within the center tile (tile is 256×256)
  const fracX = (((lon + 180) / 360) * n - x) * 256
  const fracY =
    (((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n - y) * 256
  return { x, y, fracX, fracY }
}

export function OsmMiniMap({ lat, lon }: { lat: number; lon: number }) {
  const zoom = 14
  const link = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=15`
  const H = 140

  const containerRef = React.useRef<HTMLAnchorElement>(null)
  const [W, setW] = React.useState(0)

  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => setW(entry.contentRect.width))
    obs.observe(el)
    setW(el.getBoundingClientRect().width)
    return () => obs.disconnect()
  }, [])

  const { x: tileX, y: tileY, fracX, fracY } = latLonToTile(lat, lon, zoom)

  // Translate so the lat/lon pixel sits at the display centre
  const offsetX = W > 0 ? -(256 + fracX - W / 2) : 0
  const offsetY = -(256 + fracY - H / 2)

  // 3×3 grid of 256px tiles
  const grid: { dx: number; dy: number }[] = []
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) grid.push({ dx, dy })

  return (
    <a
      ref={containerRef}
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open in OpenStreetMap"
      className="block mt-2 rounded-2xl overflow-hidden relative group"
      style={{ width: '100%', height: H }}
    >
      {/* Tile grid */}
      <div
        className="absolute pointer-events-none select-none"
        style={{
          left: offsetX,
          top: offsetY,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 256px)',
          gridTemplateRows: 'repeat(3, 256px)',
        }}
      >
        {grid.map(({ dx, dy }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${dx},${dy}`}
            src={`https://tile.openstreetmap.org/${zoom}/${tileX + dx}/${tileY + dy}.png`}
            width={256}
            height={256}
            alt=""
            draggable={false}
          />
        ))}
      </div>

      {/* Pin */}
      <div
        className="absolute pointer-events-none"
        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -100%)' }}
      >
        <div className="w-3 h-3 rounded-full bg-gallery-gold border-2 border-white shadow-md" />
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end justify-end p-2">
        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-bold uppercase tracking-widest font-rubik text-white bg-black/40 px-2 py-0.5 rounded-lg backdrop-blur-sm">
          Open in OSM
        </span>
      </div>

      {/* OSM attribution (required by tile usage policy) */}
      <div className="absolute bottom-1 left-1 text-[7px] text-black/50 bg-white/70 px-1 rounded pointer-events-none">
        © OpenStreetMap
      </div>
    </a>
  )
}

// ─── GPS Confirmation Banner ─────────────────────────────────────────────────

interface ConfirmBannerProps {
  onReplace: () => void
  onAddressOnly: () => void
  onCancel: () => void
}

function ConfirmBanner({ onReplace, onAddressOnly, onCancel }: ConfirmBannerProps) {
  return (
    <div className="mt-1 p-3 rounded-2xl bg-gallery-gold/[0.08] space-y-2">
      <p className="text-[9px] font-bold text-on-surface/60 leading-relaxed">
        Existing GPS coordinates (from EXIF) will be replaced with an OSM approximation. Replace
        anyway?
      </p>
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={onReplace}
          className="px-3 py-1 rounded-xl bg-gallery-gold text-white text-[9px] font-bold uppercase tracking-widest hover:bg-gallery-gold/90 transition-colors"
        >
          Replace
        </button>
        <button
          type="button"
          onClick={onAddressOnly}
          className="px-3 py-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] text-on-surface/60 text-[9px] font-bold uppercase tracking-widest hover:text-primary transition-colors"
        >
          Address Only
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 rounded-xl text-on-surface/40 text-[9px] font-bold uppercase tracking-widest hover:text-primary transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Location Search ──────────────────────────────────────────────────────────

export function LocationSearch({
  value,
  onChange,
  onLocationSelect,
  hasExistingGps,
  className,
  placeholder = 'Search location…',
  inputClassName,
}: LocationSearchProps) {
  const [results, setResults] = React.useState<PhotonResult[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)
  const [activeIdx, setActiveIdx] = React.useState(-1)
  const [pendingResult, setPendingResult] = React.useState<PhotonResult | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const abortRef = React.useRef<AbortController | null>(null)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Close dropdown on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setPendingResult(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = React.useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() || query.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort()
      abortRef.current = new AbortController()
      setIsLoading(true)

      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`,
          { signal: abortRef.current.signal },
        )
        if (!res.ok) throw new Error('Photon request failed')
        const data: PhotonResponse = await res.json()
        setResults(data.features || [])
        setIsOpen(true)
        setActiveIdx(-1)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setResults([])
        }
      } finally {
        setIsLoading(false)
      }
    }, 350)
  }, [])

  // Cleanup on unmount
  React.useEffect(
    () => () => {
      abortRef.current?.abort()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    },
    [],
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
    search(e.target.value)
  }

  const selectResult = (result: PhotonResult) => {
    const displayName = buildDisplayName(result.properties)
    if (hasExistingGps) {
      setPendingResult(result)
      onChange(displayName)
      setIsOpen(false)
    } else {
      onChange(displayName)
      onLocationSelect(result)
      setIsOpen(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || !results.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      selectResult(results[activeIdx])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Input */}
      <div className="relative flex items-center">
        <MapPin
          size={10}
          className="absolute left-3 text-on-surface/30 pointer-events-none shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            'w-full bg-black/[0.04] dark:bg-white/[0.04] rounded-xl pl-8 pr-8 py-1.5',
            'text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 text-primary',
            'placeholder:text-on-surface/30',
            inputClassName,
          )}
        />
        {isLoading && (
          <Loader2 size={10} className="absolute right-3 text-on-surface/30 animate-spin" />
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-[200] top-full mt-1 w-full rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
          {results.map((r, idx) => {
            const displayName = buildDisplayName(r.properties)
            return (
              <button
                key={idx}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  selectResult(r)
                }}
                className={cn(
                  'w-full text-left px-4 py-2.5 flex items-start gap-2 transition-colors',
                  idx === activeIdx
                    ? 'bg-gallery-gold/10 text-primary'
                    : 'hover:bg-gallery-gold/[0.06] text-on-surface/70',
                )}
              >
                <MapPin size={10} className="mt-0.5 shrink-0 text-gallery-gold/60" />
                <span className="text-[10px] font-bold leading-snug">{displayName}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* GPS confirmation banner */}
      {pendingResult && (
        <ConfirmBanner
          onReplace={() => {
            onLocationSelect(pendingResult)
            setPendingResult(null)
          }}
          onAddressOnly={() => {
            onChange(buildDisplayName(pendingResult.properties))
            setPendingResult(null)
          }}
          onCancel={() => {
            setPendingResult(null)
          }}
        />
      )}
    </div>
  )
}
