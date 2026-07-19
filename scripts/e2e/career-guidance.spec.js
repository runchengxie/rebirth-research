const { test, expect } = require("@playwright/test");

async function openCareerDecision(page) {
  const path = "/?mode=story&play=career&new=1&staticStage=1";
  await page.goto(path);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator(".immersive-app")).toBeVisible();

  for (let index = 0; index < 10; index += 1) {
    if (await page.locator(".immersive-decision-panel").count()) return;
    const advance = page.locator(".primary-action");
    await expect(advance).toBeEnabled();
    await advance.click();
  }
  await expect(page.locator(".immersive-decision-panel")).toBeVisible();
}

test("第一话把目标、调查和日程收敛到可理解范围", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCareerDecision(page);

  const guidance = page.locator(".career-guidance-summary");
  await expect(guidance.getByText("本月目标", { exact: true })).toBeVisible();
  await expect(guidance.getByText("当前主要风险", { exact: true })).toBeVisible();

  const investigation = page.locator(".rebirth-investigation");
  await expect(investigation.locator(":scope > .rebirth-node-grid .rebirth-node")).toHaveCount(3);
  await expect(investigation.locator(".rebirth-additional-nodes")).not.toHaveAttribute("open", "");
  await expect(investigation.locator(".rebirth-locked-nodes")).not.toHaveAttribute("open", "");

  await expect(page.locator(".focus-onboarding")).toBeVisible();
  await expect(page.locator(".focus-choice-section > .focus-grid .focus-card")).toHaveCount(2);
  await expect(page.locator(".focus-additional")).not.toHaveAttribute("open", "");

  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("职业方案先解释代价并确认，再生成一次结算", async ({ page }) => {
  await openCareerDecision(page);

  const option = page.locator(".career-option").first();
  await expect(option.locator(".career-option-logic dt")).toHaveText([
    "主张",
    "你押注的是",
    "主要代价",
  ]);
  await expect(option.locator(".career-option-schedule")).toContainText("推荐日程");

  await option.locator(".career-option-main").click();
  await expect(option.locator(".decision-confirmation")).toBeVisible();
  await expect(page.locator(".decision-result")).toHaveCount(0);
  await expect(page.locator(".primary-action").last()).toBeDisabled();

  await option.getByRole("button", { name: "确认提交本月判断" }).click();
  await expect(page.locator(".decision-result")).toBeVisible();
  await expect(page.locator(".career-causal-recap article")).toHaveCount(3);
  await expect(page.locator(".career-full-recap")).not.toHaveAttribute("open", "");

  const eventTypes = await page.evaluate(() => {
    const events = JSON.parse(localStorage.getItem("rebirthPlaytest:v1") || "[]");
    return events.map((event) => event.type);
  });
  expect(eventTypes).toContain("decision_preview");
  expect(eventTypes).toContain("decision_confirm");
  expect(eventTypes).toContain("first_month_complete");
});
