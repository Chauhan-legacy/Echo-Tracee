/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // V3 Field-notebook & Analyst Workbench Tokens
        beige: {
          DEFAULT: '#E8DCC3', // page background (60%)
          page: '#E8DCC3',
          card: '#F3EBD8',    // card background
          sunken: '#DCCFB2',  // recessed wells & inputs
          hairline: '#C9BB9A',// fine borders & gridlines
        },
        forest: {
          DEFAULT: '#174D35', // structural forest (30%)
          deep: '#0B281B',    // data panels & spectrogram background
          ink: '#10291D',     // high-contrast primary text
          muted: '#3F5E4C',   // secondary labels & captions
        },
        lime: {
          DEFAULT: '#8BCF55', // accent (10%) - fill only with forest text, or on forest
          bright: '#98E05E',
          glow: 'rgba(139, 207, 85, 0.25)',
        },
        brick: {
          DEFAULT: '#A32A1F', // critical findings
          card: '#F7E7E5',
          border: '#D9776E',
        },
        ochre: {
          DEFAULT: '#7A4E00', // warning findings
          card: '#FAF2E4',
          border: '#D4A855',
        },
        cream: {
          DEFAULT: '#FAF5EB',
          dark: '#EBE3D3',
        },
      },
      fontFamily: {
        sans: ['InterVariable', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'panel': '0 2px 8px rgba(16, 41, 29, 0.08), 0 1px 2px rgba(16, 41, 29, 0.04)',
        'elevated': '0 8px 24px rgba(16, 41, 29, 0.12), 0 2px 6px rgba(16, 41, 29, 0.06)',
        'data': 'inset 0 1px 3px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(11, 40, 27, 0.2)',
        'lime-glow': '0 0 16px rgba(139, 207, 85, 0.35)',
      },
    },
  },
  plugins: [],
}
