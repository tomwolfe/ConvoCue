import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@huggingface/transformers', 'onnxruntime-web']
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@huggingface/transformers')) {
              return 'transformers';
            } else if (id.includes('@ricky0123/vad-web') || id.includes('@ricky0123/vad-react')) {
              return 'vad';
            } else if (id.includes('lucide-react')) {
              return 'icons';
            } else if (id.includes('onnxruntime-web')) {
              return 'onnx';
            } else {
              return 'vendor';
            }
          }
        }
      }
    }
  }
})