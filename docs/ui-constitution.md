# ERGOS UI Constitution

Version: 3.0.0

This document is binding. Where it conflicts with an agent's defaults, a library's defaults, or any styling instruction elsewhere, this document wins. Do not introduce any visual value (color, size, duration, radius) that is not defined here. If a needed value is missing, ask; do not invent.

Screens, acceptance criteria, and "done" live in [PRODUCT-SPEC.md](PRODUCT-SPEC.md). This file is tokens, motion, copy, and the three component specs that the spec names: screens pointer, coach sheet, trace block.

## 1. Identity

ERGOS is a clean, functional instrument with a quiet futuristic edge. Calm dark surfaces, one luminous accent, motion that feels engineered rather than decorative. The user opens it many times a day, so clarity and speed always beat spectacle: nothing flashes, nothing competes for attention, and the data is always the brightest thing on screen.

It is a log, not a dashboard. One place to write things down during the day. Reference feel for the log: Success Life Coach Day Planner and habit trackers. Reference feel for the coach overlay: TaskCoach, Purpose, Rosebud, Mindsera, Habit Coach AI. Match clarity, not branding.

The signature element is the **trace**: every recommendation and derived metric can expand its provenance on demand as a monospace log of rule ids and the data rows they read. It reinforces trust and gives the app its instrument character.

## 2. Color tokens

Dark theme only. One accent. Semantic colors carry meaning; nothing is colored for decoration.

| Token | Hex | Use |
|---|---|---|
| `bg` | `#0E1015` | App background |
| `surface` | `#151823` | Cards, panels, inputs |
| `surface-2` | `#1C2030` | Hover states, nested surfaces, overlays |
| `border` | `#262B3D` | All borders, 1px solid |
| `text-hi` | `#F0F2F8` | Primary text, values, headings |
| `text-mid` | `#9AA3B8` | Labels, secondary text, units |
| `text-low` | `#5E6680` | Disabled, placeholders, timestamps |
| `accent` | `#4D9FFF` | Primary actions, active nav, selected states, focus rings, progress |
| `accent-soft` | `#4D9FFF` at 12% opacity | Accent backgrounds: selected rows, active tab fill, glow base |
| `positive` | `#3DD68C` | Improving trends, completed sets, success confirms |
| `negative` | `#F2555A` | Declining trends, errors, destructive actions |
| `warning` | `#FFB224` | Decaying habits, approaching-deadline states |

Rules:

- Primary buttons: `accent` background, `#0E1015` text. Secondary: `surface` with `border`. Destructive: secondary with `negative` text and border.
- Semantic colors (`positive`, `negative`, `warning`) color text, small indicators, thin borders, and chart strokes. Never full card backgrounds.
- Gradients are allowed in exactly two places: a subtle vertical gradient on primary buttons (`accent` to `accent` darkened 8%), and chart area fills fading accent to transparent. Nowhere else.
- Glow is allowed only as a soft accent halo on focused inputs, the active primary button, and a one-time completion pulse (see Motion). Implemented as a pre-rendered shadow on a pseudo-element whose opacity animates. Low intensity; if it is noticeable from across the room it is too strong.
- No glassmorphism, no noise textures, no decorative iconography, no rainbow charts. Elevation is border plus background step; drop shadows only on overlays (coach sheet, modals, toasts) at low spread.
- No pure `#000000` or `#FFFFFF`.

## 3. Typography

Two faces, fixed roles:

- **JetBrains Mono**: all numbers, metrics, loads, reps, RPE, timestamps, rule ids, streaks, and trace output. Tabular numerals always (`font-variant-numeric: tabular-nums`).
- **Inter**: UI labels, body copy, buttons, navigation, empty-state text.

Scale, exhaustive: `12 / 14 / 16 / 20 / 24 / 32px`.

| Role | Face | Size / weight |
|---|---|---|
| Hero metric value | JetBrains Mono | 32 / 500 |
| Screen title | Inter | 20 / 600 |
| Section label | Inter | 12 / 500, uppercase, 0.06em tracking, `text-mid` |
| Body, buttons | Inter | 14 / 400–500 |
| Standard data value | JetBrains Mono | 16–24 / 500 |
| Inline data, inputs | JetBrains Mono | 14 / 400 |
| Trace lines, timestamps | JetBrains Mono | 12 / 400, `text-low` or `text-mid` |

