import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import {
  PANEL_SHEET_CLASSNAME,
  PanelHeader,
  PanelHeaderCloseButton,
  PanelSurface,
} from '@/components/panel/index.ts';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet.tsx';
import { useIsMobile } from '@/hooks/use-mobile.ts';
import { cn } from '@/lib/utils.ts';

import type { WorkflowInspectorBodyProps } from './WorkflowInspectorBody.tsx';
import { WorkflowInspectorBody } from './WorkflowInspectorBody.tsx';

export type InspectorMode = 'node' | 'edge' | 'workflow';

interface WorkflowInspectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: InspectorMode;
  title: string;
  subtitle: string | null;
  badges?: JSX.Element;
  bodyProps: Omit<WorkflowInspectorBodyProps, 'mode'>;
}

/**
 * Workflow inspector — docked right rail on desktop, floating bottom sheet on
 * mobile. The body component is shared so the same content renders in either
 * surface. The `key` is derived from the selection so each target remounts
 * with fresh local editor state.
 */
export function WorkflowInspector({
  open,
  onOpenChange,
  mode,
  title,
  subtitle,
  badges,
  bodyProps,
}: WorkflowInspectorProps): JSX.Element | null {
  const { t } = useTranslation('workflows');
  const isMobile = useIsMobile();

  if (!open) {
    return null;
  }

  const body = (
    <WorkflowInspectorBody
      mode={mode}
      {...bodyProps}
    />
  );

  if (isMobile) {
    return (
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
        modal
      >
        <SheetContent
          side='bottom'
          showCloseButton={false}
          className={cn(PANEL_SHEET_CLASSNAME, 'h-full')}
        >
          <SheetTitle className='sr-only'>{title}</SheetTitle>
          <PanelHeader
            surface='mobile'
            title={title}
            subtitle={subtitle ?? undefined}
            badges={badges}
            overlay={
              <PanelHeaderCloseButton
                onClick={() => {
                  onOpenChange(false);
                }}
                label={t('inspector.close')}
              />
            }
          />
          {body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <PanelSurface
      className='inspector-shell w-full max-w-[22rem] xl:max-w-[24rem]'
      aria-label={t('inspector.nodeSettings')}
    >
      <PanelHeader
        surface='desktop'
        title={title}
        subtitle={subtitle ?? undefined}
        badges={badges}
        overlay={
          <PanelHeaderCloseButton
            onClick={() => {
              onOpenChange(false);
            }}
            label={t('inspector.close')}
          />
        }
      />
      {body}
    </PanelSurface>
  );
}
