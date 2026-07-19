const { test, expect } = require("@playwright/test");

async function startNewStory(page, play = "career") {
  const path = `/?mode=story&play=${play}&new=1&staticStage=1`;
  await page.goto(path);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator(".immersive-app")).toBeVisible();
}

async function openCareerDecision(page) {
  await startNewStory(page);

  for (let index = 0; index < 10; index += 1) {
    if (await page.locator(".immersive-decision-panel").count()) return;
    const advance = page.locator(".primary-action");
    await expect(advance).toBeEnabled();
    await advance.click();
  }
  await expect(page.locator(".immersive-decision-panel")).toBeVisible();
}

async function openOpeningGlossary(page) {
  await startNewStory(page);

  for (let index = 0; index < 10; index += 1) {
    const hasLead = await page.locator(".dialogue-plain-summary").count();
    const hasGlossary = await page.locator(".dialogue-glossary").count();
    if (hasLead && hasGlossary) return;
    const advance = page.locator(".primary-action");
    await expect(advance).toBeEnabled();
    await advance.click();
  }
  await expect(page.locator(".dialogue-plain-summary")).toBeVisible();
  await expect(page.locator(".dialogue-glossary")).toBeVisible();
}

test("第一话先给通俗摘要，并在对白中解释术语", async ({ page }) => {
  await openOpeningGlossary(page);

  const lead = page.locator(".dialogue-plain-summary");
  await expect(lead.getByText("先抓住重点", { exact: true })).toBeVisible();
  await expect(lead).toContainText("实际经营");

  const speakerBefore = await page.locator(".speaker-name").textContent();
  const glossary = page.locator(".dialogue-glossary");
  await expect(glossary).not.toHaveAttribute("open", "");
  await glossary.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(glossary).toHaveAttribute("open", "");
  await expect(glossary.getByText("Barra 归因", { exact: true })).toBeVisible();
  await expect(glossary).toContainText("本话作用");
  await expect(page.locator(".speaker-name")).toHaveText(speakerBefore ?? "");

  const eventTypes = await page.evaluate(() => {
    const events = JSON.parse(localStorage.getItem("rebirthPlaytest:v1") || "[]");
    return events.map((event) => event.type);
  });
  expect(eventTypes).toContain("dialogue_glossary_expand");
});

test("第一话把目标、调查、日程和研究承诺收敛到可理解范围", async ({ page }) => {
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

  const commitment = page.locator(".research-commitment");
  await expect(commitment.getByRole("button", { name: "稳健模板已采用" })).toHaveAttribute("aria-pressed", "true");
  await expect(commitment.locator(".research-commitment-manual")).not.toHaveAttribute("open", "");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("推荐日程可以从方案确认区一键采用", async ({ page }) => {
  await openCareerDecision(page);

  const scheduleLabels = page.locator(".career-option-schedule strong");
  let scheduleIndex = -1;
  let recommendedLabel = "";
  for (let index = 0; index < (await scheduleLabels.count()); index += 1) {
    const label = (await scheduleLabels.nth(index).textContent())?.trim() ?? "";
    if (label && label !== "深度研报") {
      scheduleIndex = index;
      recommendedLabel = label;
      break;
    }
  }
  expect(scheduleIndex).toBeGreaterThanOrEqual(0);

  const option = scheduleLabels.nth(scheduleIndex).locator("xpath=ancestor::article[contains(@class, 'career-option')]");
  await option.locator(".career-option-main").click();
  const confirmation = option.locator(".decision-confirmation");
  await confirmation.getByRole("button", { name: "采用推荐日程" }).click();
  await expect(confirmation.locator("dl > div").first().locator("dd")).toHaveText(recommendedLabel);
  await expect(confirmation.getByText("当前日程已经符合", { exact: false })).toBeVisible();

  const eventTypes = await page.evaluate(() => {
    const events = JSON.parse(localStorage.getItem("rebirthPlaytest:v1") || "[]");
    return events.map((event) => event.type);
  });
  expect(eventTypes).toContain("recommended_focus_apply");
});

test("职业方案先解释代价并确认，再生成一次结算", async ({ page }) => {
  await openCareerDecision(page);

  const option = page.locator(".career-option").first();
  await expect(option.locator(".career-option-logic dt")).toHaveText(["主张", "你押注的是", "主要代价"]);
  await expect(option.locator(".career-option-schedule")).toContainText("推荐日程");

  await option.locator(".career-option-main").click();
  await expect(option.locator(".decision-confirmation")).toBeVisible();
  await expect(page.locator(".decision-result")).toHaveCount(0);
  await expect(page.locator(".interaction-actions .primary-action")).toBeDisabled();

  const confirm = option.getByRole("button", { name: "确认提交本月判断" });
  await confirm.evaluate((element) => {
    element.click();
    element.click();
  });
  await expect(page.locator(".decision-result")).toBeVisible();
  await expect(page.locator(".career-causal-recap article")).toHaveCount(3);

  const fullRecap = page.locator(".career-full-recap");
  await expect(fullRecap).not.toHaveAttribute("open", "");
  await fullRecap.locator("summary").click();
  await expect(fullRecap.locator(".career-score-breakdown")).toBeVisible();
  await expect(fullRecap.locator(".career-score-breakdown .score-total")).toContainText("总分");

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const events = JSON.parse(localStorage.getItem("rebirthPlaytest:v1") || "[]");
        return events.map((event) => event.type);
      }),
    )
    .toEqual(expect.arrayContaining(["decision_preview", "decision_confirm", "first_month_complete", "score_breakdown_expand"]));

  const decisionSubmits = await page.evaluate(() => {
    const events = JSON.parse(localStorage.getItem("rebirthPlaytest:v1") || "[]");
    return events.filter((event) => event.type === "decision_submit").length;
  });
  expect(decisionSubmits).toBe(1);
});
