import commonEn from '@/i18n/locales/en/common.json';
import commonEs from '@/i18n/locales/es/common.json';
import type { AppLocale } from '@/lib/locale.ts';

export interface DocumentMetaCopy {
  title: string;
  description: string;
}

export const DOCUMENT_META: Record<AppLocale, DocumentMetaCopy> = {
  en: {
    title: commonEn.meta.title,
    description: commonEn.meta.description,
  },
  es: {
    title: commonEs.meta.title,
    description: commonEs.meta.description,
  },
};

export function getDocumentMeta(locale: AppLocale): DocumentMetaCopy {
  return DOCUMENT_META[locale];
}
