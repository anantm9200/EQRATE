import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
 testDir:'./tests-ui',
 timeout:30_000,
 expect:{timeout:10_000},
 retries:process.env.CI?1:0,
 reporter:process.env.CI?'list':'line',
 use:{baseURL:process.env.PLAYWRIGHT_BASE_URL||'http://127.0.0.1:3000',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome'],browserName:'chromium'}}],
 webServer:process.env.PLAYWRIGHT_BASE_URL?undefined:{command:'npm run start -- --hostname 127.0.0.1',url:'http://127.0.0.1:3000',reuseExistingServer:!process.env.CI,timeout:90_000}
});
