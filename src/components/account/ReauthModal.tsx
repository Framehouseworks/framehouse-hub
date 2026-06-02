'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/providers/Auth'

type Props = {
  open: boolean
  onSuccess: () => void
  onClose: () => void
}

export const ReauthModal: React.FC<Props> = ({ open, onSuccess, onClose }) => {
  const { user, login } = useAuth()
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!user?.email || !password) return
    setLoading(true)
    setError('')
    try {
      await login({ email: user.email, password })
      setPassword('')
      onSuccess()
    } catch {
      setError('Incorrect password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setPassword('')
    setError('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-sm rounded-2xl p-0 overflow-hidden">
        <div className="bg-gallery-gold/5 px-6 py-5 border-b border-black/[0.04] dark:border-white/[0.04]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-gallery-gold/10 flex items-center justify-center shrink-0">
                <ShieldCheck size={18} className="text-gallery-gold" />
              </div>
              <DialogTitle className="text-base font-semibold">Re-authenticate Session</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-on-surface/50 ml-12">
              Enter your current password to unlock security settings.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reauth-password" className="text-sm font-medium">
              Current Password
            </Label>
            <div className="relative">
              <Input
                id="reauth-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                placeholder="Enter your password"
                className="rounded-2xl pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface/30 hover:text-on-surface/60 transition-colors"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {error && <p className="text-xs text-gallery-red">{error}</p>}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-2xl"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-2xl bg-gradient-to-r from-[#7f5700] to-[#d79922] text-white hover:opacity-90"
              onClick={handleConfirm}
              disabled={loading || !password}
            >
              {loading ? 'Verifying…' : 'Confirm'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
