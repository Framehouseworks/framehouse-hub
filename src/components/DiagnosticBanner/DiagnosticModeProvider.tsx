'use client'

import React, { createContext, useContext } from 'react'

interface DiagnosticModeContextValue {
  isDiagnostic: true
  targetCreativeName: string | null
  targetCreativeEmail: string
  expiresAt: Date
  sessionToken: string
}

const DiagnosticModeContext = createContext<DiagnosticModeContextValue | null>(null)

export function useDiagnosticMode(): DiagnosticModeContextValue | null {
  return useContext(DiagnosticModeContext)
}

interface Props {
  children: React.ReactNode
  targetCreativeName: string | null
  targetCreativeEmail: string
  expiresAt: string
  sessionToken: string
}

export function DiagnosticModeProvider({
  children,
  targetCreativeName,
  targetCreativeEmail,
  expiresAt,
  sessionToken,
}: Props) {
  const value: DiagnosticModeContextValue = {
    isDiagnostic: true,
    targetCreativeName,
    targetCreativeEmail,
    expiresAt: new Date(expiresAt),
    sessionToken,
  }

  return (
    <DiagnosticModeContext.Provider value={value}>
      {children}
    </DiagnosticModeContext.Provider>
  )
}
