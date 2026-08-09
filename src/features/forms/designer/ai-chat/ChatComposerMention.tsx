import type { JSX, KeyboardEvent, MouseEvent, RefObject } from 'react';

import {
  Mention,
  MentionContent,
  MentionLabel,
  MentionTextarea,
} from '@/components/ui/mention.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';

import { FieldMentionList, TypeMentionList } from './ChatMentionLists.tsx';
import type { MentionableField } from './fieldMentions.ts';
import type { MentionableFieldType } from './fieldTypeMentions.ts';

type MentionTrigger = '@' | '#';

interface ChatComposerMentionProps {
  value: string;
  disabled: boolean;
  activeTrigger: MentionTrigger;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  mentionedValues: string[];
  isTypeMode: boolean;
  visibleFields: MentionableField[];
  visibleTypes: MentionableFieldType[];
  emptyLabel: string;
  menuHint: string;
  label: string;
  placeholder: string;
  onMentionedValuesChange: (values: string[]) => void;
  onMentionOpenChange: (open: boolean) => void;
  onFilter: (options: string[], term: string) => string[];
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onClick: (event: MouseEvent<HTMLTextAreaElement>) => void;
  onKeyUp: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onInputValueChange: (next: string) => void;
}

/**
 * DiceUI mention input for the composer. Remounts when switching @ ↔ # so the
 * trigger stored inside DiceUI's state stays in sync with the active one.
 */
export function ChatComposerMention({
  value,
  disabled,
  activeTrigger,
  inputRef,
  mentionedValues,
  isTypeMode,
  visibleFields,
  visibleTypes,
  emptyLabel,
  menuHint,
  label,
  placeholder,
  onMentionedValuesChange,
  onMentionOpenChange,
  onFilter,
  onKeyDown,
  onClick,
  onKeyUp,
  onInputValueChange,
}: ChatComposerMentionProps): JSX.Element {
  return (
    <Mention
      key={activeTrigger}
      trigger={activeTrigger}
      loop
      disabled={disabled}
      inputValue={value}
      onInputValueChange={onInputValueChange}
      value={mentionedValues}
      onValueChange={onMentionedValuesChange}
      onOpenChange={onMentionOpenChange}
      onFilter={onFilter}
      className='w-full'
    >
      <MentionLabel className='sr-only'>{label}</MentionLabel>
      <ScrollArea className='ai-chat-composer-scroll w-full'>
        <MentionTextarea
          // DiceUI does not bind inputValue to the DOM; seed on remount.
          ref={inputRef}
          data-testid='ai-chat-input'
          defaultValue={value}
          placeholder={placeholder}
          disabled={disabled}
          onKeyDown={onKeyDown}
          onClick={onClick}
          onKeyUp={onKeyUp}
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
  );
}
