import { useCallback, useEffect, useState } from 'react';
import { RouterProvider } from 'react-router';
import { AppProviders } from './providers/AppProviders';
import { router } from './router/router';
import { EntregaiAnimatedSplash } from '@/shared/components/EntregaiAnimatedSplash';

export default function App() {
  const [showPostLoginSplash, setShowPostLoginSplash] = useState(false);

  useEffect(() => {
    const handlePostLoginSplash = () => setShowPostLoginSplash(true);
    window.addEventListener('entregai-post-login-splash', handlePostLoginSplash);
    return () => {
      window.removeEventListener('entregai-post-login-splash', handlePostLoginSplash);
    };
  }, []);

  const handleSplashFinish = useCallback(() => {
    setShowPostLoginSplash(false);
  }, []);

  return (
    <AppProviders>
      <RouterProvider router={router} />
      {showPostLoginSplash ? (
        <div className="fixed inset-0 z-[9999] flex">
          <EntregaiAnimatedSplash onFinish={handleSplashFinish} />
        </div>
      ) : null}
    </AppProviders>
  );
}
