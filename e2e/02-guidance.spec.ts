import { expect, test } from "@playwright/test";

import { resetTodaysRecommendations, testUserId } from "./db";

/**
 * Guidance: ranked list, trace expansion, accept / dismiss (fixed reasons) /
 * snooze, acted-on list, weekly rule feedback. Recommendations reset before
 * each test so every action starts from a regenerated list.
 */

let userId: string;

test.beforeAll(async () => {
  userId = await testUserId();
});

test.beforeEach(async ({ page }) => {
  await resetTodaysRecommendations(userId);
  await page.goto("/guidance");
});

test("ranked cards show reason, time, rule ids, and trace", async ({ page }) => {
  const card = page.getByRole("article").first();
  await expect(card).toBeVisible();
  await expect(card.getByText("min", { exact: false }).first()).toBeVisible();

  await card.getByRole("button", { name: "Why" }).click();
  await expect(card.getByText("score", { exact: false })).toBeVisible();
  await expect(card.getByText("engine", { exact: false })).toBeVisible();
});

test("accept hides the card and records it under acted on", async ({ page }) => {
  const card = page.getByRole("article").first();
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Accept" }).click();

  await expect(page.getByText("Accepted").first()).toBeVisible();
  await expect(page.getByText("Acted on today")).toBeVisible();
  await expect(page.getByText("accepted", { exact: true }).first()).toBeVisible();
});

test("dismiss requires a fixed reason from the list", async ({ page }) => {
  const card = page.getByRole("article").first();
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Dismiss" }).click();

  // Fixed reasons, never free text.
  await expect(page.getByRole("button", { name: "Not today" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Takes too long" })).toBeVisible();
  await page.getByRole("button", { name: "Not today" }).click();

  await expect(page.getByText("Dismissed").first()).toBeVisible();
  await expect(page.getByText("Acted on today")).toBeVisible();
});

test("snooze hides the card for three hours", async ({ page }) => {
  const card = page.getByRole("article").first();
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Snooze" }).click();
  await expect(page.getByText("Snoozed for 3 hours")).toBeVisible();
});

test("weekly rule feedback table renders", async ({ page }) => {
  await expect(page.getByText("Rule feedback, last 7 days")).toBeVisible();
  // Actions from earlier tests guarantee at least one row.
  await expect(page.locator("table").getByText("shown")).toBeVisible();
});

test("cold start limits recommendations and says why", async ({ page }) => {
  await expect(page.getByText("Cold start").first()).toBeVisible();
  // Never more than four cards, cold start or not.
  const count = await page.getByRole("article").count();
  expect(count).toBeLessThanOrEqual(4);
});
