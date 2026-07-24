import { Braces, Copy, Download } from 'lucide-react';
import { useMemo, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx';
import { formatFormExportJson } from '@/features/forms/model/formDraft.ts';
import type { FormDraftModel } from '@/features/forms/types.ts';

interface FormJsonExportMenuProps {
  formCode: string;
  model: FormDraftModel;
}

export function FormJsonExportMenu({
  formCode,
  model,
}: FormJsonExportMenuProps): JSX.Element {
  const { t } = useTranslation('designer');
  const json = useMemo(() => formatFormExportJson(model), [model]);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(json);
      toast.success(t('formPreview.jsonCopied'));
    } catch {
      toast.error(t('formPreview.copyJson'));
    }
  }

  function handleDownload(): void {
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${formCode}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  // The export trigger is icon-only on mobile, so we wrap it in a Tooltip
  // For discoverability while still letting the dropdown open on click.
  // `TooltipTrigger render={<DropdownMenuTrigger/>}` nests cleanly because
  // The dropdown trigger accepts a `render` prop itself, allowing it to
  // Project onto the underlying Button.
  return (
    <Tooltip>
      <DropdownMenu>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  aria-label={t('formPreview.exportJson')}
                  className='gap-1.5'
                />
              }
            >
              <Braces className='size-3.5' />
              <span className='hidden sm:inline'>
                {t('formPreview.exportJson')}
              </span>
            </DropdownMenuTrigger>
          }
        />
        <DropdownMenuContent align='start'>
          <DropdownMenuItem
            onClick={() => {
              void handleCopy();
            }}
          >
            <Copy className='size-4' />
            {t('formPreview.copyJson')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownload}>
            <Download className='size-4' />
            {t('formPreview.downloadJson')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <TooltipContent side='bottom'>
        {t('formPreview.exportJson')}
      </TooltipContent>
    </Tooltip>
  );
}
