import type { Footer as FooterType } from '@/payload-types'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { FooterClient } from './index.client'

export async function Footer() {
  const footer: FooterType = await getCachedGlobal('footer', 1)()

  return <FooterClient footer={footer} />
}
