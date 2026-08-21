"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "@/components/ui";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

function icon(path: React.ReactNode) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5 shrink-0"
      aria-hidden
    >
      {path}
    </svg>
  );
}

const ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Today",
    icon: icon(
      <>
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
      </>,
    ),
  },
  {
    href: "/guidance",
    label: "Guidance",
    icon: icon(
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="m14.8 9.2-1.6 4-4 1.6 1.6-4z" />
      </>,
    ),
  },
  {
    href: "/metrics",
    label: "Metrics",
    icon: icon(<path d="M5 19V12M12 19V5M19 19v-9" />),
  },
  {
    href: "/habits",
    label: "Habits",
    icon: icon(
      <>
        <path d="M4 12a8 8 0 0 1 13.6-5.7M20 12a8 8 0 0 1-13.6 5.7" />
        <path d="M17.6 3v3.4h-3.4M6.4 21v-3.4h3.4" />
      </>,
    ),
  },
  {
    href: "/history",
    label: "History",
    icon: icon(
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </>,
    ),
  },
  {
    href: "/log-food",
    label: "Food",
    icon: icon(
      <>
        <path d="M7 3v7a2 2 0 0 0 2 2v9M11 3v7a2 2 0 0 1-2 2M9 3v6" />
        <path d="M16 3c-1.5 1.5-2 4-2 6 0 2 .8 3 2 3v9" />
      </>,
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: icon(
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3" />
      </>,
    ),
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  pathname,
  variant,
}: {
  pathname: string;
  variant: "sidebar" | "bar";
}) {
  const sidebar = variant === "sidebar";
  return (
    <ul className={sidebar ? "flex flex-col gap-1 px-3" : "grid grid-cols-7"}>
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              title={item.label}
              className={cx(
                "flex min-h-12 items-center justify-center gap-3 text-sm",
                sidebar && "rounded-control min-h-0 justify-start px-3 py-2",
                active
                  ? sidebar
                    ? "text-accent bg-accent-soft"
                    : "text-accent"
                  : sidebar
                    ? "text-text-mid hover:text-text-hi hover:bg-surface-2"
                    : "text-text-mid hover:text-text-hi",
              )}
            >
              {item.icon}
              {sidebar && <span>{item.label}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Desktop: in-flow sticky sidebar (240px, 280px at 3xl). Mobile: fixed bottom
 * bar, icon-only with accessible names, 44px+ targets. Anchored during route
 * transitions.
 */
export function Nav() {
  const pathname = usePathname();

  return (
    <>
      <nav
        aria-label="Primary"
        style={{ viewTransitionName: "ergos-nav" }}
        className="border-border hidden shrink-0 border-r md:sticky md:top-0 md:flex md:h-dvh md:w-60 md:flex-col 3xl:w-70"
      >
        <div className="px-4 pt-6 pb-4">
          <Link href="/" className="text-text-hi text-xl font-semibold">
            ERGOS
          </Link>
        </div>
        <NavLinks pathname={pathname} variant="sidebar" />
      </nav>
      <nav
        aria-label="Primary"
        className="border-border bg-surface fixed inset-x-0 bottom-0 z-40 border-t md:hidden"
      >
        <NavLinks pathname={pathname} variant="bar" />
      </nav>
    </>
  );
}
