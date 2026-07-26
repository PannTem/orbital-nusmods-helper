import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',

  use: {
    baseURL: 'https://orbital-frontend-i7gq.onrender.com', //LIVE SERVER
    trace: 'on-first-retry',
  },

  timeout: 90000, //wait for free Render tier to start
  expect: { timeout: 15000 },

})