Line height 1.5 for body, 1.2 for data values. No italics. No weights above 600.

## 4. Geometry

- Spacing unit: **4px**. Every margin, padding, and gap is a multiple. Common steps: 4, 8, 12, 16, 24, 32.
- Radius: **10px** cards and modals, **8px** buttons and inputs, **6px** small controls and chips, **full** only on progress rings and status dots.
- Borders: 1px solid `border` on surfaces sitting on `bg`.
- Max content width 720px for single-column screens (Today, Onboarding, Settings, How ERGOS works). Progress and Train may use full width to 1440px.
- Touch targets minimum 44px tall on mobile even when the visual element is smaller.

## 5. Components

- **Buttons.** Primary: accent gradient fill, 14/500 Inter, 10px vertical and 14px horizontal padding. Press feedback: scale to 0.98 over 120ms. Disabled: `surface-2` fill, `text-low` text, no pointer events.
- **Inputs.** `surface` fill, `border` border, mono face for numeric fields. Focus: 2px `accent` ring plus soft glow. Inline validation in 12px under the field, `negative`, naming exactly what is wrong.
- **Cards.** `surface`, 1px border, 16px padding, 10px radius. One decision or one entity per card. Hover on interactive cards: background steps to `surface-2` and border lightens, 120ms.
- **Today list item.** One habit, metric, or session link. Highlighted next item: `accent-soft` fill, 2px `accent` border, or equivalent token-only treatment. Habit: one tap target. Metric: one numeric input. Session: navigates to Train. Logged rows show a trace affordance.
- **Recommendation / plan line.** Action in Inter 14/500; reason in Inter 14/400 `text-mid`; estimated time and target metric as mono 12 chips. Trace affordance expands the trace block inline.
- **Metrics.** Hero value in mono 32 with unit in `text-mid`; 7-day trend as a small accent sparkline with semantic-colored delta; progress toward target as a thin accent ring or bar.
- **Tables and set logging.** Mono, tabular nums, right-aligned numbers, 8px cell padding, horizontal row borders only, header in section-label style. Logging a set marks the row with a `positive` check and a single completion pulse.
- **Toasts.** Bottom-right desktop, bottom mobile. One line, auto-dismiss 4s; failure toasts persist and carry retry.

### Screens

MVP has exactly five screens, defined in [PRODUCT-SPEC.md](PRODUCT-SPEC.md): Onboarding, Today, Progress, Train, Settings. Plus the coach sheet overlay and the "How ERGOS works" tutorial reachable from Settings. Do not add a sixth primary destination. Do not reintroduce Guidance, Food, Habits, History, or Metrics as top-level tabs. Habits and metrics are Today/Progress items, not destinations.

### Coach sheet

Overlay from a fixed button present on every screen, including onboarding after the first step. `surface` panel, 1px `border`, overlay drop shadow as specified in §2. Width: full on mobile; max 420px on desktop, docked to the trailing edge or as a bottom sheet — pick one and keep it. Does not navigate away.

Layout, top to bottom: heading "Coach" (screen-title style); message list (Inter 14 body, mono for numbers); composer (textarea + primary "Send"). Coach replies show action, reason, explanation file id as a quiet chip, then a collapsed trace block.

Pending proposals (plan edits, program changes) render as a confirm row: primary "Confirm" and secondary "Dismiss". Nothing is written until Confirm.

Reduced motion: opacity fade only, under 150ms.

### Trace block

Collapsible monospace log under any recommendation, derived number, gate output, or coach reply. Default collapsed. Affordance label: "Trace" (sentence case). Expanded: `surface-2`, 1px `border`, 12/400 JetBrains Mono, `text-low` or `text-mid`, 8px padding.

Line format:

1. `rule_id@version`
2. One line per input row: `table id field=value …` (the field values actually read)
3. Coach traces: `explanation:{file-id}` lines, then row ids as above

Never recompute. Render the stored provenance payload. Empty provenance is a bug, not a hidden block.

## 6. States

Every data-backed view implements all three, designed, not defaulted:

