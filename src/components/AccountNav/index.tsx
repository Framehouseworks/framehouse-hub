'use client'

import clsx from 'clsx'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Props = {
  className?: string
}

// Kept for backwards-compat; account settings now use AccountSettingsSidebar.
export const AccountNav: React.FC<Props> = ({ className }) => {
  const pathname = usePathname()

  return (
    <nav className={clsx(className)}>
      <ul className="flex flex-col gap-2">
        <li>
          <Link
            href="/account"
            className={clsx(
              'text-sm font-medium transition-colors px-1',
              pathname === '/account'
                ? 'text-primary'
                : 'text-on-surface/50 hover:text-on-surface/80',
            )}
          >
            Account Settings
          </Link>
        </li>
      </ul>
    </nav>
  )
}
