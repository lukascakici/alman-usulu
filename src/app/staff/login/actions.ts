"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  next: z.string().optional(),
});

// Server action'dan döndürülen hata mesajı (başarı halinde redirect fırlatılır,
// bu fonksiyon hiç return etmez).
export async function signInAction(formData: FormData): Promise<{ error: string } | void> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return { error: "E-posta ve şifreyi kontrol edin." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "E-posta veya şifre hatalı." };
  }

  // redirect() içeride özel bir error fırlatır; Next.js yakalar ve yönlendirir.
  redirect(parsed.data.next && parsed.data.next.startsWith("/") ? parsed.data.next : "/staff/mutfak");
}
