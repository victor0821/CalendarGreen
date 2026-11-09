import { defineConfig } from '@playwright/test'

/**
 * Pruebas de extremo a extremo: navegador real + backend real + Supabase **dev**.
 * Levantan (o reutilizan) el backend en :8000 y el frontend en :5173.
 * Requieren el .env de la raíz con APP_ENV=dev. Los usuarios de prueba (e2e-*@example.com) se
 * borran después con `uv run python scripts/cleanup_e2e.py`.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 1440, height: 900 },
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'uv run uvicorn app.main:app --port 8000',
      cwd: '../backend',
      url: 'http://localhost:8000/api/v1/health',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
})
