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

/**
 * Desktop: fixed left sidebar. Mobile: fixed bottom bar, icon-only with
 * accessible names, 44px+ targets. Anchored during route transitions.
 */
export function Nav() {
  const pathname = usePathname();

  return (
    <>
      <nav
        aria-label="Primary"
        style={{ viewTransitionName: "ergos-nav" }}
        className="border-border bg-surface fixed inset-x-0 bottom-0 z-40 border-t lg:inset-x-auto lg:inset-y-0 lg:left-0 lg:w-56 lg:border-t-0 lg:border-r lg:bg-transparent"
      >
        <div className="hidden px-4 pt-6 pb-4 lg:block">
          <Link href="/" className="text-text-hi text-xl font-semibold">
            ERGOS
          </Link>
        </div>
        <ul className="grid grid-cols-7 lg:grid-cols-1 lg:gap-1 lg:px-3">
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
                    "flex min-h-12 items-center justify-center lg:min-h-0 lg:justify-start",
                    "lg:rounded-control gap-3 text-sm lg:px-3 lg:py-2",
                    active
                      ? "text-accent lg:bg-accent-soft"
                      : "text-text-mid hover:text-text-hi lg:hover:bg-surface-2",
                  )}
                >
                  {item.icon}
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
