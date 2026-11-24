/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import { chromium, firefox, webkit, devices } from 'playwright';

async function test() {
  console.log('Testing Playwright browser launches...');
  try {
    const bChromium = await chromium.launch({ headless: true });
    console.log('✓ Chromium launched successfully');
    await bChromium.close();
  } catch (e: any) {
    console.log('✗ Chromium launch failed:', e.message);
  }

  try {
    const bFirefox = await firefox.launch({ headless: true });
    console.log('✓ Firefox launched successfully');
    await bFirefox.close();
  } catch (e: any) {
    console.log('✗ Firefox launch failed:', e.message);
  }

  try {
    const bWebkit = await webkit.launch({ headless: true });
    console.log('✓ WebKit launched successfully');
    await bWebkit.close();
  } catch (e: any) {
    console.log('✗ WebKit launch failed:', e.message);
  }
}

test();
