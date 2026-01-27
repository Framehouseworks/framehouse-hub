'use client'

import React, { createContext, useContext } from 'react'

interface ThemeConfig {
    fontPairing?: 'modern-sans' | 'classic-serif' | 'tech-mono'
    backgroundColor?: string | null
    textColor?: string | null
    accentColor?: string | null
}

const PortfolioThemeContext = createContext<ThemeConfig>({})

export const usePortfolioTheme = () => useContext(PortfolioThemeContext)

export const PortfolioThemeProvider: React.FC<{
    theme: ThemeConfig
    children: React.ReactNode
}> = ({ theme, children }) => {
    const fontClasses = {
        'modern-sans': 'font-sans', // Assuming Geist/Inter
        'classic-serif': 'font-serif', // Assuming serif font is configured
        'tech-mono': 'font-mono', // Assuming mono font is configured
    }

    // Define CSS variables for the theme
    const style = {
        '--portfolio-bg': theme.backgroundColor || '#000000',
        '--portfolio-text': theme.textColor || '#ffffff',
        '--portfolio-accent': theme.accentColor || '#ffffff',
    } as React.CSSProperties

    return (
        <PortfolioThemeContext.Provider value={theme}>
            <div
                className={`min-h-screen ${fontClasses[theme.fontPairing || 'modern-sans']} transition-colors duration-500`}
                style={style}
            >
                <div className="bg-[var(--portfolio-bg)] text-[var(--portfolio-text)] selection:bg-[var(--portfolio-accent)] selection:text-[var(--portfolio-bg)]">
                    {children}
                </div>
            </div>
        </PortfolioThemeContext.Provider>
    )
}
