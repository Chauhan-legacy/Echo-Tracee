/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Verifies no horizontal scroll across all required phone viewports:
 * 320px, 360px, 375px, 390px, 414px, 430px, and Landscape 844x390.
 */
import { chromium } from 'playwright';

const WIDTHS = [
  { w: 320, h: 568, label: '320px (iPhone SE 1st gen)' },
  { w: 360, h: 800, label: '360px (Galaxy S20)' },
  { w: 375, h: 667, label: '375px (iPhone SE 2nd/3rd)' },
  { w: 390, h: 844, label: '390px (iPhone 14 / Judge viewport)' },
  { w: 414, h: 896, label: '414px (iPhone 11 / XR)' },
  { w: 430, h: 932, label: '430px (iPhone 14 Pro Max)' },
  { w: 844, h: 390, label: '844x390px (Landscape)' },
];

async function main() {
  console.log('Testing horizontal scroll across mobile viewports...');
  const browser = await chromium.launch({ headless: true });
  let allPass = true;

  for (const vp of WIDTHS) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    const port = process.env.PORT || '5173';
    await page.goto(`http://localhost:${port}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    const hasHorizontalScroll = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > window.innerWidth;
    });

    const scrollDiff = await page.evaluate(() => {
      return document.documentElement.scrollWidth - window.innerWidth;
    });

    const pass = !hasHorizontalScroll;
    if (!pass) allPass = false;
    console.log(`Viewport ${vp.label}: ${pass ? 'PASS' : 'FAIL'} (scrollWidth - innerWidth = ${scrollDiff}px)`);
    await page.close();
  }

  await browser.close();

  if (allPass) {
    console.log('\n✓ ZERO HORIZONTAL SCROLL ACROSS ALL 7 VIEWPORTS!');
  } else {
    console.log('\n✗ Horizontal scroll detected.');
    process.exit(1);
  }
}

main();
