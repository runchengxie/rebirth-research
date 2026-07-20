// 一次性基线测量脚本（路线图 R0.6）。用法：
//   node scripts/measure_baseline.mjs [baseUrl]
// 需要 dev server 已在 baseUrl（默认 http://localhost:4173）运行。
import { chromium } from "@playwright/test";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:4173";

const browser = await chromium.launch({ args: ["--no-proxy-server"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const resources = [];
page.on("response", (response) => {
  resources.push(response.url());
});

await page.goto(`${baseUrl}/?mode=story&play=career&new=1&staticStage=1`);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector(".immersive-app");

const firstScreenResources = await page.evaluate(() => {
  const entries = performance.getEntriesByType("resource");
  const total = entries.reduce((sum, entry) => sum + (entry.transferSize || entry.encodedBodySize || 0), 0);
  return { count: entries.length, totalKiB: Math.round(total / 1024) };
});

let advanceClicks = 0;
for (let index = 0; index < 10; index += 1) {
  if (await page.locator(".immersive-decision-panel").count()) break;
  await page.locator(".primary-action").click();
  advanceClicks += 1;
}
await page.waitForSelector(".immersive-decision-panel");

const decisionMetrics = await page.evaluate(() => {
  const scroll = document.querySelector(".interaction-scroll");
  const panel = document.querySelector(".immersive-decision-panel");
  const interactive = panel
    ? panel.querySelectorAll("button, input, select, textarea, summary, a").length
    : 0;
  return {
    scrollHeight: scroll ? scroll.scrollHeight : 0,
    clientHeight: scroll ? scroll.clientHeight : 0,
    interactiveElements: interactive,
  };
});

console.log(JSON.stringify({
  viewport: "390x844",
  firstScreenResources,
  advanceClicksToDecision: advanceClicks,
  decisionMetrics,
}, null, 2));

await browser.close();
