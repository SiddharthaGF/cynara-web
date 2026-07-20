import { Braces, Check, Copy, Download } from 'lucide-react';
import { useMemo, useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button.tsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx';
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
  const [copied, setCopied] = useState(false);
  const json = useMemo(() => formatFormExportJson(model), [model]);

  async function handleCopy(): Promise<void> {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    window.setTimeout(() => {
      setCopied(false);
    }, 2000);
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='gap-1.5'
          />
        }
      >
        <Braces className='size-3.5' />
        <span className='hidden sm:inline'>{t('formPreview.exportJson')}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start'>
        <DropdownMenuItem
          onClick={() => {
            void handleCopy();
          }}
        >
          {copied ? <Check className='size-4' /> : <Copy className='size-4' />}
          {copied ? t('formPreview.jsonCopied') : t('formPreview.copyJson')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownload}>
          <Download className='size-4' />
          {t('formPreview.downloadJson')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
