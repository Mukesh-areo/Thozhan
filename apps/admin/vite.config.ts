import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // The workspace root hoists a different react than react-dom; resolve both from this app.
  resolve: { dedupe: ['react', 'react-dom'] },
  server: { port: 5173 },
});
