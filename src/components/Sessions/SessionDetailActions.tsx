'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SessionEditPanel, type SessionEditData } from './SessionEditPanel'

interface SessionDetailActionsProps {
  session: SessionEditData
}

export function SessionDetailActions({ session }: SessionDetailActionsProps) {
  const [editOpen, setEditOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setEditOpen(true)}
        className="h-9 px-3 rounded-[12px] gap-1.5 text-on-surface/50 hover:text-primary hover:bg-[#f3f3f4] transition-colors text-sm"
        aria-label="Edit session details"
      >
        <Pencil size={14} />
        <span className="hidden sm:inline">Edit</span>
      </Button>

      <SessionEditPanel open={editOpen} onOpenChange={setEditOpen} session={session} />
    </>
  )
}
