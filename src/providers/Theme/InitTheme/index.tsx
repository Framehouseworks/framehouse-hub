import React from 'react'

import { defaultTheme, themeLocalStorageKey } from '../shared'

/**
 * Enterprise Best Practice for App Router:
 * Use a plain <script> tag for blocking theme initialization in the head.
 * This prevents the "Flash of Unstyled Theme" (FOUT) without violating
 * Next/Script's placement rules for 'beforeInteractive'.
 */
export const InitTheme: React.FC = () => {
  const scriptContent = `
    (function () {
      function getImplicitPreference() {
        var mediaQuery = '(prefers-color-scheme: dark)'
        var mql = window.matchMedia(mediaQuery)
        var hasImplicitPreference = typeof mql.matches === 'boolean'

        if (hasImplicitPreference) {
          return mql.matches ? 'dark' : 'light'
        }

        return null
      }

      function themeIsValid(theme) {
        return theme === 'light' || theme === 'dark'
      }

      var themeToSet = '${defaultTheme}'
      var preference = window.localStorage.getItem('${themeLocalStorageKey}')

      if (themeIsValid(preference)) {
        themeToSet = preference
      } else {
        var implicitPreference = getImplicitPreference()

        if (implicitPreference) {
          themeToSet = implicitPreference
        }
      }

      document.documentElement.setAttribute('data-theme', themeToSet)
    })();
  `

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: scriptContent,
      }}
      id="theme-script"
    />
  )
}
