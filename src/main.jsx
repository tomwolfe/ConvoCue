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

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    const root = createRoot(rootElement);
    root.render(<App />);
  } catch (error) {
    console.error('Failed to render the app:', error);
    const errorContainer = document.createElement('div');
    errorContainer.style.padding = '20px';
    errorContainer.style.color = 'red';
    errorContainer.style.fontFamily = 'sans-serif';

    const title = document.createElement('h1');
    title.textContent = 'Failed to mount React';
    errorContainer.appendChild(title);

    const message = document.createElement('pre');
    message.textContent = error.message || 'Unknown error';
    errorContainer.appendChild(message);

    rootElement.appendChild(errorContainer);
  }
}

window.onerror = function(message, source, lineno, colno, _error) {
  if (rootElement && rootElement.children.length === 0) {
    const errorContainer = document.createElement('div');
    errorContainer.style.padding = '20px';
    errorContainer.style.color = 'red';
    errorContainer.style.fontFamily = 'sans-serif';

    const title = document.createElement('h1');
    title.textContent = 'Runtime Error';
    errorContainer.appendChild(title);

    const messageElement = document.createElement('pre');
    messageElement.textContent = message || 'Unknown error';
    errorContainer.appendChild(messageElement);

    const locationElement = document.createElement('pre');
    locationElement.textContent = `${source}:${lineno}:${colno}`;
    errorContainer.appendChild(locationElement);

    rootElement.appendChild(errorContainer);
  }
};
