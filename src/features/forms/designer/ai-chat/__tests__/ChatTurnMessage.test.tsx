import { createInstance } from 'i18next';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeEach, describe, expect, it } from 'vitest';

import { ChatTurnMessage } from '@/features/forms/designer/ai-chat/ChatTurnMessage.tsx';
import type { ChatTurn } from '@/features/forms/designer/ai-chat/chatTurns.ts';
import designerEn from '@/i18n/locales/en/designer.json';

const i18n = createInstance();

function render(turn: ChatTurn): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <ChatTurnMessage turn={turn} />
    </I18nextProvider>,
  );
}

describe('ChatTurnMessage streaming render', () => {
  beforeEach(async () => {
    await i18n.use(initReactI18next).init({
      lng: 'en',
      resources: { en: { designer: designerEn } },
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
    });
  });

  it('renders plain text while the assistant is streaming', () => {
    const html = render({
      id: 'assistant-1',
      role: 'assistant',
      content: '- **text**: texto de una línea.',
      streaming: true,
    });
    expect(html).toContain('- **text**: texto de una línea.');
    expect(html).not.toContain('<ul');
    expect(html).toContain('whitespace-pre-wrap');
  });

  it('renders formatted markdown once the turn settles', () => {
    const html = render({
      id: 'assistant-1',
      role: 'assistant',
      content: '- **text**: texto de una línea.',
    });
    expect(html).toContain('<ul class="my-1.5 list-disc');
    expect(html).toContain(
      '<strong class="font-semibold text-foreground">text</strong>',
    );
    expect(html).not.toContain('whitespace-pre-wrap');
  });
});
