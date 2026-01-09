import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Optimize ONNX Runtime for memory-constrained devices
// These settings affect the main thread (where VAD runs)
import * as ort from 'onnxruntime-web';

// Use a single thread to save memory on mobile
ort.env.wasm.numThreads = 1;
ort.env.wasm.simd = true;

// Force the use of the same WASM paths as configured in AppConfig
// This ensures consistency and helps with caching
ort.env.wasm.wasmPaths = {
  'ort-wasm-simd-threaded.wasm': '/ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.mjs': '/ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.jsep.wasm': '/ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd-threaded.jsep.mjs': '/ort-wasm-simd-threaded.jsep.mjs',
};

// Add error handling for WASM initialization
ort.env.wasm.throwOnOnnxFileError = true;

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    const root = createRoot(rootElement);
    root.render(<App />);
  } catch (error) {
    console.error('Failed to render the app:', error);
    rootElement.innerHTML = `
      <div style="padding: 20px; color: red; font-family: sans-serif;">
        <h1>Failed to mount React</h1>
        <pre>${error.message}</pre>
      </div>
    `;
  }
}

window.onerror = function(message, source, lineno, colno, _error) {
  if (rootElement && rootElement.innerHTML === '') {
    rootElement.innerHTML = `
      <div style="padding: 20px; color: red; font-family: sans-serif;">
        <h1>Runtime Error</h1>
        <pre>${message}</pre>
        <pre>${source}:${lineno}:${colno}</pre>
      </div>
    `;
  }
};
