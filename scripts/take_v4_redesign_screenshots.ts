/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import { chromium } from 'playwright';
import path from 'path';

async function takeScreenshots() {
  const browser = await chromium.launch({ headless: true });

  // 1. Desktop 1440px
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto('http://localhost:5174', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const outPath = path.resolve(process.cwd(), 'screenshots', 'v4-redesign-desktop-1440.png');
    await page.screenshot({ path: outPath });
    console.log(`Saved screenshot: ${outPath}`);
    await page.close();
  }

  // 2. Tablet 768px
  {
    const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
    await page.goto('http://localhost:5174', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const outPath = path.resolve(process.cwd(), 'screenshots', 'v4-redesign-tablet-768.png');
    await page.screenshot({ path: outPath });
    console.log(`Saved screenshot: ${outPath}`);
    await page.close();
  }

  // 3. Mobile 390px
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto('http://localhost:5174', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const outPath = path.resolve(process.cwd(), 'screenshots', 'v4-redesign-mobile-390.png');
    await page.screenshot({ path: outPath });
    console.log(`Saved screenshot: ${outPath}`);
    await page.close();
  }

  // 4. Incident Loaded & Fixer & Receipt
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto('http://localhost:5174', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    const loadBtn = page.getByRole('button', { name: /Load INCIDENT-001/i }).first();
    await loadBtn.click();
    await page.waitForSelector('text=Top Privacy Leaks', { timeout: 8000 });

    const incidentImg = path.resolve(process.cwd(), 'screenshots', 'v4-redesign-incident001.png');
    await page.screenshot({ path: incidentImg });
    console.log(`Saved screenshot: ${incidentImg}`);

    // Navigate to Fix
    const fixBtn = page.locator('nav[aria-label="Mobile Navigation"]').getByRole('button', { name: /Fix/i }).first();
    await fixBtn.click();
    await page.waitForTimeout(600);

    // Click Sanitize Now
    const sanitizeBtn = page.getByRole('button', { name: /Sanitize Now/i }).first();
    if (await sanitizeBtn.isVisible()) {
      await sanitizeBtn.click();
      await page.waitForSelector('text=Sanitization Complete', { timeout: 15000 });
    }

    const fixerImg = path.resolve(process.cwd(), 'screenshots', 'v4-redesign-fixer.png');
    await page.screenshot({ path: fixerImg });
    console.log(`Saved screenshot: ${fixerImg}`);

    // View Receipt
    const viewCertBtn = page.getByRole('button', { name: /View Certificate/i }).first();
    if (await viewCertBtn.isVisible()) {
      await viewCertBtn.click();
      await page.waitForSelector('text=Sanitization receipt', { timeout: 4000 });
      const receiptImg = path.resolve(process.cwd(), 'screenshots', 'v4-redesign-receipt.png');
      await page.screenshot({ path: receiptImg });
      console.log(`Saved screenshot: ${receiptImg}`);
    }

    await page.close();
  }

  await browser.close();
  console.log('All screenshots successfully generated!');
}

takeScreenshots();
