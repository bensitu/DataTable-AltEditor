import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/browser',
  workers: 3,
  use: { baseURL: 'http://127.0.0.1:8080', headless: true },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:8080',
    reuseExistingServer: !process.env.CI,
  },
  projects: ['chromium', 'firefox', 'webkit'].map((browserName) => ({
    name: browserName,
    testIgnore: browserName === 'chromium' ? [] : ['**/frameworks.spec.js'],
    use: { browserName },
  })),
});
