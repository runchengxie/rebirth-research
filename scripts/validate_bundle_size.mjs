/* global console */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const DIST_DIR = path.resolve("dist");
const ASSET_DIR = path.join(DIST_DIR, "assets");
const MAX_CHUNK_BYTES = 500_000;

function fail(message) {
  console.error(`Bundle budget failed: ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(ASSET_DIR)) {
  fail("dist/assets 不存在，请先运行 npm run build");
  process.exit();
}

const files = fs.readdirSync(ASSET_DIR);
const javascript = files
  .filter((file) => file.endsWith(".js"))
  .map((file) => ({ file, bytes: fs.statSync(path.join(ASSET_DIR, file)).size }))
  .sort((left, right) => right.bytes - left.bytes);

for (const asset of javascript) {
  if (asset.bytes > MAX_CHUNK_BYTES) {
    fail(`${asset.file} 为 ${asset.bytes} bytes，超过 ${MAX_CHUNK_BYTES} bytes`);
  }
}

const entry = javascript.find((asset) => /^index-.*\.js$/.test(asset.file));
if (!entry) fail("未找到 index JavaScript 入口");

const archiveChunk = javascript.find((asset) => asset.file.startsWith("ArchiveDrawer-"));
const timelineChunk = javascript.find((asset) => asset.file.startsWith("RebirthTimelinePanel-"));
if (!archiveChunk) fail("档案抽屉没有生成独立异步 chunk");
if (!timelineChunk) fail("因果回溯没有生成独立异步 chunk");

const cssFiles = files.filter((file) => file.endsWith(".css"));
const timelineCss = cssFiles.find((file) => file.startsWith("RebirthTimelinePanel-"));
if (!timelineCss) fail("时间线样式没有随异步组件拆分");

const entryCss = cssFiles.find((file) => file.startsWith("index-"));
if (entryCss) {
  const css = fs.readFileSync(path.join(ASSET_DIR, entryCss), "utf8");
  if (css.includes(".timeline-rewind")) {
    fail("首屏 CSS 仍包含时间线样式");
  }
}

console.log("Bundle budget passed");
for (const asset of javascript.slice(0, 8)) {
  console.log(`${asset.bytes}\t${asset.file}`);
}
