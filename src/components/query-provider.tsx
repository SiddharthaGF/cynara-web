import { QueryClientProvider } from '@tanstack/react-query';
import type { JSX, ReactNode } from 'react';
import { useState } from 'react';

import { createQueryClient } from '@/lib/query-client.ts';

export function QueryProvider({
  children,
}: Readonly<{ children: ReactNode }>): JSX.Element {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
