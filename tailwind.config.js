/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        term: {
          bg: '#080B11',
          card: '#0F1420',
          border: '#1E2638',
          hover: '#172033',
          dim: '#8E9BAE',
          muted: '#4B5565',
        },
        cyan: {
          glow: '#00F0FF',
          DEFAULT: '#00F0FF',
          dark: '#007A82',
        },
        amber: {
          glow: '#FFB800',
          DEFAULT: '#FFB800',
          dark: '#8C6400',
        },
        red: {
          glow: '#FF3366',
          DEFAULT: '#FF3366',
          dark: '#8A1530',
        },
      },
      fontFamily: {
        sans: ['InterVariable', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 15px rgba(0, 240, 255, 0.25)',
        'glow-amber': '0 0 15px rgba(255, 184, 0, 0.25)',
        'glow-red': '0 0 15px rgba(255, 51, 102, 0.25)',
      },
      animation: {
        'sweep': 'sweep 3s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        sweep: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        scanline: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '0 100%' },
        },
      },
    },
  },
  plugins: [],
}
