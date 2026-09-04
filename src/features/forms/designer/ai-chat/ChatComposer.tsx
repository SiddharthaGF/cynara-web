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

import type { FieldType, FormDraftModel } from '@/features/forms/types.ts';
import { useIsMobile } from '@/hooks/use-mobile.ts';

import { FIELD_TYPE_KEYS } from '../fieldTypeMeta.ts';
import { ChatComposerActions } from './ChatComposerActions.tsx';
import { ChatComposerMention } from './ChatComposerMention.tsx';
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
   * DiceUI stores `trigger` in useState without syncing props, so we remount on
   * @ ↔ # switch; guard + restore keeps text (inputValue is not written to DOM).
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

  // Autofocus on mount; restore text/caret after remount. On mobile, skip focus
  // So opening the chat does not pop the soft keyboard — the user can tap to focus.
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

  // Cap items while no query is typed: DiceUI re-renders every item per arrow
  // Key, so an unbounded list stalls navigation. A typed query renders the full list.
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
        <ChatComposerMention
          value={value}
          disabled={disabled}
          activeTrigger={activeTrigger}
          inputRef={inputRef}
          mentionedValues={mentionedValues}
          isTypeMode={isTypeMode}
          visibleFields={visibleFields}
          visibleTypes={visibleTypes}
          emptyLabel={emptyLabel}
          menuHint={menuHint}
          label={isTypeMode ? t('ai.mention.typeLabel') : t('ai.mention.label')}
          placeholder={
            isMobile ? t('ai.placeholderShort') : t('ai.placeholder')
          }
          onMentionedValuesChange={setMentionedValues}
          onMentionOpenChange={setMentionOpen}
          onFilter={handleFilter}
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
            // Caret is final here (DiceUI wrote the DOM first); capture it so
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
        />

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
