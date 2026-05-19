'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trash2, AlertTriangle, RotateCcw } from 'lucide-react'

interface SafetyLockDeleteModalProps {
  count: number
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isDeleting: boolean
}

export const SafetyLockDeleteModal: React.FC<SafetyLockDeleteModalProps> = ({
  count,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  const [confirmValue, setConfirmValue] = useState('')
  const targetValue = 'DELETE'

  const handleConfirm = () => {
    if (confirmValue === targetValue) {
      onConfirm()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[450px] p-0 overflow-hidden bg-white dark:bg-[#0a0c10] border-none rounded-[32px] shadow-2xl outline-none">
        <div className="p-8 pt-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500 mb-6">
            <AlertTriangle size={32} />
          </div>

          <DialogHeader className="p-0 space-y-2">
            <DialogTitle className="text-2xl font-semibold tracking-tight text-primary">
              High-Stakes Disposal
            </DialogTitle>
            <DialogDescription className="text-sm text-on-surface/40 font-varela max-w-[300px]">
              You are about to permanently remove{' '}
              <span className="text-red-500 font-bold">{count} archival assets</span>. This action
              is irreversible.
            </DialogDescription>
          </DialogHeader>

          <div className="w-full mt-8 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-widest text-on-surface/30 uppercase">
                Type <span className="text-primary font-mono">{targetValue}</span> to confirm
              </label>
              <input
                value={confirmValue}
                onChange={(e) => setConfirmValue(e.target.value.toUpperCase())}
                placeholder="INTENT"
                className="w-full bg-red-500/[0.03] dark:bg-red-500/[0.05] border border-red-500/10 rounded-xl px-4 h-12 text-center text-sm font-mono tracking-[0.2em] focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="p-8 bg-red-500/[0.02] dark:bg-red-500/[0.03] border-t border-red-500/10 flex flex-col gap-3">
          <Button
            variant="destructive"
            className="w-full h-14 rounded-2xl bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20 font-rubik text-xs font-bold uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:scale-100"
            onClick={handleConfirm}
            disabled={confirmValue !== targetValue || isDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? 'Disposing of Archives...' : `Authorize Disposal of ${count} Assets`}
          </Button>
          <Button
            variant="ghost"
            className="w-full h-14 rounded-2xl text-on-surface/40 hover:text-primary font-rubik text-xs font-bold uppercase tracking-widest transition-all"
            onClick={onClose}
            disabled={isDeleting}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Abort Operation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
