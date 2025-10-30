import { Toaster } from 'react-hot-toast';

const ToastProvider = () => (
  <Toaster
    position="top-right"
    toastOptions={{
      duration: 3000,
      style: {
        background: 'var(--toast-bg)',
        color: 'var(--toast-color)',
        border: '1px solid var(--toast-border)',
      },
      success: {
        iconTheme: {
          primary: '#10b981',
          secondary: '#fff',
        },
      },
      error: {
        iconTheme: {
          primary: '#ef4444',
          secondary: '#fff',
        },
      },
    }}
  />
);

export default ToastProvider;
