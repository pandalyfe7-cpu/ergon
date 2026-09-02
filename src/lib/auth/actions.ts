"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getOnboardingState } from "@/lib/onboarding/profile";

async function requestOrigin(): Promise<string | null> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (!host) return null;
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function signIn(
  _previous: { message: string | null },
  formData: FormData,
): Promise<{ message: string | null }> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { message: "Email and password required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { message: "Sign in failed. Email or password was not accepted." };

  const onboarding = await getOnboardingState(supabase);
  redirect(onboarding.complete ? "/" : "/onboarding");
}

export async function signUp(
  _previous: { message: string | null; confirm?: boolean },
  formData: FormData,
): Promise<{ message: string | null; confirm?: boolean }> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!email || !password) {
    return { message: "Email and password required." };
  }
  if (password !== confirm) {
    return { message: "Passwords do not match." };
  }

  const supabase = await createClient();
  const origin = await requestOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: origin ? { emailRedirectTo: `${origin}/auth/callback` } : undefined,
  });
  if (error) {
    const duplicate = /already/i.test(error.message);
    return {
      message: duplicate
        ? "An account with that email already exists."
        : error.message,
    };
  }
  if (!data.session) {
    return { message: "Confirm your email, then sign in.", confirm: true };
  }

  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
