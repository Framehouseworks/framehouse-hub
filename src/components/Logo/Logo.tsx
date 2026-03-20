import longLogo from '@/assets/framehouse_logo_expanded_color.svg'
import Image from 'next/image'

export function Logo() {
  return (
    /* eslint-disable @next/next/no-img-element */
    <Image className='h-20' src={longLogo} alt="Framehouse Logo" />
  )
}
