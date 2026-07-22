import {
  type FormEvent,
  type JSX,
  type KeyboardEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import {
  Mention,
  MentionContent,
  MentionLabel,
  MentionTextarea,
} from '@/components/ui/mention.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import type { FieldType, FormDraftModel } from '@/features/forms/types.ts';
import { useIsMobile } from '@/hooks/use-mobile.ts';

import { ChatComposerActions } from './ChatComposerActions.tsx';
import { FieldMentionList, TypeMentionList } from './ChatMentionLists.tsx';
import {
  filterMentionableFields,
  listMentionableFields,
} from './fieldMentions.ts';
import {
  detectMentionTrigger,
  filterMentionableFieldTypes,
  listMentionableFieldTypes,
} from './fieldTypeMentions.ts';

export { ChatAiTrigger, ChatEmptyState } from './ChatMentionLists.tsx';

interface ChatComposerProps {
  value: string;
  model: FormDraftModel;
  locale: string;
  modelLabel: string | null;
  disabled: boolean;
  /** Send / Enter may fire (includes queue-while-busy). */
  canSubmit: boolean;
  canRetry: boolean;
  isBusy: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRetry: () => void;
  onStop: () => void;
}

const FIELD_TYPE_KEYS = [
  'text',
  'textarea',
  'number',
  'integer',
  'boolean',
  'date',
  'datetime',
  'time',
  'choice',
  'group',
  'repeater',
  'component-ref',
] as const satisfies readonly FieldType[];

export function ChatComposer({
  value,
  model,
  locale,
  modelLabel,
  disabled,
  canSubmit,
  canRetry,
  isBusy,
  onChange,
  onSubmit,
  onRetry,
  onStop,
}: ChatComposerProps): JSX.Element {
  const { t } = useTranslation('designer');
  const isMobile = useIsMobile();
  const [mentionedValues, setMentionedValues] = useState<string[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [activeTrigger, setActiveTrigger] = useState<'@' | '#'>('@');
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  /**
   * DiceUI stores `trigger` in useState and does not sync prop changes, so we
   * remount when switching @ ↔ #. Guard + restore so remount does not wipe text
   * (inputValue is not written to the DOM).
   */
  const triggerRemountRef = useRef<{
    text: string;
    caret: number;
  } | null>(null);

  const mentionableFields = useMemo(
    () => listMentionableFields(model),
    [model],
  );
  const fieldById = useMemo(
    () => new Map(mentionableFields.map((field) => [field.id, field])),
    [mentionableFields],
  );

  const typeLabels = useMemo(() => {
    const map = {} as Record<FieldType, { label: string; description: string }>;
    for (const type of FIELD_TYPE_KEYS) {
      map[type] = {
        label: t(`fieldTypes.${type}.label`),
        description: t(`fieldTypes.${type}.description`),
      };
    }
    return map;
  }, [t]);

  const mentionableTypes = useMemo(
    () => listMentionableFieldTypes(locale, typeLabels),
    [locale, typeLabels],
  );
  const typeBySlug = useMemo(
    () => new Map(mentionableTypes.map((item) => [item.slug, item])),
    [mentionableTypes],
  );

  // Autofocus on open (mount) and restore text/caret after remount (clear / trigger switch).
  // On mobile (<768px) skip the autofocus — opening the chat must not pop the
  // Soft keyboard. The user can tap the composer to focus it explicitly.
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    const pending = triggerRemountRef.current;
    if (pending) {
      triggerRemountRef.current = null;
      if (input.value !== pending.text) {
        input.value = pending.text;
      }
      if (!disabled) {
        input.focus({ preventScroll: true });
      }
      input.setSelectionRange(pending.caret, pending.caret);
      // Re-open the mention menu for the new trigger (DiceUI listens on select).
      input.dispatchEvent(new Event('select', { bubbles: true }));
      // Force highlighter re-read of DOM value after restore.
      setMentionedValues((prev) => [...prev]);
      return;
    }

    if (!disabled && !isMobile) {
      input.focus({ preventScroll: true });
    }
  }, [disabled, activeTrigger, isMobile]);

  function syncTriggerFromCaret(nextValue: string, caret: number): void {
    const detected = detectMentionTrigger(nextValue, caret);
    if (!detected) {
      return;
    }
    if (detected !== activeTrigger) {
      triggerRemountRef.current = { text: nextValue, caret };
      setActiveTrigger(detected);
      return;
    }
    setActiveTrigger(detected);
  }

  function handleFilter(options: string[], term: string): string[] {
    if (activeTrigger === '#') {
      const matched = new Set(
        filterMentionableFieldTypes(
          options
            .map((slug) => typeBySlug.get(slug))
            .filter(
              (item): item is NonNullable<typeof item> => item !== undefined,
            ),
          term,
        ).map((item) => item.slug),
      );
      return options.filter((slug) => matched.has(slug));
    }

    const matched = new Set(
      filterMentionableFields(
        options
          .map((id) => fieldById.get(id))
          .filter(
            (field): field is NonNullable<typeof field> => field !== undefined,
          ),
        term,
      ).map((field) => field.id),
    );
    return options.filter((id) => matched.has(id));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    syncTriggerFromCaret(
      event.currentTarget.value,
      event.currentTarget.selectionStart ?? 0,
    );
    if (mentionOpen) {
      return;
    }
    // Enter sends; Shift+Enter inserts a newline.
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSubmit) {
        event.currentTarget.form?.requestSubmit();
      }
    }
  }

  const isTypeMode = activeTrigger === '#';
  const emptyLabel = isTypeMode
    ? t('ai.mention.typeEmpty')
    : t('ai.mention.empty');
  const menuHint = isTypeMode ? t('ai.mention.typeHint') : t('ai.mention.hint');
  let composerHint = modelLabel;
  if (mentionOpen) {
    composerHint = isTypeMode
      ? t('ai.mention.typeComposerHint')
      : t('ai.mention.composerHint');
  }

  return (
    <form
      className='w-full'
      onSubmit={onSubmit}
    >
      <div
        ref={wrapRef}
        className='ai-chat-composer'
      >
        <Mention
          key={activeTrigger}
          trigger={activeTrigger}
          loop
          disabled={disabled}
          inputValue={value}
          onInputValueChange={(next) => {
            // Remount for @↔# can emit ''; keep parent text until restore runs.
            const pending = triggerRemountRef.current;
            if (pending && next.length === 0 && pending.text.length > 0) {
              return;
            }
            onChange(next);
            if (next.length === 0) {
              setMentionedValues([]);
              setMentionOpen(false);
            }
            requestAnimationFrame(() => {
              const el = document.activeElement;
              if (
                el instanceof HTMLTextAreaElement ||
                el instanceof HTMLInputElement
              ) {
                syncTriggerFromCaret(next, el.selectionStart ?? next.length);
              }
            });
          }}
          value={mentionedValues}
          onValueChange={setMentionedValues}
          onOpenChange={setMentionOpen}
          onFilter={handleFilter}
          className='w-full'
        >
          <MentionLabel className='sr-only'>
            {isTypeMode ? t('ai.mention.typeLabel') : t('ai.mention.label')}
          </MentionLabel>
          <ScrollArea className='ai-chat-composer-scroll w-full'>
            <MentionTextarea
              // DiceUI does not bind inputValue to the DOM; seed on remount.
              ref={inputRef}
              defaultValue={value}
              placeholder={
                isMobile ? t('ai.placeholderShort') : t('ai.placeholder')
              }
              disabled={disabled}
              onKeyDown={handleKeyDown}
              onClick={(event) => {
                syncTriggerFromCaret(
                  event.currentTarget.value,
                  event.currentTarget.selectionStart ?? 0,
                );
              }}
              onKeyUp={(event) => {
                syncTriggerFromCaret(
                  event.currentTarget.value,
                  event.currentTarget.selectionStart ?? 0,
                );
              }}
              className='ai-chat-mention-input border-0 bg-transparent px-1 py-2 text-sm leading-6 shadow-none focus-visible:ring-0'
            />
          </ScrollArea>
          <MentionContent
            side='top'
            sideOffset={8}
            className='ai-chat-mention-menu w-[min(100%,20rem)] overflow-hidden p-1.5'
          >
            {isTypeMode ? (
              <TypeMentionList
                types={mentionableTypes}
                emptyLabel={emptyLabel}
                menuHint={menuHint}
              />
            ) : (
              <FieldMentionList
                fields={mentionableFields}
                emptyLabel={emptyLabel}
                menuHint={menuHint}
              />
            )}
          </MentionContent>
        </Mention>

        <ChatComposerActions
          canRetry={canRetry}
          canSubmit={canSubmit}
          isBusy={isBusy}
          composerHint={composerHint}
          onRetry={onRetry}
          onStop={onStop}
        />
      </div>
    </form>
  );
}
