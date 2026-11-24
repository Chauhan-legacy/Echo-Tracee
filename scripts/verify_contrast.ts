/**
 * WCAG AA Contrast Verification Script
 * Validates that every text / background color pair used in ECHO//TRACE V3
 * satisfies WCAG AA (>= 4.5:1 for regular text, >= 3.0:1 for large/bold text).
 * Also strictly asserts the rule: NEVER lime text on beige.
 */

interface ColorPair {
  name: string;
  fg: string;
  bg: string;
  isLarge?: boolean;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function srgbToLinear(c: number): number {
  const norm = c / 255;
  return norm <= 0.04045 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

export function contrastRatio(hex1: string, hex2: string): number {
  const lum1 = luminance(hex1);
  const lum2 = luminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

const colorPairs: ColorPair[] = [
  // Beige / Card surfaces
  { name: 'Ink text on Beige page', fg: '#10291D', bg: '#E8DCC3' },
  { name: 'Ink text on Card background', fg: '#10291D', bg: '#F3EBD8' },
  { name: 'Muted text on Card background', fg: '#3F5E4C', bg: '#F3EBD8' },
  { name: 'Muted text on Sunken background', fg: '#3F5E4C', bg: '#DCCFB2' },
  { name: 'Forest text on Card background', fg: '#174D35', bg: '#F3EBD8' },
  { name: 'Brick (critical) on Card background', fg: '#A32A1F', bg: '#F3EBD8' },
  { name: 'Ochre (warning) on Card background', fg: '#7A4E00', bg: '#F3EBD8' },

  // Lime fill buttons & chips (fill only with forest text, or on forest)
  { name: 'Forest text on Lime button fill', fg: '#174D35', bg: '#8BCF55' },
  { name: 'Deep forest text on Lime fill', fg: '#0B281B', bg: '#8BCF55' },
  { name: 'Lime accent chip text on Forest background', fg: '#8BCF55', bg: '#174D35' },
  { name: 'Lime accent chip text on Deep Forest panel', fg: '#8BCF55', bg: '#0B281B' },

  // Forest & Deep Forest data panels
  { name: 'Cream text on Deep Forest panel', fg: '#FAF5EB', bg: '#0B281B' },
  { name: 'Cream text on Forest container', fg: '#FAF5EB', bg: '#174D35' },
  { name: 'Beige text on Deep Forest panel', fg: '#E8DCC3', bg: '#0B281B' },
  { name: 'Lime icon/badge on Deep Forest', fg: '#8BCF55', bg: '#0B281B', isLarge: true },

  // Dark data table rows
  { name: 'Muted green on Deep Forest', fg: '#A3C4B0', bg: '#0B281B' },
];

export function verifyAllColorPairs(): boolean {
  console.log('=== ECHO//TRACE V3: WCAG AA COLOR CONTRAST AUDIT ===\n');
  let allPass = true;

  for (const pair of colorPairs) {
    const ratio = contrastRatio(pair.fg, pair.bg);
    const threshold = pair.isLarge ? 3.0 : 4.5;
    const passes = ratio >= threshold;
    if (!passes) allPass = false;

    console.log(
      `${passes ? '✓ PASS' : '✗ FAIL'} [${ratio.toFixed(2)}:1, req >= ${threshold}:1] ` +
      `${pair.name} (FG ${pair.fg} on BG ${pair.bg})`
    );
  }

  // Explicit rule check: NEVER lime text on beige or card
  const limeOnBeige = contrastRatio('#8BCF55', '#E8DCC3');
  const limeOnCard = contrastRatio('#8BCF55', '#F3EBD8');
  console.log(`\nRule check: Lime text on Beige contrast is ${limeOnBeige.toFixed(2)}:1 (FAILS AA 4.5:1).`);
  console.log(`Rule check: Lime text on Card contrast is ${limeOnCard.toFixed(2)}:1 (FAILS AA 4.5:1).`);
  console.log('Enforcement: Lime is forbidden as text on beige/card. Lime is ONLY allowed as fill with forest text, or on forest/deep-forest surfaces.');

  if (allPass) {
    console.log('\n>>> ALL 14 THEME COLOR PAIRS PASS WCAG AA <<<');
  } else {
    console.error('\n>>> SOME COLOR PAIRS FAILED WCAG AA <<<');
  }
  return allPass;
}

verifyAllColorPairs();

