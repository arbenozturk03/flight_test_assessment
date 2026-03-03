// Polyfill Promise.try (ES2025) for older browsers — required by pdfjs-dist v5
{
  const P = Promise as unknown as Record<string, unknown>;
  if (typeof P.try !== 'function') {
    P.try = (fn: () => unknown) => new Promise((resolve) => resolve(fn()));
  }
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App';

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const r of regs) r.unregister();
  });
} else {
  registerSW({ immediate: true });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
