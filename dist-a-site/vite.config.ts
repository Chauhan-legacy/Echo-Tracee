import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      'echotrace-math': path.resolve(__dirname, 'packages/echotrace-math/src/index.ts'),
    },
  },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/dist-a-site/**', '**/dist-b-library/**', '**/release-zips/**'],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@noble')) {
            return 'vendor-crypto';
          }
          if (id.includes('node_modules/ml-random-forest')) {
            return 'vendor-ml';
          }
          if (id.includes('node_modules/mp4box') || id.includes('node_modules/exifr') || id.includes('node_modules/ssim.js')) {
            return 'vendor-media';
          }
          if (id.includes('node_modules/qrcode')) {
            return 'vendor-qr';
          }
          if (id.includes('node_modules/meyda') || id.includes('node_modules/fft.js')) {
            return 'vendor-dsp';
          }
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
});
