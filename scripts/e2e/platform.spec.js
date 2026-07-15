const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

async function waitForPageReady(page, path) {
  if (path.includes("mode=committee")) {
    await expect(page.getByRole("heading", { name: "投委会答辩室" })).toBeVisible();
    return;
  }
  if (path.includes("mode=daily")) {
    await expect(page.getByRole("heading", { name: "每日研究挑战" })).toBeVisible();
    return;
  }
  if (path.includes("mode=studio")) {
    await expect(page.getByRole("heading", { name: "研究案例内容工坊" })).toBeVisible();
    return;
  }
  await expect(page.locator(".immersive-app")).toBeVisible();
}

async function openClean(page, path) {
  await page.goto(path);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForPageReady(page, path);
}

async function openDark(page, path) {
  await page.goto(path);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("rebirthGameTheme", "dark");
  });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await waitForPageReady(page, path);
}

async function answerCommittee(page) {
  for (let index = 0; index < 5; index += 1) {
    const response = page.locator(".committee-responses button").first();
    await expect(response).toBeVisible();
    await response.click();
  }
}

async function expectNoSeriousAccessibilityViolations(page) {
  const result = await new AxeBuilder({ page })
    .disableRules(["color-contrast"])
    .analyze();
  const violations = result.violations.filter((violation) =>
    violation.impact === "serious" || violation.impact === "critical");
  const summary = violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    targets: violation.nodes.flatMap((node) => node.target),
  }));
  expect(summary).toEqual([]);
}

async function contrastRatio(page, foregroundSelector, backgroundSelector) {
  return page.evaluate(({ foregroundSelector: foreground, backgroundSelector: background }) => {
    function parseColor(value) {
      const channels = value.match(/[\d.]+/g)?.map(Number) ?? [];
      if (channels.length < 3) throw new Error(`无法解析颜色：${value}`);
      return {
        red: channels[0],
        green: channels[1],
        blue: channels[2],
        alpha: channels[3] ?? 1,
      };
    }

    function blend(front, back) {
      const alpha = front.alpha + back.alpha * (1 - front.alpha);
      if (alpha === 0) return { red: 0, green: 0, blue: 0, alpha: 0 };
      return {
        red: (front.red * front.alpha + back.red * back.alpha * (1 - front.alpha)) / alpha,
        green: (front.green * front.alpha + back.green * back.alpha * (1 - front.alpha)) / alpha,
        blue: (front.blue * front.alpha + back.blue * back.alpha * (1 - front.alpha)) / alpha,
        alpha,
      };
    }

    function luminance(color) {
      const transform = (channel) => {
        const value = channel / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * transform(color.red)
        + 0.7152 * transform(color.green)
        + 0.0722 * transform(color.blue);
    }

    const foregroundElement = document.querySelector(foreground);
    const backgroundElement = document.querySelector(background);
    if (!foregroundElement || !backgroundElement) {
      throw new Error(`缺少对比度目标：${foreground} / ${background}`);
    }

    const pageBackground = parseColor(getComputedStyle(document.body).backgroundColor);
    const backgroundColor = blend(
      parseColor(getComputedStyle(backgroundElement).backgroundColor),
      pageBackground,
    );
    const foregroundColor = blend(
      parseColor(getComputedStyle(foregroundElement).color),
      backgroundColor,
    );
    const foregroundLuminance = luminance(foregroundColor);
    const backgroundLuminance = luminance(backgroundColor);
    const lighter = Math.max(foregroundLuminance, backgroundLuminance);
    const darker = Math.min(foregroundLuminance, backgroundLuminance);
    return (lighter + 0.05) / (darker + 0.05);
  }, { foregroundSelector, backgroundSelector });
}

async function expectScrollablePage(page, path) {
  await openClean(page, path);
  const metrics = await page.evaluate(() => ({
    clientHeight: document.documentElement.clientHeight,
    scrollHeight: document.documentElement.scrollHeight,
    overflowY: getComputedStyle(document.body).overflowY,
  }));
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  expect(["auto", "visible", "scroll"]).toContain(metrics.overflowY);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
}

test("键盘可以跳过导航，并在档案弹窗关闭后恢复焦点", async ({ page }) => {
  await openClean(page, "/?staticStage=1");

  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  const archiveButton = page.getByRole("button", { name: "记录与档案" });
  await archiveButton.focus();
  await archiveButton.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "关闭档案" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(archiveButton).toBeFocused();
});

test("年度剧情的研究平台栏不会遮挡操作按钮", async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 768 });
  await openClean(page, "/?staticStage=1");

  const actionBox = await page.locator(".interaction-actions").boundingBox();
  const dockBox = await page.locator(".platform-mode-switcher").boundingBox();
  expect(actionBox).not.toBeNull();
  expect(dockBox).not.toBeNull();
  expect(actionBox.y + actionBox.height).toBeLessThanOrEqual(dockBox.y - 3);
  await expect(page.getByRole("button", { name: /继续/ })).toBeVisible();
});

