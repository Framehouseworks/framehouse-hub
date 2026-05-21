import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  if (process.env.COMING_SOON !== 'true') {
    return NextResponse.next()
  }

  // Allow the coming-soon page itself and all its assets through
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/coming-soon')) {
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL('/coming-soon', request.url))
}

export const config = {
  // Match all app routes; skip static files, _next internals, API, and admin
  matcher: ['/((?!api|_next/static|_next/image|admin|favicon\\.ico|favicon\\.svg|assets).*)'],
}
