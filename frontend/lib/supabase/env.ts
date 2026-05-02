export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim()

  return {
    url,
    key,
    isConfigured: Boolean(url && key),
  }
}

export function requireSupabaseEnv() {
  const { url, key, isConfigured } = getSupabaseEnv()
  if (!isConfigured || !url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY (see frontend/.env.example).",
    )
  }
  return { url, key }
}
