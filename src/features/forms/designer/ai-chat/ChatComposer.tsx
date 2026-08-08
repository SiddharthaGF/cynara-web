import {
  type FormEvent,
  type JSX,
  type KeyboardEvent,
  useCallback,
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

import { FIELD_TYPE_KEYS } from '../fieldTypeMeta.ts';
import { ChatComposerActions } from './ChatComposerActions.tsx';
import { FieldMentionList, TypeMentionList } from './ChatMentionLists.tsx';
import {
  filterMentionableFields,
  listMentionableFields,
} from './fieldMentions.ts';
import {
  detectMentionState,
  filterMentionableFieldTypes,
  listMentionableFieldTypes,
} from './fieldTypeMentions.ts';

interface ChatComposerProps {
  value: string;
  model: FormDraftModel;
  locale: string;
  modelLabel: string | null;
  disabled: boolean;
  /** Send / Enter may fire (includes queue-while-busy). */
  canSubmit: boolean;
  isBusy: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onStop: () => void;
}

/** Items rendered while the mention menu has no typed query. */
const MAX_VISIBLE_MENTIONS = 50;

export function ChatComposer({
  value,
  model,
  locale,
  modelLabel,
  disabled,
  canSubmit,
  isBusy,
  onChange,
  onSubmit,
  onStop,
}: ChatComposerProps): JSX.Element {
  const { t } = useTranslation('designer');
  const isMobile = useIsMobile();
  const [mentionedValues, setMentionedValues] = useState<string[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [activeTrigger, setActiveTrigger] = useState<'@' | '#'>('@');
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  /** Last known caret position, kept for render-time mention detection. */
  const caretRef = useRef<number | null>(null);
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
    caretRef.current = caret;
    const detected = detectMentionState(nextValue, caret);
    if (!detected) {
      return;
    }
    if (detected.trigger !== activeTrigger) {
      triggerRemountRef.current = { text: nextValue, caret };
      setActiveTrigger(detected.trigger);
      return;
    }
    setActiveTrigger(detected.trigger);
  }

  const handleFilter = useCallback(
    (options: string[], term: string): string[] => {
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
              (field): field is NonNullable<typeof field> =>
                field !== undefined,
            ),
          term,
        ).map((field) => field.id),
      );
      return options.filter((id) => matched.has(id));
    },
    [activeTrigger, fieldById, typeBySlug],
  );

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

  // While the menu is open with no typed query, cap how many items are
  // Registered/rendered: DiceUI re-renders every item on each arrow key, so an
  // Unbounded field list stalls navigation. Once the user types a query, render
  // The full list so any matching field stays reachable through the filter.
  const mentionState = useMemo(
    () =>
      caretRef.current === null
        ? null
        : detectMentionState(value, caretRef.current),
    [value],
  );
  const hasActiveQuery = mentionState !== null && mentionState.query.length > 0;
  const visibleFields = useMemo(
    () =>
      hasActiveQuery
        ? mentionableFields
        : mentionableFields.slice(0, MAX_VISIBLE_MENTIONS),
    [mentionableFields, hasActiveQuery],
  );
  const visibleTypes = useMemo(
    () =>
      hasActiveQuery
        ? mentionableTypes
        : mentionableTypes.slice(0, MAX_VISIBLE_MENTIONS),
    [mentionableTypes, hasActiveQuery],
  );

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
            // DiceUI writes the new value to the DOM before invoking this, so
            // The caret is already final here — capture it synchronously so the
            // Render-time query detection never lags a keystroke behind.
            const el = document.activeElement;
            if (
              el instanceof HTMLTextAreaElement ||
              el instanceof HTMLInputElement
            ) {
              caretRef.current = el.selectionStart ?? next.length;
            }
            requestAnimationFrame(() => {
              const nextEl = document.activeElement;
              if (
                nextEl instanceof HTMLTextAreaElement ||
                nextEl instanceof HTMLInputElement
              ) {
                syncTriggerFromCaret(
                  next,
                  nextEl.selectionStart ?? next.length,
                );
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
              data-testid='ai-chat-input'
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
                types={visibleTypes}
                emptyLabel={emptyLabel}
                menuHint={menuHint}
              />
            ) : (
              <FieldMentionList
                fields={visibleFields}
                emptyLabel={emptyLabel}
                menuHint={menuHint}
              />
            )}
          </MentionContent>
        </Mention>

        <ChatComposerActions
          canSubmit={canSubmit}
          isBusy={isBusy}
          composerHint={composerHint}
          onStop={onStop}
        />
      </div>
    </form>
  );
}