test("独立投委会完成五轮答辩并保存历史", async ({ page }) => {
  await openClean(page, "/?mode=committee");

  await page.locator(".committee-decisions button").first().click();
  await page.getByRole("button", { name: "进入五轮答辩" }).click();
  await answerCommittee(page);

  await expect(page.locator(".committee-result")).toBeVisible();
  const history = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("rebirthCommitteeHistory:v1") || "[]"));
  expect(history).toHaveLength(1);
  expect(history[0].score.total).toBeGreaterThanOrEqual(0);
});

test("每日挑战保存首次结果，刷新后允许不覆盖记录的练习", async ({ page }) => {
  await openClean(page, "/?mode=daily");

  await page.locator(".daily-decisions button").first().click();
  await page.getByRole("button", { name: "开始今日答辩" }).click();
  await answerCommittee(page);
  await expect(page.locator(".daily-result")).toBeVisible();

  const firstRecord = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("rebirthDailyResults:v1") || "[]")[0]);
  expect(firstRecord).toBeTruthy();

  await page.reload();
  await expect(page.getByText("今日已完成")).toBeVisible();
  await page.getByRole("button", { name: "再次练习" }).click();
  await expect(page.getByText(/练习结果不会覆盖今日首次记录/)).toBeVisible();

  const preservedRecord = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("rebirthDailyResults:v1") || "[]")[0]);
  expect(preservedRecord.completedAt).toBe(firstRecord.completedAt);
});

test("内容工坊保存的案例会进入投委会案例库", async ({ page }) => {
  await openClean(page, "/?mode=studio");

  await page.getByRole("button", { name: "保存到案例库" }).click();
  await expect(page.getByText(/内容包已保存到本地案例库/)).toBeVisible();
  await page.getByRole("button", { name: /投委会/ }).click();

  await expect(page).toHaveURL(/mode=committee/);
  await expect(page.getByRole("button", { name: /利润增长，现金流下降/ })).toBeVisible();
});

test("投委会、每日挑战和内容工坊都可以滚动到底部", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 640 });
  await expectScrollablePage(page, "/?mode=committee");
  await expectScrollablePage(page, "/?mode=daily");
  await expectScrollablePage(page, "/?mode=studio");
});

test("窄屏平台模式没有横向裁切", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/?mode=committee", "/?mode=daily", "/?mode=studio"]) {
    await openClean(page, path);
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});

test("深色模式关键平台文字和设置说明保持可读对比度", async ({ page }) => {
  await openDark(page, "/?mode=committee");
  expect(await contrastRatio(page, ".case-brief > p", ".committee-workspace")).toBeGreaterThanOrEqual(4.5);

  await openDark(page, "/?mode=daily");
  expect(await contrastRatio(page, ".daily-card > p", ".daily-card")).toBeGreaterThanOrEqual(4.5);

  await openDark(page, "/?mode=studio");
  expect(await contrastRatio(page, ".studio-field > span", ".studio-editor")).toBeGreaterThanOrEqual(4.5);

  await openDark(page, "/?staticStage=1");
  await page.getByRole("button", { name: "打开设置" }).click();
  await page.getByText("存档与跨设备转移", { exact: true }).click();
  await page.getByText("加密云同步", { exact: true }).click();
  await expect(page.locator(".cloud-sync-warning")).toBeVisible();
  expect(await contrastRatio(page, ".cloud-sync-warning", ".cloud-sync-body")).toBeGreaterThanOrEqual(4.5);
});

test("模式代码加载失败时显示恢复界面而不是白屏", async ({ page }) => {
  await page.route("**/src/modes/CommitteeMode.tsx*", (route) => route.abort());
  await page.goto("/?mode=committee");

  await expect(page.getByRole("heading", { name: "这个研究流程没有正常展开" })).toBeVisible();
  await expect(page.getByRole("button", { name: "返回年度剧情" })).toBeVisible();
});

test("四种模式没有严重或致命的自动无障碍问题", async ({ page }) => {
  const samples = [
    ["/?staticStage=1", "重生投研部"],
    ["/?mode=committee", "投委会答辩室"],
    ["/?mode=daily", "每日研究挑战"],
    ["/?mode=studio", "研究案例内容工坊"],
  ];

  for (const [path, heading] of samples) {
    await page.goto(path);
    await expect(page.getByText(heading, { exact: false }).first()).toBeVisible();
    await expectNoSeriousAccessibilityViolations(page);
  }
});
