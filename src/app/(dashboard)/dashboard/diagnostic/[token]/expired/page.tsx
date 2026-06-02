import React from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function DiagnosticExpiredPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: '#ff7f6722' }}
          >
            <AlertTriangle size={32} style={{ color: '#bb1800' }} aria-hidden />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-on-surface font-inter">Session Expired</h1>
          <p className="text-on-surface/60 text-sm leading-relaxed">
            This diagnostic session has expired or was terminated. Diagnostic sessions last 15
            minutes for security.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/admin/collections/users"
            className="inline-flex items-center justify-center px-6 py-3 rounded-2xl font-semibold text-sm transition-colors"
            style={{ backgroundColor: '#d79922', color: '#1a1c1c' }}
          >
            Back to Admin Panel
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 rounded-2xl font-semibold text-sm bg-gallery-surface text-on-surface hover:bg-gallery-surface/80 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
