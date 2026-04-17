import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Debug fetch descriptor
const fetchDesc = Object.getOwnPropertyDescriptor(window, 'fetch');
console.log('Fetch descriptor in main.tsx:', fetchDesc);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
