import { expect, test, type Page } from "@playwright/test";

/**
 * Today: morning entry, cold start, session start / inline set logging /
 * finish. Tolerant of prior-run state: the suite runs twice (mobile, desktop)
 * against the same user and day.
 */

async function openMorningForm(page: Page) {
  const editButton = page.getByRole("button", { name: "Edit", exact: true });
  const field = page.getByLabel("Sleep hours");
  // Wait for the card to render as either the summary or the open form.
  await expect(editButton.or(field).first()).toBeVisible();
  if (await editButton.isVisible()) {
    await editButton.click();
  }
  await expect(field).toBeVisible();
}

test("morning entry saves and collapses to a summary", async ({ page }) => {
  await page.goto("/");
  await openMorningForm(page);

  await page.getByLabel("Sleep hours").fill("7.5");
  await page.getByLabel("Quality 1-10").fill("7");
  await page.getByLabel("Minutes available").fill("60");
  await page.getByRole("button", { name: "Save entry" }).click();

  await expect(page.getByText("Morning entry saved")).toBeVisible();
  await expect(page.getByText("7.5 h")).toBeVisible();
  await expect(page.getByText("quality", { exact: false })).toBeVisible();
});

test("cold start states what it is waiting on", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Cold start").first()).toBeVisible();
  await expect(page.getByText("Under two weeks of history", { exact: false })).toBeVisible();
});

test("primary recommendation renders with reason and trace", async ({ page }) => {
  await page.goto("/");
  const primarySection = page.getByLabel("Primary recommendation");
  const card = primarySection.getByRole("article").first();
  const nothing = primarySection.getByText("Nothing pressing.");

  // Either a card or the designed empty state; never a blank section.
  await expect(card.or(nothing).first()).toBeVisible();

  if (await card.isVisible()) {
    await card.getByRole("button", { name: "Why" }).click();
    await expect(card.getByText("score", { exact: false })).toBeVisible();
  }
});

test("session flow: start, log a set, finish advances rotation", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/");

  // Clean up any session left open by a previous run.
  const finishOpen = page.getByRole("button", { name: "Finish open session" });
  if (await finishOpen.isVisible().catch(() => false)) {
    await finishOpen.click();
    await expect(page.getByText("Session logged", { exact: false })).toBeVisible();
    await page.reload();
  }
  const finishCurrent = page.getByRole("button", { name: "Finish session" });
  if (await finishCurrent.isVisible().catch(() => false)) {
    await finishCurrent.click();
    await expect(page.getByText("Session finished; rotation advanced")).toBeVisible();
    await page.reload();
  }

  await expect(page.getByText(/Rotation day \d of 6/)).toBeVisible();
  const start = page.getByRole("button", { name: /^Start / });
  await expect(start).toBeVisible();
  await start.click();

  // The first lift's inline logging form appears once the session is open.
  const weight = page.getByLabel(/ weight$/).first();
  await expect(weight).toBeVisible({ timeout: 15_000 });
  await weight.fill("45");
  await page.getByLabel(/ reps$/).first().fill("8");
  await page.getByRole("button", { name: "Log", exact: true }).first().click();

  // The logged set lands in the table for that lift.
  await expect(page.locator("table tbody tr").first()).toContainText("45");

  await page.getByRole("button", { name: "Finish session" }).click();
  await expect(page.getByText("Session finished; rotation advanced")).toBeVisible();
});
