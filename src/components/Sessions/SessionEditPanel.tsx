'use client'

import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { FieldInput, FieldTextarea } from '@/components/ui/field-input'
import { TagInput } from '@/components/ui/tag-input'
import { LocationSearch, type PhotonResult } from '@/components/ui/location-search'
import { DatePicker } from '@/components/ui/date-picker'
import { CalendarDays, MapPin, Tag, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export interface SessionEditData {
  id: number
  name: string
  shootDate?: string | null
  description?: string | null
  location?: { address?: string | null; latitude?: number | null; longitude?: number | null } | null
  defaultTags?: string[]
}

interface SessionEditPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: SessionEditData
}

function FieldLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <Icon className="h-3 w-3 text-on-surface/30" />
      <span className="font-rubik text-[10px] font-bold text-on-surface/40 uppercase tracking-[0.18em]">
        {children}
      </span>
    </div>
  )
}

export function SessionEditPanel({ open, onOpenChange, session }: SessionEditPanelProps) {
  const router = useRouter()
  const [name, setName] = useState(session.name)
  const [description, setDescription] = useState(session.description ?? '')
  const [locationAddress, setLocationAddress] = useState(session.location?.address ?? '')
  const [locationLat, setLocationLat] = useState<number | null>(session.location?.latitude ?? null)
  const [locationLng, setLocationLng] = useState<number | null>(session.location?.longitude ?? null)
  const [tags, setTags] = useState<string[]>(session.defaultTags ?? [])
  const [shootDateIso, setShootDateIso] = useState<string | null>(session.shootDate ?? null)
  const [isSaving, setIsSaving] = useState(false)
  const [nameError, setNameError] = useState('')

  useEffect(() => {
    if (open) {
      setName(session.name)
      setDescription(session.description ?? '')
      setLocationAddress(session.location?.address ?? '')
      setLocationLat(session.location?.latitude ?? null)
      setLocationLng(session.location?.longitude ?? null)
      setTags(session.defaultTags ?? [])
      setShootDateIso(session.shootDate ?? null)
      setNameError('')
    }
  }, [open, session])

  const handleLocationSelect = (result: PhotonResult) => {
    const [lon, lat] = result.geometry.coordinates
    setLocationLat(lat)
    setLocationLng(lon)
  }

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setNameError('Session name is required.')
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: trimmed,
          description: description.trim() || null,
          shootDate: shootDateIso ?? null,
          location: locationAddress
            ? { address: locationAddress, latitude: locationLat, longitude: locationLng }
            : null,
          defaultTags: tags.map((tag) => ({ tag })),
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Session updated')
      onOpenChange(false)
      router.refresh()
    } catch {
      toast.error('Failed to save — try again')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[420px] p-0 flex flex-col gap-0 border-none rounded-tl-[24px] rounded-bl-[24px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2)] bg-white dark:bg-[#0d0f14]"
      >
        <SheetHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[10px] bg-[#445aa5]/10 flex items-center justify-center flex-shrink-0">
              <CalendarDays className="h-3.5 w-3.5 text-[#445aa5]" />
            </div>
            <SheetTitle className="font-inter text-base font-semibold text-primary">
              Edit Session
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-5">
          {/* Name */}
          <div>
            <FieldLabel icon={CalendarDays}>Name *</FieldLabel>
            <FieldInput
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError('') }}
              placeholder="Session name"
              error={!!nameError}
            />
            {nameError && (
              <p className="mt-1.5 font-inter text-[11px] text-[#bb1800] dark:text-[#ff7f67]">{nameError}</p>
            )}
          </div>

          {/* Shoot date */}
          <div>
            <FieldLabel icon={CalendarDays}>Shoot Date</FieldLabel>
            <DatePicker
              value={shootDateIso}
              onChange={setShootDateIso}
              placeholder="Pick a date"
            />
          </div>

          {/* Description */}
          <div>
            <FieldLabel icon={FileText}>Description</FieldLabel>
            <FieldTextarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Shoot notes, client brief, retrospective…"
              rows={3}
            />
          </div>

          {/* Location */}
          <div>
            <FieldLabel icon={MapPin}>Location</FieldLabel>
            <LocationSearch
              value={locationAddress}
              onChange={setLocationAddress}
              onLocationSelect={handleLocationSelect}
              hasExistingGps={!!(locationLat && locationLng)}
              placeholder="Search location…"
            />
          </div>

          {/* Default tags */}
          <div>
            <FieldLabel icon={Tag}>Default Tags</FieldLabel>
            <p className="font-inter text-[11px] text-on-surface/40 mb-2 leading-relaxed">
              Applied to future uploads in this session only.
            </p>
            <TagInput tags={tags} onChange={setTags} placeholder="Add tag…" maxTags={20} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-5 space-y-2 bg-white/80 dark:bg-transparent backdrop-blur-sm">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-12 rounded-[18px] bg-gradient-to-r from-[#3a4d8f] to-[#445aa5] text-white font-inter text-sm font-semibold hover:opacity-90 transition-opacity shadow-[0_8px_20px_rgba(68,90,165,0.25)]"
          >
            {isSaving ? 'Saving…' : 'Save Changes'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full h-10 rounded-[14px] text-on-surface/40 hover:text-on-surface/60 font-inter text-sm"
          >
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
