import { expect, test } from "@playwright/test";

import {
  getOnboardingStep,
  getStoredPlanHabitCount,
  resetOnboardingData,
  setOnboardingStep,
  testUserId,
} from "./db";

let userId: string;

test.describe("onboarding gate and flow", () => {
  test.beforeAll(async () => {
    userId = await testUserId();
  });

  test.beforeEach(async () => {
    await resetOnboardingData(userId);
  });

  test.afterAll(async () => {
    await setOnboardingStep(userId, 4);
  });

  test("blocks Today, Progress, Train, and Settings until onboarding completes", async ({
    page,
  }) => {
    for (const path of ["/", "/metrics", "/train", "/settings"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/onboarding$/);
    }
  });

  test("reaches Today with a non-empty stored plan", async ({ page }) => {
    await page.goto("/onboarding");

    await page.getByLabel("Goal 1").fill("Train consistently at the gym");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("Where I am and where I want to be")).toBeVisible();
    await page.getByRole("button", { name: "Build my plan" }).click();

    const plan = page.getByTestId("onboarding-plan");
    await expect(plan).toBeVisible();
    await expect(plan.getByText("morning-entry", { exact: false })).toBeVisible();
    await expect(plan.getByText("training-adherence", { exact: false })).toBeVisible();

    await page.getByRole("button", { name: "Continue to Today" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();

    expect(await getOnboardingStep(userId)).toBe(4);
    expect(await getStoredPlanHabitCount(userId)).toBeGreaterThan(0);
  });
});
