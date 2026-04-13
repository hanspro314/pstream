/* PStream — Service Worker Registration (client component) */

'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          if (process.env.NODE_ENV !== 'production') console.log('[PStream] Service Worker registered:', registration.scope);

          // Check for updates periodically
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'activated') {
                  if (process.env.NODE_ENV !== 'production') console.log('[PStream] New Service Worker activated');
                }
              });
            }
          });
        })
        .catch((error) => {
          if (process.env.NODE_ENV !== 'production') console.warn('[PStream] Service Worker registration failed:', error);
        });
    }
  }, []);

  return null;
}
