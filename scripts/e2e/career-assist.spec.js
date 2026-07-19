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

test("职业模式优先展示可执行调查节点", async ({ page }) => {
  await openCareerDecision(page);

  const investigation = page.locator(".rebirth-investigation");
  const lockedNodes = investigation.locator(".rebirth-locked-nodes");
  await expect(investigation).toBeVisible();
  await expect(lockedNodes).toBeVisible();
  await expect(lockedNodes).not.toHaveAttribute("open", "");
  await expect(lockedNodes.locator(".rebirth-node").first()).not.toBeVisible();

  await lockedNodes.locator("summary").click();
  await expect(lockedNodes).toHaveAttribute("open", "");
  await expect(lockedNodes.locator(".rebirth-node").first()).toBeVisible();
});

test("第一话由研究助理自动完成稳健承诺", async ({ page }) => {
  await openCareerDecision(page);

  const commitment = page.locator(".research-commitment");
  await expect(commitment.locator(".research-commitment-manual")).not.toHaveAttribute("open", "");
  await expect(commitment.getByRole("button", { name: "稳健模板已采用" }))
    .toHaveAttribute("aria-pressed", "true");
  await expect(commitment.locator(".commitment-warning"))
    .toContainText("三项自检完整");
});
