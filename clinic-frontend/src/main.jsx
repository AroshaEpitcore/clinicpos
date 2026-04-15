import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './store/AuthContext';
import { ThemeProvider } from './store/ThemeContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          richColors
          expand={false}
          duration={4500}
          closeButton
          visibleToasts={5}
          toastOptions={{
            style: {
              fontSize: '14px',
              fontWeight: '500',
              padding: '12px 16px',
              gap: '10px',
              borderRadius: '10px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)',
              minWidth: '300px',
            },
          }}
        />
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
