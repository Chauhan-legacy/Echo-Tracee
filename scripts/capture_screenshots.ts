/**
 * Responsive Screenshot Capture Suite (Phase E & V3.1)
 * Uses Playwright via Node (TypeScript only, zero Python).
 * Captures clean, high-resolution forensic screenshots across responsive widths:
 * 390px (Mobile), 768px (Tablet), 1440px (Desktop).
 * Covers:
 * 1. First Screen
 * 2. INCIDENT-001 Results (with Hear Tone, Attacker View, Checklist, Bit Strip)
 * 3. Sanitization Receipt Certificate (Merkle tree, QR, ECDSA signature)
 * 4. Verify Receipt Page (#verify route, Merkle chunk matcher)
 * 5. Scan Room Modal (10s live mic capture)
 * 6. Fixer Before/After (draggable spectrogram slider)
 * 7. Share Card Modal
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
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    // 1. First Screen
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const firstScreenPath = path.join(SCREENSHOT_DIR, `first-screen-${vp.name}.png`);
    await page.screenshot({ path: firstScreenPath, fullPage: false });
    console.log(`✓ Saved ${firstScreenPath}`);

    // 2. Scan Room Modal
    const scanRoomBtn = page.locator('button:has-text("Scan Room")').first();
    if (await scanRoomBtn.isVisible()) {
      await scanRoomBtn.click();
      await page.waitForTimeout(800);
      const scanRoomPath = path.join(SCREENSHOT_DIR, `scan-room-${vp.name}.png`);
      await page.screenshot({ path: scanRoomPath, fullPage: false });
      console.log(`✓ Saved ${scanRoomPath}`);

      // Close modal
      const closeBtn = page.locator('div[role="dialog"] button, div.fixed button').first();
      if (await closeBtn.isVisible()) await closeBtn.click();
      await page.waitForTimeout(400);
    }

    // 3. INCIDENT-001 Results (Includes Hear Tone, Bit Strip, Attacker View, Checklist)
    const loadDemoBtn = page.locator('button:has-text("Load INCIDENT-001")').first();
    if (await loadDemoBtn.isVisible()) {
      await loadDemoBtn.click();
      await page.waitForTimeout(3500); // Wait for parallel workers to finish

      const incidentResultsPath = path.join(SCREENSHOT_DIR, `incident-results-${vp.name}.png`);
      await page.screenshot({ path: incidentResultsPath, fullPage: true });
      console.log(`✓ Saved fullPage ${incidentResultsPath}`);
    }

    // 4. Fixer Before / After
    const fixTabBtn = page.locator('button:has-text("Fix"), button:has-text("Fixer")').first();
    if (await fixTabBtn.isVisible()) {
      await fixTabBtn.click();
      await page.waitForTimeout(1000);

      // Trigger sanitization if button visible
      const sanitizeBtn = page.locator('button:has-text("Sanitize Now")').first();
      if (await sanitizeBtn.isVisible()) {
        await sanitizeBtn.click();
        await page.waitForTimeout(2500); // wait for countdown animation
      }

      const fixerPath = path.join(SCREENSHOT_DIR, `fixer-before-after-${vp.name}.png`);
      await page.screenshot({ path: fixerPath, fullPage: false });
      console.log(`✓ Saved ${fixerPath}`);

      // 5. Sanitization Receipt Certificate Modal
      const viewReceiptBtn = page.locator('button:has-text("View Sanitization Receipt"), button:has-text("Receipt")').first();
      if (await viewReceiptBtn.isVisible()) {
        await viewReceiptBtn.click();
        await page.waitForTimeout(1000);

        const receiptPath = path.join(SCREENSHOT_DIR, `receipt-certificate-${vp.name}.png`);
        await page.screenshot({ path: receiptPath, fullPage: false });
        console.log(`✓ Saved ${receiptPath}`);

        // Close receipt modal
        const closeReceipt = page.locator('div.fixed button').first();
        if (await closeReceipt.isVisible()) await closeReceipt.click();
        await page.waitForTimeout(400);
      }
    }

    // 6. Verify Receipt Page
    const verifyTabBtn = page.locator('button:has-text("Verify")').first();
    if (await verifyTabBtn.isVisible()) {
      await verifyTabBtn.click();
      await page.waitForTimeout(800);

      const verifyPath = path.join(SCREENSHOT_DIR, `verify-page-${vp.name}.png`);
      await page.screenshot({ path: verifyPath, fullPage: false });
      console.log(`✓ Saved ${verifyPath}`);
    }

    // 7. Share Card Modal
    const shareTabBtn = page.locator('button:has-text("Share")').first();
    if (await shareTabBtn.isVisible()) {
      await shareTabBtn.click();
      await page.waitForTimeout(800);

      const shareCardPath = path.join(SCREENSHOT_DIR, `share-card-${vp.name}.png`);
      await page.screenshot({ path: shareCardPath, fullPage: false });
      console.log(`✓ Saved ${shareCardPath}`);
    }

    await context.close();
  }

  await browser.close();
  console.log('\nAll V3.1 responsive screenshots captured successfully!');
}

main().catch(err => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
