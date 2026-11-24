import asyncio
from playwright.async_api import async_playwright
import os

os.makedirs('screenshots', exist_ok=True)

viewports = [
    ('390px', 390, 844),
    ('768px', 768, 1024),
    ('1440px', 1440, 900),
]

async def capture_all():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        for name, w, h in viewports:
            print(f"[*] Capturing viewports for {name} ({w}x{h})...")
            context = await browser.new_context(viewport={'width': w, 'height': h})
            page = await context.new_page()
            
            # 1. First Screen
            await page.goto('http://localhost:5173/')
            await page.wait_for_timeout(1000)
            await page.screenshot(path=f'screenshots/first-screen-{name}.png', full_page=False)
            print(f"  - Saved screenshots/first-screen-{name}.png")
            
            # 2. Ingest INCIDENT-001
            incident_btn = page.locator('button:has-text("INCIDENT-001")').first
            await incident_btn.click()
            # Wait for forensic scan sweep and DSP analysis (~3.5s)
            await page.wait_for_timeout(3500)
            await page.screenshot(path=f'screenshots/incident-results-{name}.png', full_page=False)
            print(f"  - Saved screenshots/incident-results-{name}.png")
            
            # 3. Fixer Hero Before / After
            # Navigate to Fixer via 1-Tap button or nav tab
            fix_btn = page.locator('button:has-text("Fix Leaks in 1 Tap")').first
            if await fix_btn.is_visible():
                await fix_btn.click()
            else:
                # Desktop or fallback tab
                await page.locator('button:has-text("Fixer Hero"), button:has-text("Fix & Sanitize")').first.click()
            
            await page.wait_for_timeout(1000)
            # Click Sanitize button inside FixerViewer
            sanitize_btn = page.locator('button:has-text("Sanitize & Fix All Leaks")').first
            if await sanitize_btn.is_visible():
                await sanitize_btn.click()
                await page.wait_for_timeout(3000)
                
            await page.screenshot(path=f'screenshots/fixer-before-after-{name}.png', full_page=False)
            print(f"  - Saved screenshots/fixer-before-after-{name}.png")
            
            # 4. Share Card Modal
            modal_btn = page.locator('button:has-text("Generate Proof Share Card"), button:has-text("Open Share Card Generator")').first
            if await modal_btn.is_visible():
                await modal_btn.click()
            else:
                share_tab = page.locator('button:has-text("Proof & Share"), button:has-text("Share")').first
                if await share_tab.is_visible():
                    await share_tab.click()
                    await page.wait_for_timeout(500)
                    open_gen = page.locator('button:has-text("Open Share Card Generator")').first
                    if await open_gen.is_visible():
                        await open_gen.click()
            
            await page.wait_for_timeout(1000)
            await page.screenshot(path=f'screenshots/share-card-{name}.png', full_page=False)
            print(f"  - Saved screenshots/share-card-{name}.png")
            
            await context.close()
            
        await browser.close()
        print("[✓] All screenshots captured successfully!")

if __name__ == '__main__':
    asyncio.run(capture_all())
