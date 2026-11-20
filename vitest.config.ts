/**
 * vitest.config.ts
 * Root test runner. Unit tests live next to the code they protect.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts", "services/**/*.test.ts", "apps/**/*.test.ts"],
    environment: "node",
  },
});
