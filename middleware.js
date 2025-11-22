// middleware.js 
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  const requestHeaders = new Headers(request.headers)
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          requestHeaders.set('set-cookie', `${name}=${value}; Path=/; ${options ? Object.entries(options).map(([k, v]) => `${k}=${v}`).join('; ') : ''}`)
        },
        remove(name, options) {
          requestHeaders.set('set-cookie', `${name}=deleted; Path=/; Max-Age=0`)
        },
      },
    }
  )

  await supabase.auth.getSession()

  const { data: { session } } = await supabase.auth.getSession()
  const pathname = request.nextUrl.pathname

  // Protect (app) routes
  if (pathname.startsWith('/(app)') && !session) {
    return NextResponse.redirect(new URL('/(auth)/login', request.url))
  }

  // Redirect logged-in users from auth pages
  if (pathname.startsWith('/(auth)') && session) {
    return NextResponse.redirect(new URL('/(app)', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}