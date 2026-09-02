# MVP manual test checklist

Run on your **deployed Vercel URL** on a phone (or desktop). Use a **new email** you have not used before. If anything fails, note the step number and the **Broken** line for that step.

---

## 1. Open sign-up

**Action:** Open `/sign-up` (or tap **Create account** from welcome).

**Expected:** Sign-up form with Email, Password, Confirm password, and **Create account**.

**Broken:** Stays on welcome, shows a server error, or no form fields.

---

## 2. Create account

**Action:** Enter a new email and password (twice), tap **Create account**.

**Expected:** Lands on **onboarding** (URL contains `/onboarding`). Heading: **Name up to three outcomes. Rank them.** **Sign out** visible top-right.

**Broken:** “Confirm your email” message, stays on sign-up with an error, or lands on Today/sign-in without onboarding.

---

## 3. Enter goals

**Action:** Fill **Goal 1** (e.g. `Train consistently at the gym`). Leave 2 and 3 empty. Tap **Continue**.

**Expected:** Intake screen. Heading: **How are things right now?** Barrier sliders with scale hints (`0 = not an issue · 100 = a major issue`).

**Broken:** Stays on goals, error text in red, or blank screen.

---

## 4. Complete intake

**Action:** Leave sliders at defaults. Tap **Build my plan**.

**Expected:** Plan review. Heading: **Your plan**. Habits show **friendly names** (e.g. “Morning entry”, not `morning-entry`). **Continue to Today** button visible.

**Broken:** Stays on intake, empty plan, or raw slugs only.

---

## 5. Finish onboarding

**Action:** Tap **Continue to Today**.

**Expected:** URL is `/today`. Heading: **Today** with today’s date. List of habits and metrics (not empty).

**Broken:** Stuck on plan review, `/onboarding` with error, or empty “No plan items” message.

---

## 6. Log a habit

**Action:** Tap **Log** on the first highlighted habit row (accent border).

**Expected:** **Logged** appears **immediately** (within about a second). Log button disappears. Optional: brief pending timestamp under Logged until confirmed.

**Broken:** Button spins with no Logged for several seconds, error toast, or Log button still visible after 5+ seconds.

---

## 7. Log a metric

**Action:** On a metric row (e.g. **Protein intake**), enter a number (e.g. `165`), tap **Save**.

**Expected:** Value shows with **Logged** (e.g. `165g Logged`).

**Broken:** Save does nothing, error toast, or value clears without Logged.

---

## 8. Expand a trace

**Action:** On a logged row, tap **Trace**.

**Expected:** Monospace block expands showing a rule id (e.g. `today_habit_log@…`) and row ids (e.g. `habit_events` or `metric_logs`).

**Broken:** No Trace button on logged rows, or Trace does nothing / empty block.

---

## 9. Sign out

**Action:** Go to **Settings** (nav). Tap **Sign out**.

**Expected:** Lands on **Sign in**. Today and other app routes are not accessible without signing in again.

**Broken:** Still signed in, error, or blank page.

---

## 10. Sign back in and confirm persistence

**Action:** Sign in with the same email/password. Open **Today** (`/today`).

**Expected:** Previously logged habit still shows **Logged**. Previously logged metric still shows its value and **Logged**.

**Broken:** Logs missing, back at onboarding, or empty Today list.

---

## Quick reference: routes

| Route | MVP status |
|-------|------------|
| `/onboarding` | Active — first-run flow |
| `/today` | Active — main screen |
| `/settings` | Active |
| `/train` | Minimal placeholder |
| `/progress` | **Not built** (task 03) — expect 404 or redirect, not MVP |
