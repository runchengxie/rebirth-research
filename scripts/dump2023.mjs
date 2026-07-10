/* eslint-disable no-undef */
// Dump 2023 content (themes + 12 decision pools) out of the TS source into
// src/game/content/2023.json, so content2023.ts can become a validated loader
// (matching the already-extracted 2025 layer).
//
// Why Vite ssrLoadModule: raw `node --experimental-strip-types` cannot resolve
// extensionless relative imports (e.g. `import { d } from "./decisionFactory"`),
// so the TS source must be loaded through Vite.

import { createServer } from "vite";
import { writeFileSync } from "node:fs";

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "warn",
});

try {
  const mod = await server.ssrLoadModule("/src/game/content2023.ts");
  const themes = mod.THEMES_2023;
  const decisions = Array.from({ length: 12 }, (_, i) => mod.makeDecisions2023(i));
  const data = { year: "2023", themes, decisions };
  writeFileSync("src/game/content/2023.json", JSON.stringify(data, null, 2) + "\n");
  const total = decisions.reduce((n, pool) => n + pool.length, 0);
  console.log(`dumped 2023.json: ${themes.length} themes, ${decisions.length} pools, ${total} decisions`);
} finally {
  await server.close();
}
