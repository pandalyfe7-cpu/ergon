import { expect, test, type Page } from "@playwright/test";

import { clearTodayLogs, resetTodaysRecommendations, testUserId } from "./db";

/**
 * Failure paths: server-action POSTs are aborted at the network layer, and
 * every representative write must revert its optimistic state, raise a
 * failure toast naming what broke, and succeed via the toast's Retry once the
 * network returns.
 */

async function blockWrites(page: Page) {
  await page.route("**/*", (route) =>
    route.request().method() === "POST" ? route.abort("connectionfailed") : route.continue(),
  );
}

async function unblockWrites(page: Page) {
  await page.unroute("**/*");
}

test("habit log fails, reverts, and retries", async ({ page }) => {
  await clearTodayLogs(await testUserId());
  await page.goto("/today");
  const habit = page.getByTestId("today-item-study-blocks");
  await expect(habit.getByRole("button", { name: "Log Study blocks" })).toBeVisible();

  await blockWrites(page);
  await habit.getByRole("button", { name: "Log Study blocks" }).click();

  const alert = page.getByRole("alert").filter({ hasText: "Could not log habit" });
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("Network error");
  await expect(habit.getByRole("button", { name: "Log Study blocks" })).toBeVisible();

  await unblockWrites(page);
  await alert.getByRole("button", { name: "Retry" }).click();
  await expect(habit.getByText("Logged")).toBeVisible();
});

test("recommendation accept fails, reverts, and retries", async ({ page }) => {
  await resetTodaysRecommendations(await testUserId());
  await page.goto("/guidance");
  const card = page.getByRole("article").first();
  await expect(card).toBeVisible();

  await blockWrites(page);
  await card.getByRole("button", { name: "Accept" }).click();

  const alert = page.getByRole("alert").filter({ hasText: "Could not accept" });
  await expect(alert).toBeVisible();
  // The card came back instead of vanishing silently.
  await expect(page.getByRole("article").first()).toBeVisible();

  await unblockWrites(page);
  await alert.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("Accepted").first()).toBeVisible();
});

test("habit state change fails, reverts, and retries", async ({ page }) => {
  await page.goto("/habits");
  const card = page.locator("li", {
    has: page.getByRole("heading", { name: "Sleep timing" }),
  });

  // Normalize to Build first: if a previous run left the habit on Hold, the
  // post-retry assertion would pass vacuously and race the restore step.
  const chip = card.getByRole("button", { name: /Change state of Sleep timing/ });
  await expect(chip).toBeVisible();
  if (!(await card.getByRole("button", { name: /currently Build/ }).isVisible())) {
    await chip.click();
    await card.getByRole("button", { name: "Build", exact: true }).click();
    await expect(card.getByRole("button", { name: /currently Build/ })).toBeVisible();
  }

  await blockWrites(page);
  await card.getByRole("button", { name: /Change state of Sleep timing/ }).click();
  await card.getByRole("button", { name: "Hold", exact: true }).click();

  const alert = page.getByRole("alert").filter({ hasText: "State not changed" });
  await expect(alert).toBeVisible();

  await unblockWrites(page);
  await alert.getByRole("button", { name: "Retry" }).click();
  await expect(card.getByRole("button", { name: /currently Hold/ })).toBeVisible();

  // Restore.
  await card.getByRole("button", { name: /Change state of Sleep timing/ }).click();
  await card.getByRole("button", { name: "Build", exact: true }).click();
  await expect(card.getByRole("button", { name: /currently Build/ })).toBeVisible();
});

test("meal serving step fails, reverts, and retries", async ({ page }) => {
  // Log a meal first (unblocked) so there is a row to edit.
  await page.goto("/log-food");
  await page.getByLabel("Search foods").fill("E2E Chicken");
  const match = page.getByRole("button", { name: /E2E Chicken/ }).first();
  await expect(match).toBeVisible();
  await match.click();
  await expect(page.getByText("E2E Chicken logged")).toBeVisible();

  await blockWrites(page);
  await page.getByLabel("More E2E Chicken").first().click();

  const alert = page.getByRole("alert").filter({ hasText: "Serving not saved" });
  await expect(alert).toBeVisible();
  // Reverted to the original serving.
  await expect(page.getByText(/×\s*1(?!\.)/).first()).toBeVisible();

  await unblockWrites(page);
  await alert.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText(/×\s*1\.25/).first()).toBeVisible();

  // Clean up the logged row.
  await page.getByLabel("Delete E2E Chicken").first().click();
  await expect(page.getByText("E2E Chicken removed")).toBeVisible();
});

test("settings weight edit fails and retries", async ({ page }) => {
  await page.goto("/settings");
  const staleness = page.getByLabel("Weight staleness");

  await blockWrites(page);
  await staleness.fill("1.2");
  await staleness.blur();

  const alert = page.getByRole("alert").filter({ hasText: "Weights not saved" });
  await expect(alert).toBeVisible();
  // Rolled back to the stored value.
  await expect(page.getByLabel("Weight staleness")).toHaveValue("1");

  await unblockWrites(page);
  await alert.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("Weights saved")).toBeVisible();

  // Restore defaults.
  const reset = page.getByRole("button", { name: "Reset to defaults" });
  await reset.click();
  await expect(page.getByText("Weights reset to defaults")).toBeVisible();
});
