
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // 允许在客户端代码中使用 process.env.API_KEY
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  },
  server: {
    port: 5173,
    open: true
  }
});
