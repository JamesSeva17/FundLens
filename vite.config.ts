
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensures assets load correctly on GitHub Pages subdirectories
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Removed minify: 'terser' to fix the build error.
    // Vite uses esbuild by default which is already included.
  },
});
