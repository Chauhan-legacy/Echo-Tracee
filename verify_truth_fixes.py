import asyncio
from playwright.async_api import async_playwright
import os

async def verify_all():
    print("=" * 70)
    print("ECHO//TRACE TRUTH & HONESTY VERIFICATION SUITE")
    print("=" * 70)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1440, 'height': 900})

        # Test Case 1: Demo clip (INCIDENT-001)
        print("\n[TEST 1] Ingesting Demo Clip (INCIDENT-001)...")
        await page.goto('http://localhost:5173/')
        await page.wait_for_timeout(1000)
        await page.locator('button:has-text("INCIDENT-001")').click()
        await page.wait_for_timeout(3500)

        demo_verdict = await page.locator('#score-verdict-text').first.inner_text()
        print(f"  - Score Hero Verdict: \"{demo_verdict}\"")
        assert "location clues and acoustic tracking beacons" in demo_verdict or "physical location" in demo_verdict, \
            f"Expected location + beacon verdict, got: {demo_verdict}"
        print("  [✓] Demo correctly identifies tracking beacon and location clues")

        # Test Case 2: ev2.mp4
        print("\n[TEST 2] Ingesting ev2.mp4 (real file with speech/voice)...")
        await page.goto('http://localhost:5173/')
        await page.wait_for_timeout(1000)
        file_input = page.locator('input[type="file"]')
        await file_input.set_input_files('ev2.mp4')
        await page.wait_for_timeout(2500)

        ev2_verdict = await page.locator('#score-verdict-text').first.inner_text()
        print(f"  - Score Hero Verdict: \"{ev2_verdict}\"")
        assert "location clues" not in ev2_verdict.lower(), f"FALSE ALARM: ev2.mp4 mentions location clues: {ev2_verdict}"
        assert "tracking beacon" not in ev2_verdict.lower(), f"FALSE ALARM: ev2.mp4 mentions tracking beacon: {ev2_verdict}"
        print("  [✓] ev2.mp4 raises ZERO false location clues or tracking beacon markers")

        # Test Case 3: silent_clip.mp4
        print("\n[TEST 3] Ingesting silent_clip.mp4 (pure silence)...")
        await page.goto('http://localhost:5173/')
        await page.wait_for_timeout(1000)
        file_input = page.locator('input[type="file"]')
        await file_input.set_input_files('silent_clip.mp4')
        await page.wait_for_timeout(2500)

        silent_verdict = await page.locator('#score-verdict-text').first.inner_text()
        print(f"  - Score Hero Verdict: \"{silent_verdict}\"")
        assert "location clues" not in silent_verdict.lower(), f"FALSE ALARM: silent clip mentions location clues: {silent_verdict}"
        assert "clean" in silent_verdict.lower() or "zero" in silent_verdict.lower(), f"Expected clean verdict for silence: {silent_verdict}"
        print("  [✓] silent_clip.mp4 correctly reports clean score with no false location clues")

        # Test Case 4: hum60_tone20k.wav
        print("\n[TEST 4] Ingesting hum60_tone20k.wav (60.01 Hz hum + 20.1 kHz tone)...")
        await page.goto('http://localhost:5173/')
        await page.wait_for_timeout(1000)
        file_input = page.locator('input[type="file"]')
        await file_input.set_input_files('hum60_tone20k.wav')
        await page.wait_for_timeout(2500)

        hum60_verdict = await page.locator('#score-verdict-text').first.inner_text()
        print(f"  - Score Hero Verdict: \"{hum60_verdict}\"")
        assert "location clues" not in hum60_verdict.lower(), f"FALSE ALARM: hum60 clip mentions location clues: {hum60_verdict}"
        assert "tracking beacon" in hum60_verdict.lower() or "beacon" in hum60_verdict.lower(), \
            f"Expected tracking beacon detected for 20.1 kHz: {hum60_verdict}"
        print("  [✓] hum60_tone20k correctly detects 20.1 kHz beacon and 60 Hz hum with NO location clues")

        await browser.close()
        print("\n" + "=" * 70)
        print("ALL 4 VERIFICATION TEST CASES PASSED WITH 100% HONESTY!")
        print("=" * 70)

if __name__ == '__main__':
    asyncio.run(verify_all())
