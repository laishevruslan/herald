import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider as LayerhubProvider } from '@layerhub-io/react';
// Registers fabric.Frame / StaticText / StaticPath / … (also pulled by @layerhub-io/core).
import '@layerhub-io/objects';
import { App } from './App';
import './fonts.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LayerhubProvider>
      <App />
    </LayerhubProvider>
  </StrictMode>,
);
