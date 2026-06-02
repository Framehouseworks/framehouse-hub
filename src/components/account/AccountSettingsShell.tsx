'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/providers/Auth'
import type { User, Media } from '@/payload-types'

import { AccountSettingsSidebar } from '@/components/account/AccountSettingsSidebar'
import { ProfileSection } from '@/components/account/sections/ProfileSection'
import { PortfolioDefaultsSection } from '@/components/account/sections/PortfolioDefaultsSection'
import { StorageSection } from '@/components/account/sections/StorageSection'
import { SecuritySection } from '@/components/account/sections/SecuritySection'

type FormValues = {
  name: string
  studioName: string
  bio: string
  portfolioDefaults: {
    defaultTheme: 'light' | 'dark'
    defaultVisibility: 'private' | 'password' | 'public'
    showWatermark: boolean
  }
}

function buildDefaults(user: User): FormValues {
  return {
    name: user.name ?? '',
    studioName: user.studioName ?? '',
    bio: user.bio ?? '',
    portfolioDefaults: {
      defaultTheme: user.portfolioDefaults?.defaultTheme ?? 'light',
      defaultVisibility: user.portfolioDefaults?.defaultVisibility ?? 'private',
      showWatermark: user.portfolioDefaults?.showWatermark ?? false,
    },
  }
}

type Props = {
  user: User
}

export const AccountSettingsShell: React.FC<Props> = ({ user: initialUser }) => {
  const { setUser } = useAuth()

  // Logo state is managed outside react-hook-form (it's an upload, not a text field)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoClear, setLogoClear] = useState(false)

  // Use the auth provider's live user for logo (kept fresh after save via setUser)
  const { user: liveUser } = useAuth()
  const currentUser = liveUser ?? initialUser
  const existingLogo =
    currentUser.studioLogo && typeof currentUser.studioLogo === 'object'
      ? (currentUser.studioLogo as Media)
      : null

  const methods = useForm<FormValues>({
    defaultValues: buildDefaults(initialUser),
  })

  const { handleSubmit, reset, formState: { isDirty, isSubmitting } } = methods

  const hasChanges = isDirty || !!logoFile || logoClear

  // EC2 — unsaved changes browser guard (native beforeunload)
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasChanges) return
      e.preventDefault()
      // Most browsers show their own message, but setting returnValue is required
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges])

  // Sync form when user is updated externally (e.g. another tab)
  useEffect(() => {
    reset(buildDefaults(initialUser))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUser.updatedAt])

  // Issue-2 fix: use dedicated studio-logo route that handles raw-bytes pipeline.
  const uploadLogo = useCallback(async (): Promise<number | null> => {
    if (!logoFile) return null
    const res = await fetch('/api/users/me/studio-logo', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': logoFile.type || 'image/png',
        'X-Filename': logoFile.name,
      },
      body: logoFile,
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error((json as { error?: string }).error ?? 'Logo upload failed')
    }
    const json = await res.json()
    return (json as { mediaId: number }).mediaId
  }, [logoFile])

  const onSubmit = async (data: FormValues) => {
    let logoId: number | null | undefined = undefined

    if (logoFile) {
      try {
        logoId = await uploadLogo()
      } catch {
        toast.error('Failed to upload studio logo.')
        return
      }
    } else if (logoClear) {
      logoId = null
    }

    const body: Record<string, unknown> = {
      name: data.name,
      studioName: data.studioName || null,
      bio: data.bio || null,
      portfolioDefaults: data.portfolioDefaults,
    }
    if (logoId !== undefined) body.studioLogo = logoId

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/${initialUser.id}`,
      {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    )

    if (!res.ok) {
      toast.error('Failed to save settings.')
      return
    }

    const json = await res.json()
    setUser(json.doc)
    reset(buildDefaults(json.doc))
    setLogoFile(null)
    setLogoPreview(null)
    setLogoClear(false)
    toast.success('Settings saved.')
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Page header — compact on mobile, spacious on desktop */}
        <div className="flex items-start justify-between mb-6 lg:mb-8 gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-on-surface tracking-tight">
              Account Settings
            </h1>
            <p className="mt-0.5 text-sm text-on-surface/50 hidden sm:block">
              Manage your creative identity and account security.
            </p>
          </div>
          {/* Desktop save button — hidden on mobile (sticky bar handles it) */}
          <Button
            type="submit"
            disabled={!hasChanges || isSubmitting}
            aria-busy={isSubmitting}
            className="hidden sm:flex shrink-0 rounded-2xl bg-gradient-to-r from-[#7f5700] to-[#d79922] text-white hover:opacity-90 disabled:opacity-40 gap-2"
          >
            <Save size={15} aria-hidden="true" />
            <span>{isSubmitting ? 'Saving…' : 'Save Changes'}</span>
          </Button>
          <span role="status" aria-live="polite" className="sr-only">
            {isSubmitting ? 'Saving your settings…' : ''}
          </span>
        </div>

        {/* Section nav: mobile = horizontal chips, desktop = sticky column inside flex */}
        <AccountSettingsSidebar />

        <div className="flex gap-8 xl:gap-10">
          {/* Desktop sticky column nav */}
          <aside className="hidden lg:block w-[220px] shrink-0 sticky top-6 self-start">
            <AccountSettingsSidebar desktopOnly />
          </aside>

          {/* Right scrollable canvas */}
          <div className="flex-1 min-w-0 space-y-8 sm:space-y-12 pb-24 sm:pb-0">
            <ProfileSection
              logoPreview={logoPreview}
              existingLogo={existingLogo}
              onLogoChange={(file, preview) => {
                setLogoFile(file)
                setLogoPreview(preview)
                setLogoClear(false)
              }}
              onLogoClear={() => {
                setLogoFile(null)
                setLogoPreview(null)
                setLogoClear(true)
              }}
            />
            <PortfolioDefaultsSection />
            <StorageSection />
            <SecuritySection />
          </div>
        </div>

        {/* Mobile sticky save bar — only visible on small screens when there are changes */}
        {hasChanges && (
          <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-[16px] border-t border-black/[0.05] px-4 py-3 flex gap-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-2xl"
              onClick={() => {
                reset(buildDefaults(initialUser))
                setLogoFile(null)
                setLogoPreview(null)
                setLogoClear(false)
              }}
              disabled={isSubmitting}
            >
              Discard
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="flex-1 rounded-2xl bg-gradient-to-r from-[#7f5700] to-[#d79922] text-white hover:opacity-90 gap-2"
            >
              <Save size={15} aria-hidden="true" />
              <span>{isSubmitting ? 'Saving…' : 'Save'}</span>
            </Button>
          </div>
        )}
      </form>
    </FormProvider>
  )
}
