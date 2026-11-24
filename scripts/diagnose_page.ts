/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import { chromium, devices } from 'playwright';

async function diagnose() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(devices['Pixel 7']);
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  console.log('Title:', await page.title());
  const h1 = await page.textContent('h1');
  console.log('H1:', h1);

  const loadBtn = page.getByRole('button', { name: /Load INCIDENT-001/i });
  console.log('Load button visible?', await loadBtn.isVisible());

  const canvasCount = await page.locator('canvas').count();
  console.log('Canvas count:', canvasCount);

  const privacyText = await page.getByText(/Nothing leaves your device/i).count();
  console.log('Privacy badge count:', privacyText);

  await browser.close();
}

diagnose();
