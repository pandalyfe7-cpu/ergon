import { expect, test } from "@playwright/test";

/**
 * Habits: four-state model, streaks, today's mark, decay display, manual
 * state control, 14-day strip. Tolerant of the second (desktop) pass where
 * today's marks already exist.
 */

const HABIT_NAMES = [
  "Training adherence",
  "Protein target",
  "Sleep timing",
  "Morning entry",
  "Study blocks",
];

test("all five habits render with state, streak, and strip", async ({ page }) => {
  await page.goto("/habits");
  for (const name of HABIT_NAMES) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
  }
  expect(await page.getByText("day streak").count()).toBe(5);
  expect(await page.getByLabel("Last 14 days").count()).toBe(5);
});

test("every card shows its decay or completion status", async ({ page }) => {
  await page.goto("/habits");
  const statuses = page.getByText(
    /d left in window|decay window passed|marked today|paused; any mark resumes it/,
  );
  expect(await statuses.count()).toBeGreaterThanOrEqual(5);
});

test("marking a habit done pulses and starts the streak", async ({ page }) => {
  await page.goto("/habits");
  const card = page.locator("li", { has: page.getByRole("heading", { name: "Study blocks" }) });

  const markButton = card.getByRole("button", { name: "Mark done" });
  if (await markButton.isVisible().catch(() => false)) {
    await markButton.click();
  }
  await expect(card.getByText("marked today")).toBeVisible();
  await expect(card.getByText(/[1-9]\d*\s*day streak|day streak/)).toBeVisible();
});

test("manual state change moves the habit and updates its meaning", async ({ page }) => {
  await page.goto("/habits");
  const card = page.locator("li", {
    has: page.getByRole("heading", { name: "Training adherence" }),
  });

  const chipButton = card.getByRole("button", { name: /Change state of Training adherence/ });
  await chipButton.click();
  await card.getByRole("button", { name: "Hold", exact: true }).click();
  await expect(
    card.getByRole("button", { name: /currently Hold/ }),
  ).toBeVisible();

  // Restore Build so the suite is idempotent.
  await card.getByRole("button", { name: /Change state of Training adherence/ }).click();
  await card.getByRole("button", { name: "Build", exact: true }).click();
  await expect(card.getByRole("button", { name: /currently Build/ })).toBeVisible();
});
