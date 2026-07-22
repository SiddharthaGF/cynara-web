import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { I18nProvider } from '@/components/i18n-provider.tsx';
import { QueryProvider } from '@/components/query-provider.tsx';
import { Toaster } from '@/components/ui/sonner.tsx';
import { TooltipProvider } from '@/components/ui/tooltip.tsx';
import { localeInitScript } from '@/lib/locale.ts';
import { themeInitScript } from '@/lib/theme.ts';

import appCss from '@/index.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent(): ReactNode {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({
  children,
}: Readonly<{ children: ReactNode }>): ReactNode {
  return (
    <html
      lang='en'
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: localeInitScript }} />
        <HeadContent />
      </head>
      <body>
        <I18nProvider>
          <QueryProvider>
            <TooltipProvider>
              {children}
              <Toaster position='bottom-right' />
            </TooltipProvider>
          </QueryProvider>
        </I18nProvider>
        <Scripts />
      </body>
    </html>
  );
}
