import iconLogo from '@/assets/framehouse_logo_transparent_padded.svg'
import Image from 'next/image'

type Props = {
  className?: string
  size?: number
}

export function LogoIcon({ className, size = 40 }: Props) {
  return (
    <Image
      src={iconLogo}
      alt="Framehouse Hub"
      width={size}
      height={size}
      className={className}
      priority
    />
  )
}
