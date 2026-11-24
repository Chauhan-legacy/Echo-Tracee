import asyncio
from playwright.async_api import async_playwright

async def inspect():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto('http://localhost:5173/')
        await page.wait_for_timeout(1000)
        file_input = page.locator('input[type="file"]')
        await file_input.set_input_files('ev2.mp4')
        await page.wait_for_timeout(3000)
        
        # Check verdict
        verdict = await page.locator('#score-verdict-text').first.inner_text()
        print('Verdict on ev2.mp4:', verdict)

        # Check all finding cards
        card_titles = await page.locator('h4').all_inner_texts()
        print('All H4 titles on ev2.mp4:', card_titles)

        # Evaluate window state
        has_result = await page.evaluate('() => window.__LAST_AUDIO_DATA__ ? window.__LAST_AUDIO_DATA__.length : null')
        print('Audio samples decoded:', has_result)

        await browser.close()

if __name__ == '__main__':
    asyncio.run(inspect())
