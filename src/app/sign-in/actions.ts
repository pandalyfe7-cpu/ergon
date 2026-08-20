"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function authenticate(
  _previous: { message: string | null },
  formData: FormData,
): Promise<{ message: string | null }> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { message: "Email and password required." };
  }

  const supabase = await createClient();

  if (formData.get("intent") === "create") {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { message: error.message };
    if (!data.session) return { message: "Confirm your email, then sign in." };
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { message: error.message };
  }

  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