- **Loading.** Skeletons matching the exact shape and count of real content, `surface-2` blocks with a slow 1.5s opacity shimmer. No spinners anywhere.
- **Empty.** One sentence stating what will appear here and the single action that produces it. No illustrations, no mascots, no exclamation marks.
- **Error.** Name what failed in plain words, what was kept safe ("your set was not saved"), and a retry action. Errors never apologize and are never vague.

Optimistic writes: the UI reflects the write immediately, marks the row subtly pending (mono timestamp in `text-low` until confirmed), and on failure reverts visibly with a persistent failure toast and retry.

## 7. Motion

Motion makes the app feel engineered and alive, but it explains and confirms; it never entertains. The test for any animation: does it tell the user something happened, where something went, or what is active? If not, cut it.

Base rules:

- Durations: 120–150ms micro-feedback (hover, press), 200–250ms entrances and layout changes, 300ms route transitions, 400ms absolute ceiling for the two signature moments below.
- Standard easing: `cubic-bezier(0.2, 0.8, 0.2, 1)` for entrances, ease-in for exits. No bounce, no overshoot beyond the 0.98 press scale, no parallax, no scroll-triggered effects.
- Animate `transform` and `opacity` only. Glows animate a pseudo-element's opacity, never `box-shadow` directly.
- Shared-element continuity on route change where an element persists (e.g. a metric card expanding into its detail view). This is the primary "futuristic" feel: screens flow into each other instead of swapping.

Signature moments, exhaustive list; do not add more:

1. **Staggered entrance**: cards on a screen enter with a 12px rise and fade, 30ms stagger, capped at 6 items. First load of a screen only, not on refresh.
2. **Completion pulse**: logging a set or completing a habit fires one soft `positive` glow pulse on that row, 400ms, once.
3. **Count-up**: hero metric values count from previous to current over 300ms on load.
4. **Coach sheet open**: overlay scales from 0.97 with fade, 150ms.

Hard limits:

- `prefers-reduced-motion`: drop everything except opacity fades under 150ms; count-ups render final values instantly.
- No animation ever blocks input; everything is clickable mid-transition.
- Today list items never move on refresh in a way that displaces what is about to be tapped.
- Never more than one signature moment playing at once; if two would overlap, the later one wins and the earlier is skipped.

## 8. Keyboard and accessibility

- Every primary action reachable without a mouse; tab order matches visual order.
- Focus visible when navigating by keyboard: 2px `accent` ring, 2px offset. Never `outline: none` without a replacement.
- Coach sheet on a documented shortcut; screen-local shortcuts documented in Settings. Do not implement a command palette or quick-add.
- All text meets WCAG AA against its background; do not create new color pairs without checking.
- All interactive elements have accessible names; icon-only buttons carry `aria-label`.

## 9. Copy

- Sentence case everywhere, including buttons and headings. All-caps only in the 12px section-label style.
- Buttons say what happens: "Log set", "Save weights", never "Submit" or "OK". An action keeps its name through its whole flow.
- Numbers with units: unit in `text-mid` after the mono value ("185 lb", "7.2 h").
- No motivational copy, no praise, no emoji, no exclamation marks. The app reports state; it does not cheerlead.
- Reasons and traces name actual data: "pull pattern last trained 6 days ago", never "it's been a while".

## 10. Implementation rules

- All tokens live as CSS variables in `globals.css` and are mapped into the Tailwind config. Components consume Tailwind classes bound to tokens. Zero raw hex values, raw px font sizes, or arbitrary-value magic numbers in component files.
- One component, one file, colocated by feature under `app/` or `components/` per existing repo structure. Server components by default; `"use client"` only where interaction requires it.
- Dark theme only. No light theme or theme-switching machinery.
- No styled component libraries (no shadcn themes, MUI, Chakra). Unstyled headless primitives (Radix primitives, Headless UI) are allowed and restyled with these tokens. Framer Motion is allowed for the shared-element and signature moments; CSS transitions for everything else.
- Any change to this document bumps its version and is recorded in the changelog.

## Changelog

- 3.0.0: added Screens (pointer to PRODUCT-SPEC), Coach sheet, and Trace block component specs; replaced command palette as a required component with the coach overlay; signature moment 4 is now coach-sheet open; identity references the log-not-dashboard product.
- 2.0.0: replaced monochrome direction with accent-based futuristic-minimal direction; expanded motion system with four signature moments; radius and type scale updated.
- 1.0.0: initial constitution.
