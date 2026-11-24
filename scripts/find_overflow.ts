import { chromium } from 'playwright';

async function findOverflow() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 320, height: 568 } });
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const overflowingElements = await page.evaluate(() => {
    const docWidth = window.innerWidth;
    const elements = document.querySelectorAll('*');
    const list: { tag: string; id: string; className: string; scrollWidth: number; clientWidth: number; offsetWidth: number }[] = [];

    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.right > docWidth + 1) {
        list.push({
          tag: el.tagName,
          id: el.id,
          className: el.className ? String(el.className).slice(0, 80) : '',
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          offsetWidth: (el as HTMLElement).offsetWidth || 0,
        });
      }
    });

    return list;
  });

  console.log('Overflowing elements count:', overflowingElements.length);
  console.log('Top overflowing elements:', overflowingElements.slice(0, 10));

  await browser.close();
}

findOverflow();
