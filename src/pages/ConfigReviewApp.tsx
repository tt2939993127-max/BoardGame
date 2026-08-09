import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import { GlobalErrorBoundary } from '../components/system/GlobalErrorBoundary';
import { installGlobalErrorContextCapture } from '../lib/feedback/errorContext';
import { ConfigReviewRoutes } from './ConfigReviewRoutes';

function ConfigReviewContent() {
  useEffect(() => {
    installGlobalErrorContextCapture();
  }, []);

  return <ConfigReviewRoutes />;
}

export default function ConfigReviewApp() {
  return (
    <GlobalErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <ConfigReviewContent />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </GlobalErrorBoundary>
  );
}
