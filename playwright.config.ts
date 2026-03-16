import { defineConfig } from "@playwright/test";
import { config } from "dotenv";
// Prefer dedicated E2E env file to avoid mixing prod/demo credentials.
// Fallback to .env.local for backward compatibility.
config({ path: ".env.e2e.local", override: true });
config({ path: ".env.local", override: false });

const e2eWebEnv = {
  ...process.env,
  // Force Vite to run against E2E credentials, not default local/prod values.
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
  VITE_RPC_SECRET: process.env.VITE_RPC_SECRET,
};
const webServerEnv: Record<string, string> = Object.fromEntries(
  Object.entries(e2eWebEnv).filter((entry): entry is [string, string] => typeof entry[1] === "string")
);

export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results/playwright-artifacts",
  timeout: 30_000,
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "test-results/playwright-report", open: "never" }],
    ["json", { outputFile: "test-results/playwright-results.json" }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5173",
    headless: true,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    env: webServerEnv,
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
