import { AuthProvider } from '@/providers/Auth'
import React from 'react'

import { SonnerProvider } from '@/providers/Sonner'
import { HeaderThemeProvider } from './HeaderTheme'
import { ThemeProvider } from './Theme'
import { HeaderProvider } from './HeaderProvider'
import { UploadProvider } from './UploadProvider'

export const Providers: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  return (
    <ThemeProvider>
      <HeaderProvider>
        <AuthProvider>
          <HeaderThemeProvider>
            <UploadProvider>
              <SonnerProvider />
              {children}
            </UploadProvider>
          </HeaderThemeProvider>
        </AuthProvider>
      </HeaderProvider>
    </ThemeProvider>
  )
}
