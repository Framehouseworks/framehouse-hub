'use client'
import { CMSLink } from '@/components/Link'
import { cn } from '@/utilities/cn'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Header } from 'src/payload-types'
import { MobileMenu } from './MobileMenu'

import FramehouseLogo from '@/assets/framehouse_logo_expanded_color.svg'
import HubLogo from '@/assets/hub/framehouse_hub_logo_color.svg'

import { useHeader } from '@/providers/HeaderProvider'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'

type Props = {
  header: Header
}

export function HeaderClient({ header }: Props) {
  const pathname = usePathname()
  const { isVisible, isScrolled, isOpaque } = useHeader()

  // Fallback menu items if CMS is empty
  const defaultMenu = [
    { id: '1', link: { url: '/product', label: 'Product' } },
    { id: '2', link: { url: '/pricing', label: 'Pricing' } },
    { id: '3', link: { url: '/learn', label: 'Learn' } },
    { id: '4', link: { url: '/about', label: 'Company' } },
  ]
  const menu = (header.navItems && header.navItems.length > 0) ? header.navItems : defaultMenu

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pt-4 px-20 pointer-events-none">
      <motion.header
        initial={{ y: 0 }}
        animate={{
          y: isVisible ? 0 : "-120%",
          width: isScrolled ? "95%" : "100%",
        }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className={cn(
          "mx-auto pointer-events-auto transition-none", // Removed transition-all to prevent jitter
          isOpaque 
            ? "bg-white dark:bg-[#1a1c1c]" 
            : "bg-white/80 dark:bg-[#1a1c1cb3] backdrop-blur-[20px]",
          "border border-black/[0.03] dark:border-white/[0.03]",
          "rounded-[20px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.4)]",
          "h-16 sm:h-20 flex items-center px-6 sm:px-8",
        )}
      >
        <div className="flex-1 flex items-center justify-between gap-6">
          {/* 1. Branding Lockup (Left) */}
          <Link href="/" className="flex items-center gap-3 sm:gap-4 shrink-0">
            <Image
              src={FramehouseLogo}
              alt="Framehouse Logo"
              className="h-6 sm:h-7 w-auto"
              priority
            />
            <Image
              src={HubLogo}
              alt="Framehouse Hub Logo"
              className="h-4 sm:h-5 w-auto opacity-80"
              priority
            />
          </Link>

          {/* 2. Desktop Navigation (Center) */}
          <nav className="hidden lg:flex items-center justify-center flex-1">
            <NavigationMenu>
              <NavigationMenuList className="gap-2">
                {menu.map((item: Record<string, unknown>) => {
                  if (item.group) {
                    return (
                      <NavigationMenuItem key={item.id as string}>
                        <NavigationMenuTrigger className={cn(
                          'text-sm font-medium transition-colors hover:text-primary whitespace-nowrap bg-transparent',
                          {
                            'text-primary': (item.subItems as Record<string, unknown>[])?.some((si: Record<string, unknown>) => (si.link as Record<string, unknown>).url && pathname.includes((si.link as Record<string, unknown>).url as string))
                          }
                        )}>
                          {item.menuTitle as string}
                        </NavigationMenuTrigger>
                        <NavigationMenuContent>
                          <ul className="grid w-[400px] gap-3 p-6 md:w-[500px] md:grid-cols-2 lg:w-[600px] bg-white dark:bg-[#1a1c1c] rounded-xl border border-black/5 dark:border-white/5">
                            {(item.subItems as Record<string, unknown>[])?.map((subItem: Record<string, unknown>) => (
                              <li key={subItem.id as string}>
                                <NavigationMenuLink asChild>
                                  <CMSLink
                                    {...(subItem.link as Record<string, unknown>)}
                                    className={cn(
                                      "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                                      "hover:bg-primary/5 group"
                                    )}
                                  >
                                    <div className="text-sm font-medium leading-none group-hover:text-primary transition-colors">
                                      {(subItem.link as Record<string, unknown>).label as string}
                                    </div>
                                    {!!(subItem.link as Record<string, unknown>).description && (
                                      <p className="line-clamp-2 text-xs leading-snug text-muted-foreground mt-1">
                                        {(subItem.link as Record<string, unknown>).description as string}
                                      </p>
                                    )}
                                  </CMSLink>
                                </NavigationMenuLink>
                              </li>
                            ))}
                          </ul>
                        </NavigationMenuContent>
                      </NavigationMenuItem>
                    )
                  }

                  return (
                    <NavigationMenuItem key={item.id as string}>
                      <NavigationMenuLink asChild>
                        <CMSLink
                          {...(item.link as Record<string, unknown>)}
                          size={'clear'}
                          className={cn(
                            'text-sm font-medium transition-colors hover:text-primary whitespace-nowrap px-4 py-2 rounded-md hover:bg-accent/50',
                            {
                              'text-primary': (item.link as Record<string, unknown>).url && (item.link as Record<string, unknown>).url !== '/' ? pathname.includes((item.link as Record<string, unknown>).url as string) : false,
                            }
                          )}
                        />
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  )
                })}
              </NavigationMenuList>
            </NavigationMenu>
          </nav>

          {/* 3. RHS Actions (Right) */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:flex items-center gap-4 md:gap-6">
              <Link
                href="/login"
                className={cn(
                  "text-sm font-medium transition-all duration-300",
                  "px-4 py-2 rounded-lg",
                  "border border-black/10 dark:border-white/10 hover:border-primary/30",
                  "hover:bg-primary/5 hover:text-primary"
                )}
              >
                Login
              </Link>
              <Link
                href="/demo"
                className="hidden md:block text-sm font-medium bg-primary text-primary-foreground px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
              >
                Request a Demo
              </Link>
            </div>

            {/* Mobile Navigation Trigger */}
            <div className="lg:hidden">
              <MobileMenu menu={menu as Record<string, unknown>[]} />
            </div>
          </div>
        </div>
      </motion.header>
    </div>
  )
}
