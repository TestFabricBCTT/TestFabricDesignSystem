import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: [
      '@mui/material',
      '@emotion/react',
      '@emotion/styled',
      'react',
      'react-dom',
    ],
  },
  server: {
    port: 5173,
    open: true,
    allowedHosts: true,
  },
});
