"use client";

/**
 * Command palette (constitution §5, §8). Cmd/Ctrl+K opens navigation and
 * actions; Cmd/Ctrl+J opens quick-add only. Screens contribute commands with
 * usePaletteCommands. Opening is signature moment 4: scale from 0.97 with
 * fade, 150ms.
 */

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type PaletteCommand = {
  id: string;
  label: string;
  group: "Navigate" | "Add" | "Do";
  /** Extra substrings that should match this command. */
  keywords?: string;
  run: () => void;
};

type Registry = {
  register: (owner: string, commands: PaletteCommand[]) => void;
  unregister: (owner: string) => void;
};

const RegistryContext = createContext<Registry | null>(null);

/** Screens call this to add their commands while mounted. */
export function usePaletteCommands(commands: PaletteCommand[]) {
  const registry = useContext(RegistryContext);
  const owner = useId();
  useEffect(() => {
    if (!registry) return;
    registry.register(owner, commands);
    return () => registry.unregister(owner);
    // Callers pass stable arrays built with useMemo.
  }, [registry, owner, commands]);
}

const NAV_TARGETS = [
  { id: "nav-today", label: "Today", href: "/today" },
  { id: "nav-guidance", label: "Guidance", href: "/guidance" },
  { id: "nav-metrics", label: "Metrics", href: "/metrics" },
  { id: "nav-habits", label: "Habits", href: "/habits" },
  { id: "nav-history", label: "History", href: "/history" },
  { id: "nav-food", label: "Food", href: "/log-food" },
  { id: "nav-settings", label: "Settings", href: "/settings" },
];

function matchIndex(haystack: string, query: string): number {
  return haystack.toLowerCase().indexOf(query.toLowerCase());
}

function Highlight({ label, query }: { label: string; query: string }) {
  if (!query) return <span className="text-text-hi">{label}</span>;
  const at = matchIndex(label, query);
  if (at < 0) return <span className="text-text-mid">{label}</span>;
  return (
    <span className="text-text-mid">
      {label.slice(0, at)}
      <span className="text-text-hi">{label.slice(at, at + query.length)}</span>
      {label.slice(at + query.length)}
    </span>
  );
}

export function PaletteProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState<false | "all" | "add">(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [dynamic, setDynamic] = useState<ReadonlyMap<string, PaletteCommand[]>>(
    new Map(),
  );

  const registry = useMemo<Registry>(
    () => ({
      register(owner, commands) {
        setDynamic((current) => new Map(current).set(owner, commands));
      },
      unregister(owner) {
        setDynamic((current) => {
          const next = new Map(current);
          next.delete(owner);
          return next;
        });
      },
    }),
    [],
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => (current === "all" ? false : "all"));
        setQuery("");
        setActive(0);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") {
        event.preventDefault();
        setOpen((current) => (current === "add" ? false : "add"));
        setQuery("");
        setActive(0);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Route changes close the palette (state reset during render, not an effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) close();
  }

  const commands = useMemo<PaletteCommand[]>(() => {
    const nav: PaletteCommand[] = NAV_TARGETS.map((t) => ({
      id: t.id,
      label: t.label,
      group: "Navigate",
      keywords: t.href,
      run: () => router.push(t.href),
    }));
    const contributed = [...dynamic.values()].flat();
    return [
      ...contributed.filter((c) => c.group === "Add"),
      ...contributed.filter((c) => c.group === "Do"),
      ...nav,
    ];
  }, [router, dynamic]);

  const visible = useMemo(() => {
    const pool = open === "add" ? commands.filter((c) => c.group === "Add") : commands;
    if (!query) return pool;
    return pool.filter(
      (c) => matchIndex(c.label, query) >= 0 || (c.keywords && matchIndex(c.keywords, query) >= 0),
    );
  }, [commands, open, query]);

  const activeIndex = Math.min(active, Math.max(visible.length - 1, 0));

  function onInputKey(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((n) => Math.min(n + 1, visible.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((n) => Math.max(n - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const command = visible[activeIndex];
      if (command) {
        close();
        command.run();
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }

  return (
    <RegistryContext.Provider value={registry}>
      {children}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-bg/60"
          onClick={close}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={open === "add" ? "Quick add" : "Command palette"}
            className="palette-in bg-surface-2 border-border shadow-overlay rounded-card mx-auto mt-[10vh] w-[calc(100%-32px)] max-w-lg border"
            onClick={(event) => event.stopPropagation()}
          >
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onInputKey}
              placeholder={open === "add" ? "Quick add" : "Type a command or screen"}
              aria-label={open === "add" ? "Quick add" : "Command"}
              className="num border-border text-text-hi placeholder:text-text-low w-full border-b bg-transparent px-4 py-3 text-sm outline-none"
            />
            <ul className="max-h-80 overflow-y-auto p-2" role="listbox">
              {visible.length === 0 && (
                <li className="text-text-mid px-3 py-2 text-sm">
                  No command matches. Clear the search to see everything.
                </li>
              )}
              {visible.map((command, index) => (
                <li key={command.id} role="option" aria-selected={index === activeIndex}>
                  <button
                    className={
                      "rounded-control flex w-full items-center justify-between px-3 py-2 text-left text-sm " +
                      (index === activeIndex ? "bg-accent-soft" : "hover:bg-surface")
                    }
                    onMouseEnter={() => setActive(index)}
                    onClick={() => {
                      close();
                      command.run();
                    }}
                  >
                    <Highlight label={command.label} query={query} />
                    <span className="num text-text-low text-xs">{command.group}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </RegistryContext.Provider>
  );
}
