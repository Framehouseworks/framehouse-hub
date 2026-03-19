import iconLogo from '@/assets/framehouse_logo_transparent_padded.svg'
import Image from 'next/image'

export function LogoIcon() {
  return (
    <Image className='h-20' src={iconLogo} alt="Framehouse Logo Icon" />
  )
}
