import { FlaskConical } from 'lucide-react';
import { useMemo, useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';

import {
  PANEL_SHEET_CLASSNAME,
  PanelHeader,
  PanelHeaderCloseButton,
} from '@/components/panel/index.ts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet.tsx';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs.tsx';
import type { WorkflowBranchEvaluation } from '@/features/workflows/simulation/simulateWorkflow.ts';
import type {
  WorkflowGraph,
  WorkflowValidationIssue,
} from '@/features/workflows/types.ts';
import { blockingIssues } from '@/features/workflows/validation/validateWorkflowGraph.ts';
import { useIsMobile } from '@/hooks/use-mobile.ts';
import { cn } from '@/lib/utils.ts';

import { useWorkflowSimulation } from './useWorkflowSimulation.ts';
import { WorkflowRulesPanel } from './WorkflowRulesPanel.tsx';
import { WorkflowSimulationTab } from './WorkflowSimulationTab.tsx';

interface WorkflowPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: string;
  graph: WorkflowGraph;
  validationIssues: WorkflowValidationIssue[];
}

export function WorkflowPreviewDialog({
  open,
  onOpenChange,
  code,
  graph,
  validationIssues,
}: WorkflowPreviewDialogProps): JSX.Element {
  const { t } = useTranslation('workflows');
  const isMobile = useIsMobile();

  if (!open) {
    return isMobile ? (
      <Sheet
        open={false}
        onOpenChange={onOpenChange}
      >
        {null}
      </Sheet>
    ) : (
      <Dialog
        open={false}
        onOpenChange={onOpenChange}
      >
        {null}
      </Dialog>
    );
  }

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
          className={cn(PANEL_SHEET_CLASSNAME, '!h-[100dvh]')}
        >
          <SheetTitle className='sr-only'>{t('preview.title')}</SheetTitle>
          <PanelHeader
            surface='mobile'
            icon={<FlaskConical className='size-4' />}
            title={t('preview.title')}
            overlay={
              <PanelHeaderCloseButton
                onClick={() => {
                  onOpenChange(false);
                }}
                label={t('preview.close')}
              />
            }
          />
          <WorkflowPreviewBody
            graph={graph}
            validationIssues={validationIssues}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        showCloseButton={false}
        className='preview-modal flex h-[min(90dvh,52rem)] w-[min(96vw,52rem)] max-w-[min(96vw,52rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,52rem)]'
      >
        <DialogTitle className='sr-only'>{t('preview.title')}</DialogTitle>
        <DialogDescription className='sr-only'>
          {t('preview.disclaimer')}
        </DialogDescription>
        <PanelHeader
          surface='desktop'
          eyebrow={code}
          icon={<FlaskConical className='size-4' />}
          title={t('preview.title')}
          meta={
            <p className='max-w-prose text-xs leading-relaxed text-muted-foreground'>
              {t('preview.disclaimer')}
            </p>
          }
          overlay={
            <PanelHeaderCloseButton
              onClick={() => {
                onOpenChange(false);
              }}
              label={t('preview.close')}
            />
          }
        />

        <WorkflowPreviewBody
          graph={graph}
          validationIssues={validationIssues}
        />
      </DialogContent>
    </Dialog>
  );
}

function WorkflowPreviewBody({
  graph,
  validationIssues,
}: {
  graph: WorkflowGraph;
  validationIssues: WorkflowValidationIssue[];
}): JSX.Element {
  const { t } = useTranslation('workflows');
  const [activeTab, setActiveTab] = useState('simulation');
  const [hasRun, setHasRun] = useState(false);
  const control = useWorkflowSimulation(graph);

  const hasBlockingIssues = blockingIssues(validationIssues).length > 0;

  // Latest evaluation per decision branch across the recorded walk.
  // The rules tab uses it to show how each guard evaluated.
  const evaluations = useMemo(() => {
    const map = new Map<string, WorkflowBranchEvaluation>();
    for (const step of control.simulation.steps) {
      for (const branch of step.branchEvaluations) {
        map.set(branch.edgeKey, branch);
      }
    }
    return map;
  }, [control.simulation]);

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        if (typeof value === 'string') {
          setActiveTab(value);
        }
      }}
      className='flex min-h-0 flex-1 flex-col gap-0 overflow-hidden'
    >
      <div className='canvas-grid preview-stage relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-xl'>
        <div className='flex shrink-0 flex-col gap-2 border-b border-border/30 px-3 pt-2.5 pb-2 sm:px-5 sm:pt-3 sm:pb-0'>
          <TabsList
            variant='line'
            className='h-9 shrink-0 rounded-none bg-transparent px-1'
          >
            <TabsTrigger
              value='simulation'
              className='px-4'
            >
              {t('preview.tabSimulation')}
            </TabsTrigger>
            <TabsTrigger
              value='rules'
              className='px-4'
            >
              {t('preview.tabRules')}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className='relative h-0 min-h-0 flex-1 overflow-hidden'>
          <TabsContent
            value='simulation'
            className='absolute inset-0 mt-0 overflow-hidden outline-none'
          >
            <WorkflowSimulationTab
              graph={graph}
              control={control}
              hasRun={hasRun}
              onRun={() => {
                setHasRun(true);
                control.setCurrentStepIndex(0);
              }}
            />
          </TabsContent>

          <TabsContent
            value='rules'
            className='absolute inset-0 mt-0 overflow-hidden outline-none'
          >
            <ScrollArea className='h-full'>
              <div className='px-4 py-4 sm:px-5'>
                <WorkflowRulesPanel
                  graph={graph}
                  evaluations={evaluations}
                  hasBlockingIssues={hasBlockingIssues}
                />
              </div>
            </ScrollArea>
          </TabsContent>
        </div>
      </div>
    </Tabs>
  );
}
