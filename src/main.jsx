import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

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
