import type { FormDraftModel } from '@/features/forms/types.ts';

import type { FormAiChatSheetProps } from './FormAiChatSheet.tsx';
import { FormAiChatSheetContent } from './FormAiChatSheetContent.tsx';

export function FormAiChatSheet({
  open,
  onOpenChange,
  formCode,
  locale,
  model,
  readOnly,
  onApplyDraft,
}: FormAiChatSheetProps): React.JSX.Element | null {
  return (
    <FormAiChatSheetContent
      open={open}
      onOpenChange={onOpenChange}
      formCode={formCode}
      locale={locale}
      model={model}
      readOnly={readOnly}
      onApplyDraft={onApplyDraft}
    />
  );
}

export type { FormAiChatSheetProps };
export type { FormDraftModel };
