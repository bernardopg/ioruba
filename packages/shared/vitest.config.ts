import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      include: ["src/**/*.ts"],
      exclude: ["src/types.ts"],
      reporter: ["text", "json-summary", "html"],
      thresholds: { statements: 85, branches: 75, functions: 93, lines: 84 }
    }
  }
});
