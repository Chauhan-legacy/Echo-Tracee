/**
 * Responsive Screenshot Capture Suite (Phase 6)
 * Uses Playwright via Node (TypeScript only, zero Python).
 * Captures clean, high-resolution forensic screenshots across 4 responsive widths:
 * 390px (iPhone 14), 768px (iPad mini), 1440px (MacBook), 1920px (Desktop).
 */
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:5174';
const SCREENSHOT_DIR = path.resolve(process.cwd(), 'screenshots');

const VIEWPORTS = [
  { name: '390px', width: 390, height: 844 },
  { name: '768px', width: 768, height: 1024 },
  { name: '1440px', width: 1440, height: 900 },
  { name: '1920px', width: 1920, height: 1080 },
];

async function main() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  console.log(`Starting responsive screenshot capture from ${BASE_URL}...`);
  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    console.log(`\nCapturing viewport ${vp.name} (${vp.width}x${vp.height})...`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2, // Retina fidelity
    });
    const page = await context.newPage();

    // 1. First Screen
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const firstScreenPath = path.join(SCREENSHOT_DIR, `first-screen-${vp.name}.png`);
    await page.screenshot({ path: firstScreenPath, fullPage: false });
    console.log(`✓ Saved ${firstScreenPath}`);

    // 2. INCIDENT-001 Results
    const loadDemoBtn = page.locator('button:has-text("Load INCIDENT-001")').first();
    if (await loadDemoBtn.isVisible()) {
      await loadDemoBtn.click();
      // Wait for forensic sweep & analysis (~2.5s)
      await page.waitForTimeout(3500);

      const incidentResultsPath = path.join(SCREENSHOT_DIR, `incident-results-${vp.name}.png`);
      await page.screenshot({ path: incidentResultsPath, fullPage: false });
      console.log(`✓ Saved ${incidentResultsPath}`);
    }

    // 3. Fixer Before / After
    // Click on Fix tab or Fix button
    const fixTabBtn = page.locator('button:has-text("Fix")').first();
    if (await fixTabBtn.isVisible()) {
      await fixTabBtn.click();
      await page.waitForTimeout(800);

      // Trigger sanitization if button visible
      const sanitizeBtn = page.locator('button:has-text("Sanitize Now")').first();
      if (await sanitizeBtn.isVisible()) {
        await sanitizeBtn.click();
        await page.waitForTimeout(2500); // wait for countdown animation
      }

      const fixerPath = path.join(SCREENSHOT_DIR, `fixer-before-after-${vp.name}.png`);
      await page.screenshot({ path: fixerPath, fullPage: false });
      console.log(`✓ Saved ${fixerPath}`);
    }

    // 4. Share Card Modal
    const shareBtn = page.locator('button:has-text("Share")').first();
    if (await shareBtn.isVisible()) {
      await shareBtn.click();
      await page.waitForTimeout(800);

      const shareCardPath = path.join(SCREENSHOT_DIR, `share-card-${vp.name}.png`);
      await page.screenshot({ path: shareCardPath, fullPage: false });
      console.log(`✓ Saved ${shareCardPath}`);
    }

    await context.close();
  }

  await browser.close();
  console.log('\nAll responsive screenshots captured successfully!');
}

main().catch(err => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
