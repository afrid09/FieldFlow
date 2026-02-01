'use client';
// Purpose: Frontend module: providers.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { setupRealtime } from '@/lib/realtime';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeBridge queryClient={queryClient} />
      {children}
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

function RealtimeBridge({ queryClient }: { queryClient: QueryClient }) {
  useEffect(() => {
    return setupRealtime(queryClient);
  }, [queryClient]);

  return null;
}
