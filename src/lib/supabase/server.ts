import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";
import { env } from "@/lib/env";

// Server Components / Route Handlers için.
// anon key + kullanıcı oturumu (Supabase Auth cookie'leri).
// Staff paneli bunu kullanır; müşteri tarafı için service.ts.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component'ten cookie yazmak hata verir; Route Handler'dan OK.
            // Burayı yut — Supabase zaten set etmeyi dener ve server component'te no-op.
          }
        },
      },
    },
  );
}
