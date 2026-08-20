/**
 * Wraps a server-action call so a network-level failure surfaces as the same
 * { error } shape the actions return, instead of an unhandled rejection.
 * Never use on actions that redirect; those must propagate.
 */
export async function call<T extends object>(
  action: Promise<T>,
): Promise<T | { error: string }> {
  try {
    return await action;
  } catch {
    return { error: "Network error. Check your connection and retry." };
  }
}
