"use server";

import { signOut } from "@/lib/modules/staff/current";

export async function signOutAction() {
  await signOut();
}
