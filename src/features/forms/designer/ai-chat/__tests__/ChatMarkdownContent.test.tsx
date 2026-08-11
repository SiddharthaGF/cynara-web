import { createInstance } from 'i18next';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeEach, describe, expect, it } from 'vitest';

import { ChatMarkdownContent } from '@/features/forms/designer/ai-chat/ChatMarkdownContent.tsx';
import type { MentionableField } from '@/features/forms/designer/ai-chat/fieldMentions.ts';
import type { MentionableFieldType } from '@/features/forms/designer/ai-chat/fieldTypeMentions.ts';
import designerEn from '@/i18n/locales/en/designer.json';

const i18n = createInstance();

const fieldsById = new Map<string, MentionableField>([
  [
    'weight',
    {
      id: 'weight',
      code: 'weight',
      type: 'number',
      label: 'Peso',
      pathLabel: 'Signos › Peso',
      searchText: 'peso signos › peso weight weight number',
    },
  ],
]);

const typesBySlug = new Map<string, MentionableFieldType>([
  [
    'numero',
    {
      type: 'number',
      slug: 'numero',
      label: 'Número',
      description: 'Campo numérico',
      searchText: 'número campo numérico numero number',
    },
  ],
]);

function render(content: string): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <ChatMarkdownContent
        content={content}
        fieldsById={fieldsById}
        typesBySlug={typesBySlug}
      />
    </I18nextProvider>,
  );
}

describe('ChatMarkdownContent', () => {
  beforeEach(async () => {
    await i18n.use(initReactI18next).init({
      lng: 'en',
      resources: { en: { designer: designerEn } },
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
    });
  });

  it('renders GFM lists and emphasis', () => {
    const html = render(
      '- **text**: texto de una línea.\n- **textarea**: párrafo.',
    );
    expect(html).toContain('<ul class="my-1.5 list-disc');
    expect(html).toContain(
      '<strong class="font-semibold text-foreground">text</strong>',
    );
    expect(html).toContain(
      '<strong class="font-semibold text-foreground">textarea</strong>',
    );
  });

  it('keeps children a string when mentions are present', () => {
    const html = render('Usa @weight y el tipo #numero para números.');
    expect(html).toContain('Peso');
    expect(html).toContain('Número');
    expect(html).not.toContain('cynara-mention:');
    expect(html).not.toContain('Unexpected value');
  });

  it('escapes raw HTML instead of executing it', () => {
    const html = render('<script>alert("x")</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert');
  });
});
