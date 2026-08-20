import { expect, test } from "@playwright/test";

/**
 * Settings: every control writes, takes effect, and is restored afterwards so
 * the suite stays idempotent across the mobile and desktop passes.
 */

test("rotation position changes what Today prescribes", async ({ page }) => {
  await page.goto("/settings");
  const select = page.getByLabel("Next session");
  const original = await select.inputValue();

  await select.selectOption("2");
  await expect(page.getByText(/Next session: /)).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("Rotation day 3 of 6")).toBeVisible();

  await page.goto("/settings");
  await page.getByLabel("Next session").selectOption(original);
  await expect(page.getByText(/Next session: /)).toBeVisible();
});

test("default time available saves and persists", async ({ page }) => {
  await page.goto("/settings");
  const field = page.getByLabel("Time available, minutes/day");
  await field.fill("75");
  await field.blur();
  await expect(page.getByText("Default time saved")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Time available, minutes/day")).toHaveValue("75");

  const restore = page.getByLabel("Time available, minutes/day");
  await restore.fill("60");
  await restore.blur();
  await expect(page.getByText("Default time saved")).toBeVisible();
});

test("bed time saves into the sleep habit", async ({ page }) => {
  await page.goto("/settings");
  const field = page.getByLabel("Target bed time");
  await field.fill("22:30");
  await field.blur();
  await expect(page.getByText("Bed time saved")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Target bed time")).toHaveValue("22:30");
});

test("static metric target edits validate and persist", async ({ page }) => {
  await page.goto("/settings");
  const bodyweight = page
    .locator("li", { hasText: "Bodyweight" })
    .filter({ has: page.getByLabel("Floor") })
    .first();

  const floor = bodyweight.getByLabel("Floor");
  await floor.fill("154");
  await floor.blur();
  await expect(page.getByText("Target saved")).toBeVisible();

  await page.reload();
  await expect(
    page.locator("li", { hasText: "Bodyweight" }).first().getByLabel("Floor"),
  ).toHaveValue("154");

  const restore = page.locator("li", { hasText: "Bodyweight" }).first().getByLabel("Floor");
  await restore.fill("155");
  await restore.blur();
  await expect(page.getByText("Target saved")).toBeVisible();
});

test("derived protein target shows its formula and source", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByLabel("g per lb bodyweight")).toBeVisible();
  await expect(page.getByLabel("Ceiling offset, g")).toBeVisible();
  await expect(page.getByText(/Currently \d+–\d+ g/)).toBeVisible();
  await expect(page.getByText("Recomputes weekly", { exact: false })).toBeVisible();
});

test("constraint rules toggle off and back on", async ({ page }) => {
  await page.goto("/settings");
  const rule = page.getByRole("switch", { name: /no-standing-axial/ });
  await expect(rule).toHaveAttribute("aria-checked", "true");

  await rule.click();
  await expect(page.getByText("Rule off")).toBeVisible();
  await expect(page.getByRole("switch", { name: /no-standing-axial/ })).toHaveAttribute(
    "aria-checked",
    "false",
  );

  await page.getByRole("switch", { name: /no-standing-axial/ }).click();
  await expect(page.getByText("Rule active")).toBeVisible();
});

test("engine weights edit and reset to defaults", async ({ page }) => {
  await page.goto("/settings");
  const staleness = page.getByLabel("Weight staleness");
  await staleness.fill("1.5");
  await staleness.blur();
  await expect(page.getByText("Weights saved")).toBeVisible();

  const reset = page.getByRole("button", { name: "Reset to defaults" });
  await expect(reset).toBeEnabled();
  await reset.click();
  await expect(page.getByText("Weights reset to defaults")).toBeVisible();
  await expect(page.getByLabel("Weight staleness")).toHaveValue("1");
});
