/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import { chromium } from 'playwright';

async function diagnose() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:5174', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const loadBtn = page.getByRole('button', { name: /Load INCIDENT-001/i }).first();
  await loadBtn.click();
  await page.waitForSelector('text=Top Privacy Leaks', { timeout: 8000 });

  const fixBtn = page.locator('nav[aria-label="Mobile Navigation"]').getByRole('button', { name: /Fix/i }).first();
  await fixBtn.click();
  await page.waitForTimeout(600);

  const sanitizeBtn = page.getByRole('button', { name: /Sanitize Now/i }).first();
  console.log('Sanitize button visible:', await sanitizeBtn.isVisible());
  await sanitizeBtn.click();

  console.log('Clicked Sanitize Now, waiting for progress or completion...');
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(500);
    const complete = (await page.getByText(/Sanitization Complete/i).locator('visible=true').count()) > 0;
    const processing = (await page.getByText(/Sanitizing/i).locator('visible=true').count()) > 0;
    console.log(`t=${(i + 1) * 0.5}s: complete=${complete}, processing=${processing}`);
    if (complete) break;
  }

  await browser.close();
}

diagnose();
