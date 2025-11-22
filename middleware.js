// middleware.js
import { createMiddlewareClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next({
    request: {
      headers: new Headers(req.headers)
    }
  })

  const supabase = createMiddlewareClient({ req, res })
  await supabase.auth.getSession()

  if (req.nextUrl.pathname.startsWith('/login')) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  } else {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/', '/login', '/api/:path*']
}