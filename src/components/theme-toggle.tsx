import { useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';

/** Syncs document title and meta when the active language changes. */
export function DocumentMeta(): null {
  const { t, i18n } = useTranslation('common');

  useLayoutEffect(() => {
    document.title = t('meta.title');
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute('content', t('meta.description'));
    }
    document.documentElement.lang = i18n.language;
  }, [t, i18n.language]);

  return null;
}
