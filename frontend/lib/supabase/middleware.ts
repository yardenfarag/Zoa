import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseEnv } from "./env"

export async function updateSession(request: NextRequest) {
  const { url, key, isConfigured } = getSupabaseEnv()
  if (!isConfigured || !url || !key) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options)
        })
      },
    },
  })

  await supabase.auth.getUser()

  return supabaseResponse
}
