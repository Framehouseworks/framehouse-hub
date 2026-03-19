import React from 'react'

export function LogoIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      aria-label={`Payload logo`}
      width="110" 
      height="170" 
      viewBox="0 0 110 170" 
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <rect width="50" height="50" rx="5" fill="#D79922" />
      <rect y="60" width="50" height="75" rx="5" fill="#F13C1F" />
      <rect x="60" width="50" height="75" rx="5" fill="#C5CBE3" />
      <rect x="60" y="85" width="50" height="25" rx="5" fill="#4056A1" />
      <rect y="145" width="50" height="25" rx="5" fill="#EFE1BA" />
    </svg>
  )
}
