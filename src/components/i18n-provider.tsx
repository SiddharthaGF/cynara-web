import type { JSX, ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

import { i18nInstance } from '@/i18n/index.ts';

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps): JSX.Element {
  return <I18nextProvider i18n={i18nInstance}>{children}</I18nextProvider>;
}
