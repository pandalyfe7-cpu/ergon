import { ViewTransition } from "react";

/**
 * Route transitions (constitution §7): old content fades out fast, new content
 * rises in over 300ms. The template remounts per navigation, which drives the
 * enter/exit pair. The nav is anchored separately via `ergos-nav`.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="ergos-route" exit="ergos-route" default="none">
      {children}
    </ViewTransition>
  );
}
