import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages publishes this project under /My-company-book/.
export default defineConfig({
  base: '/My-company-book/',
  plugins: [react()],
});
