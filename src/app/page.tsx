/* PStream — Main SPA Entry Point */
/* All views are rendered client-side via React state management */

'use client';

import { AppProvider } from '@/lib/store';
import AppShell from '@/components/pstream/AppShell';

export default function HomePage() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
