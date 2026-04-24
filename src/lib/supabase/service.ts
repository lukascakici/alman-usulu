import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { env } from "@/lib/env";

// Privileged server-only client. RLS bypass eder.
// ASLA client component'e taşınmasın; 'server-only' koruması aşağıda.
import "server-only";

export function createSupabaseServiceClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: { "x-application": "alman-usulu-service" },
      },
    },
  );
}
