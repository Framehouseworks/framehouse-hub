import React from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { MobileNav } from './MobileNav'

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar - Desktop Only */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:pl-[280px]">
        {/* Top Bar - Sticky */}
        <TopBar />

        {/* Content Container */}
        <main className="flex-1 px-4 py-8 sm:px-8 sm:py-12 pb-32 lg:pb-12">
          <div className="max-w-[1600px] mx-auto">{children}</div>
        </main>
      </div>

      {/* Mobile Navigation - Fixed Bottom */}
      <MobileNav />
    </div>
  )
}
