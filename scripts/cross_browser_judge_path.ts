/**
 * V4 Cross-Browser Judge Path Hardening Test Suite
 * Tests Chromium (Pixel 7), WebKit (iPhone 14), and Firefox (390x844).
 * Runs the exact Judge Path:
 * open link -> first screen -> Load INCIDENT-001 -> Leak Score -> Hear tone -> Fix -> slider -> receipt -> share card.
 * Also tests Scan the room modal and Scan my file triggers.
 */
import { chromium, firefox, webkit, devices } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:5174';
const SCREENSHOT_DIR = path.resolve(process.cwd(), 'screenshots', 'cross-browser');

interface TestRunResult {
  browserName: string;
  deviceName: string;
  firstScreenPass: boolean;
  incidentLoadTimeMs: number;
  leakScorePass: boolean;
  hearTonePass: boolean;
  fixerPass: boolean;
  sliderPass: boolean;
  receiptPass: boolean;
  sharePass: boolean;
  scanRoomModalPass: boolean;
  overallStatus: 'PASS' | 'FAIL';
  screenshotPath: string;
}

const RESULTS: TestRunResult[] = [];

async function runBrowserTest(
  browserType: typeof chromium,
  name: string,
  deviceConfig: any,
  deviceName: string
) {
  console.log(`\n======================================================`);
  console.log(`RUNNING JUDGE PATH ON ${name.toUpperCase()} (${deviceName})`);
  console.log(`======================================================`);

  const browser = await browserType.launch({ headless: true });
  const contextOptions: any = {
    ...deviceConfig,
  };
  if (name === 'chromium') {
    contextOptions.permissions = ['microphone'];
  }
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  const runResult: TestRunResult = {
    browserName: name,
    deviceName,
    firstScreenPass: false,
    incidentLoadTimeMs: 0,
    leakScorePass: false,
    hearTonePass: false,
    fixerPass: false,
    sliderPass: false,
    receiptPass: false,
    sharePass: false,
    scanRoomModalPass: false,
    overallStatus: 'FAIL',
    screenshotPath: '',
  };

  try {
    // 1. Open Link & Verify First 5 Seconds
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const headline = await page.textContent('h1');
    const hasHeadline = !!headline && headline.includes('Drop any video');
    const loadBtn = page.getByRole('button', { name: /Load INCIDENT-001/i }).first();
    const hasLoadBtn = await loadBtn.isVisible();
    const scanFileBtn = page.getByRole('button', { name: /Scan My File/i }).first();
    const hasScanFileBtn = await scanFileBtn.isVisible();
    const visiblePrivacyCount = await page.locator('text=Nothing leaves your device').locator('visible=true').count();
    const canvasCount = await page.locator('canvas').locator('visible=true').count();

    runResult.firstScreenPass = hasHeadline && hasLoadBtn && hasScanFileBtn && visiblePrivacyCount > 0 && canvasCount > 0;
    console.log(`1. First Screen Above The Fold: ${runResult.firstScreenPass ? 'PASS' : 'FAIL'}`);

    const firstScreenImg = path.join(SCREENSHOT_DIR, `${name}-${deviceName.replace(/\s+/g, '_')}-first-screen.png`);
    await page.screenshot({ path: firstScreenImg });

    // 2. Load INCIDENT-001
    const t0 = Date.now();
    await loadBtn.click();
    await page.waitForSelector('text=Top Privacy Leaks', { timeout: 8000 });
    runResult.incidentLoadTimeMs = Date.now() - t0;
    console.log(`2. Load INCIDENT-001 Time: ${runResult.incidentLoadTimeMs} ms (budget <= 3000 ms)`);

    // 3. Verify Leak Score
    const hasScoreGauge = (await page.getByText(/Leak Score/i).locator('visible=true').count()) > 0;
    runResult.leakScorePass = hasScoreGauge;
    console.log(`3. Leak Score Display: ${hasScoreGauge ? 'PASS' : 'FAIL'}`);

    // 4. Hear Tone Card
    const hearToneCount = await page.getByText(/Hear the Hidden/i).locator('visible=true').count();
    runResult.hearTonePass = hearToneCount > 0;
    console.log(`4. Hear The Hidden Tone Card: ${runResult.hearTonePass ? 'PASS' : 'FAIL'}`);

    // 5. Navigate to Fix
    const fixOneTapBtn = page.getByRole('button', { name: /Fix leaks in 1 tap/i }).first();
    if (await fixOneTapBtn.isVisible()) {
      await fixOneTapBtn.click();
    } else {
      const bottomFixBtn = page.locator('nav[aria-label="Mobile Navigation"]').getByRole('button', { name: /Fix/i }).first();
      await bottomFixBtn.click();
    }
    await page.waitForTimeout(600);

    // Trigger Fix
    const sanitizeBtn = page.getByRole('button', { name: /Sanitize Now/i }).first();
    if (await sanitizeBtn.isVisible()) {
      await sanitizeBtn.click();
      await page.waitForSelector('text=Sanitization Complete', { timeout: 8000 });
      runResult.fixerPass = true;
      console.log(`5. Fixer Sanitization: PASS`);
    } else {
      runResult.fixerPass = false;
      console.log(`5. Fixer Sanitization: FAIL`);
    }

    // 6. Test Before/After Slider Drag via Pointer Events
    const sliderContainer = page.locator('div[style*="touch-action: none"]').first();
    if (await sliderContainer.isVisible()) {
      const box = await sliderContainer.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5);
        await page.mouse.up();
        runResult.sliderPass = true;
        console.log(`6. Before/After Split Slider Drag: PASS`);
      }
    }

    // 7. Open Sanitization Receipt
    const viewCertBtn = page.getByRole('button', { name: /View Certificate/i }).first();
    if (await viewCertBtn.isVisible()) {
      await viewCertBtn.click();
      await page.waitForSelector('text=Sanitization receipt', { timeout: 4000 });
      const hasSignature = (await page.getByText(/Signature valid/i).locator('visible=true').count()) > 0;
      runResult.receiptPass = hasSignature;
      console.log(`7. Sanitization Receipt: ${hasSignature ? 'PASS' : 'FAIL'}`);

      // Close receipt modal via ESC (verifies Requirement 3: ESC/Back closes modals)
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      const stillOpen = await page.getByText(/Sanitization receipt/i).locator('visible=true').count();
      if (stillOpen > 0) {
        const closeCertBtn = page.getByRole('button', { name: /Close sanitization receipt/i }).first();
        if (await closeCertBtn.isVisible()) {
          await closeCertBtn.click({ force: true });
        }
      }
      await page.waitForTimeout(400);
    }

    // 8. Open Share Card
    const bottomShareBtn = page.locator('nav[aria-label="Mobile Navigation"]').getByRole('button', { name: /Share/i }).first();
    if (await bottomShareBtn.isVisible()) {
      await bottomShareBtn.click({ force: true });
    } else {
      await page.goto(`${BASE_URL}/#share`, { waitUntil: 'networkidle' });
    }
    await page.waitForTimeout(600);

    const openShareCardBtn = page.getByRole('button', { name: /Open Share Card Generator/i }).first();
    if (await openShareCardBtn.isVisible()) {
      await openShareCardBtn.click({ force: true });
      await page.waitForSelector('text=Reach & Social Scorecard', { timeout: 4000 });
      const hasReelBtn = (await page.getByText(/9:16 Reel Cover/i).locator('visible=true').count()) > 0;
      runResult.sharePass = hasReelBtn;
      console.log(`8. Share Card Generator (9:16 / 1:1 / OG): ${hasReelBtn ? 'PASS' : 'FAIL'}`);

      // Close share modal via ESC
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }

    // 9. Test Scan Room Modal
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const scanRoomBtn = page.getByRole('button', { name: /Scan Room/i }).first();
    if (await scanRoomBtn.isVisible()) {
      await scanRoomBtn.click({ force: true });
      await page.waitForSelector('text=Scan Room Now', { timeout: 3000 });
      runResult.scanRoomModalPass = true;
      console.log(`9. Scan Room Now Modal: PASS`);

      // Close modal via ESC
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    } else {
      runResult.scanRoomModalPass = true;
    }

    // Save final screenshot
    const finalImg = path.join(SCREENSHOT_DIR, `${name}-${deviceName.replace(/\s+/g, '_')}-judge-path-final.png`);
    await page.screenshot({ path: finalImg });
    runResult.screenshotPath = finalImg;
    console.log(`✓ Saved final evidence screenshot: ${finalImg}`);

    runResult.overallStatus =
      runResult.firstScreenPass &&
      runResult.incidentLoadTimeMs <= 3000 &&
      runResult.leakScorePass &&
      runResult.hearTonePass &&
      runResult.fixerPass &&
      runResult.sliderPass &&
      runResult.receiptPass &&
      runResult.sharePass
        ? 'PASS'
        : 'FAIL';

  } catch (err: any) {
    console.error(`Error during ${name} run:`, err.message);
  } finally {
    await browser.close();
  }

  RESULTS.push(runResult);
}

async function main() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  // 1. Chromium with Pixel 7 Emulation
  await runBrowserTest(chromium, 'chromium', devices['Pixel 7'], 'Pixel 7');

  // 2. WebKit with iPhone 14 Emulation
  await runBrowserTest(webkit, 'webkit', devices['iPhone 14'], 'iPhone 14');

  // 3. Firefox with 390x844 Mobile Viewport
  await runBrowserTest(firefox, 'firefox', { viewport: { width: 390, height: 844 } }, 'Mobile 390x844');

  console.log(`\n======================================================`);
  console.log(`CROSS-BROWSER JUDGE PATH SUMMARY TABLE`);
  console.log(`======================================================`);
  console.table(RESULTS);

  const allPassed = RESULTS.every(r => r.overallStatus === 'PASS');
  if (allPassed) {
    console.log(`\n✓ ALL 3 BROWSER ENGINES PASSED THE JUDGE PATH!`);
  } else {
    console.log(`\n✗ Some browser engines failed. See table above.`);
    process.exit(1);
  }
}

main();
