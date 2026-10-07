import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { createDiagnostic, reportDiagnostic } from '@/lib/error-diagnostics';

import './index.css';

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: () => { /* ErrorBoundary reports only its safe projection. */ },
  onUncaughtError: (error) => reportDiagnostic(createDiagnostic(error)),
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
