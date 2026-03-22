import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App.tsx';
import './index.css';
import { queryClient } from './lib/queryClient.ts';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#ffffff',
            color: '#0f172a',
            border: '1px solid #dbeafe',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
          },
        }}
      />
    </QueryClientProvider>
  </StrictMode>,
);
