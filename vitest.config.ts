import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      "scripts/e2e/**",
      "node_modules/**",
      "dist/**",
      "dist-package/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
});
