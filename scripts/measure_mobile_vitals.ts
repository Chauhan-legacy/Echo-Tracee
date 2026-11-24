/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import http from 'http';

function waitForServer(url: string, timeout = 10000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode && res.statusCode < 400) {
          resolve();
        } else {
          retry();
        }
      }).on('error', retry);
    };
    const retry = () => {
      if (Date.now() - start > timeout) {
        reject(new Error(`Timeout waiting for ${url}`));
      } else {
        setTimeout(check, 200);
      }
    };
    check();
  });
}

async function main() {
  console.log('Building for production preview...');
  const buildProc = spawn('npm.cmd', ['run', 'build'], { stdio: 'inherit', shell: true });
  await new Promise((resolve, reject) => {
    buildProc.on('exit', (code) => (code === 0 ? resolve(true) : reject(new Error('Build failed'))));
  });

  console.log('\nStarting vite preview on port 4173...');
  const preview = spawn('npx.cmd', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'inherit', shell: true });

  try {
    await waitForServer('http://localhost:4173');
    console.log('Vite preview is ready at http://localhost:4173\n');

    console.log('Launching Chromium with Mobile emulation (390x844), Fast 4G + 4x CPU slowdown...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);

    // Fast 4G Throttling: 1.6 Mbps download, 750 Kbps upload, 150ms RTT
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
      latency: 150,
    });

    // 4x CPU Slowdown
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    // Inject Performance Observer script before load
    await page.addInitScript(() => {
      (window as any).__vitals = {
        lcp: 0,
        cls: 0,
        longTasksTotalMs: 0,
        fcp: 0,
      };

      try {
        const poLCP = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            (window as any).__vitals.lcp = lastEntry.startTime;
          }
        });
        poLCP.observe({ type: 'largest-contentful-paint', buffered: true });

        const poCLS = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              (window as any).__vitals.cls += entry.value;
            }
          }
        });
        poCLS.observe({ type: 'layout-shift', buffered: true });

        const poLT = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.duration > 50) {
              (window as any).__vitals.longTasksTotalMs += (entry.duration - 50);
            }
          }
        });
        poLT.observe({ type: 'longtask', buffered: true });
      } catch (e) {}
    });

    const tStart = Date.now();
    await page.goto('http://localhost:4173', { waitUntil: 'load' });
    await page.waitForTimeout(1500);

    const vitals = await page.evaluate(() => {
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find((e) => e.name === 'first-contentful-paint');
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      return {
        lcpMs: (window as any).__vitals?.lcp || (fcpEntry ? fcpEntry.startTime : 0),
        cls: (window as any).__vitals?.cls || 0,
        tbtMs: (window as any).__vitals?.longTasksTotalMs || 0,
        fcpMs: fcpEntry ? fcpEntry.startTime : 0,
        domInteractiveMs: navEntry ? navEntry.domInteractive : 0,
      };
    });

    console.log('======================================================');
    console.log('V4 MOBILE PERFORMANCE VITALS (Fast 4G + 4x CPU Throttling)');
    console.log('======================================================');
    console.log(`LCP (Largest Contentful Paint): ${vitals.lcpMs.toFixed(1)} ms  (Budget <= 2500 ms)  => ${vitals.lcpMs <= 2500 ? 'PASS' : 'FAIL'}`);
    console.log(`CLS (Cumulative Layout Shift):   ${vitals.cls.toFixed(4)}       (Budget <= 0.05)     => ${vitals.cls <= 0.05 ? 'PASS' : 'FAIL'}`);
    console.log(`TBT (Total Blocking Time):       ${vitals.tbtMs.toFixed(1)} ms    (Budget <= 200 ms)   => ${vitals.tbtMs <= 200 ? 'PASS' : 'FAIL'}`);
    console.log(`FCP (First Contentful Paint):    ${vitals.fcpMs.toFixed(1)} ms`);
    console.log('======================================================\n');

    await browser.close();
  } finally {
    preview.kill('SIGTERM');
  }
}

main();
