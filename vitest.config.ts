import { defineConfig } from "vitest/config";

// Test-only config (pure TS scoring tests, no React plugin needed).
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
