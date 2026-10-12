import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

async function enableMocking() {
  const { worker } = await import('./mocks/browser.ts');
  return worker.start({ onUnhandledRequest: 'bypass' });
}

function renderApp() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

enableMocking().then(renderApp).catch((error: unknown) => {
  const root = document.getElementById('root');
  const message = error instanceof Error ? error.message : 'unknown error';
  if (root) root.textContent = `Failed to start the mock server: ${message}`;
});
