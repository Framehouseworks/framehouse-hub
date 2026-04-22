 
const url = process.env.NEXT_PUBLIC_SERVER_URL || 'https://hub.framehouseworks.com'

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: `${url}/sitemap.xml`,
  }
}
