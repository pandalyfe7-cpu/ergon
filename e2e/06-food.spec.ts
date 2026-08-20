import { expect, test } from "@playwright/test";

/**
 * Food logging: create-and-log a food, adjust serving, move slot, delete,
 * protein-forward header. The created food stays in the library for later
 * runs; logging via search covers the quick-log path on reruns.
 */

const FOOD = "E2E Chicken";

test("create a new food and log it", async ({ page }) => {
  await page.goto("/log-food");

  // Clear leftover rows from earlier runs so .first() is unambiguous and the
  // freshly logged row starts at serving 1.
  while ((await page.getByLabel(`Delete ${FOOD}`).count()) > 0) {
    const before = await page.getByLabel(`Delete ${FOOD}`).count();
    await page.getByLabel(`Delete ${FOOD}`).first().click();
    await expect(page.getByLabel(`Delete ${FOOD}`)).toHaveCount(before - 1);
  }

  // Log via search when the food already exists (second pass), otherwise
  // create it through the new-food form.
  await page.getByLabel("Search foods").fill(FOOD);
  const match = page.getByRole("button", { name: new RegExp(FOOD) }).first();
  if (await match.isVisible().catch(() => false)) {
    await match.click();
    await expect(page.getByText(`${FOOD} logged`)).toBeVisible();
  } else {
    // Two "New food" links exist when search has no match; either works.
    await page.getByRole("link", { name: "New food" }).first().click();
    await page.waitForURL("**/log-food/new");
    await page.getByLabel("Name").fill(FOOD);
    await page.getByLabel("Calories").fill("200");
    await page.getByLabel("Protein g").fill("40");
    await page.getByRole("button", { name: "Save and log" }).click();
    await page.waitForURL("**/log-food");
  }

  await expect(page.getByText(FOOD).first()).toBeVisible();
  await expect(page.getByText("g protein", { exact: false }).first()).toBeVisible();
});

test("adjust serving with steppers", async ({ page }) => {
  await page.goto("/log-food");
  await page.getByLabel(`More ${FOOD}`).first().click();
  await expect(page.getByText(/×\s*1\.25/).first()).toBeVisible();
  await page.getByLabel(`Less ${FOOD}`).first().click();
  await expect(page.getByText(/×\s*1(?!\.)/).first()).toBeVisible();
});

test("move a meal to another slot", async ({ page }) => {
  await page.goto("/log-food");
  const select = page.getByLabel(`Meal slot for ${FOOD}`).first();
  await select.selectOption("snack");
  await page.waitForTimeout(1200);
  await page.reload();
  await expect(page.getByLabel(`Meal slot for ${FOOD}`).first()).toHaveValue("snack");
});

test("header shows protein total against the derived floor", async ({ page }) => {
  await page.goto("/log-food");
  await expect(page.getByText(/g protein/).first()).toBeVisible();
  await expect(page.getByText(/of \d+ g floor/).first()).toBeVisible();
});

test("delete a logged meal", async ({ page }) => {
  await page.goto("/log-food");
  const before = await page.getByLabel(`Delete ${FOOD}`).count();
  await page.getByLabel(`Delete ${FOOD}`).first().click();
  await expect(page.getByText(`${FOOD} removed`)).toBeVisible();
  await expect(page.getByLabel(`Delete ${FOOD}`)).toHaveCount(before - 1);
});
