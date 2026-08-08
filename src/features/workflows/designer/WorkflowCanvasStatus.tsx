import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { StatusPill } from '@/components/status-pill.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx';
import type { SaveState } from '@/features/workflows/designer/useWorkflowDraft.ts';
import type { WorkflowValidationIssue } from '@/features/workflows/types.ts';
import { translateWorkflowIssue } from '@/features/workflows/validation/translateWorkflowIssue.ts';
import { cn } from '@/lib/utils.ts';

interface WorkflowCanvasStatusProps {
  issues: WorkflowValidationIssue[];
  saveState: SaveState;
  saveError: string | null;
  onSelectIssue: (issue: WorkflowValidationIssue) => void;
}

/**
 * Single floating status pill for the workflow canvas. It combines graph
 * validation issues and the last save failure into one button so the overlay
 * never shows stacked pills: red when errors exist, amber when only warnings
 * remain. When the server rejects the draft for a rule the client already
 * reports (same issue code in the raw error), the raw payload is omitted so
 * the problem is surfaced exactly once, translated.
 */
export function WorkflowCanvasStatus({
  issues,
  saveState,
  saveError,
  onSelectIssue,
}: WorkflowCanvasStatusProps): JSX.Element | null {
  const { t } = useTranslation('workflows');
  const [open, setOpen] = useState(false);

  const hasSaveError = saveState === 'error' && saveError !== null;
  // The server rejects drafts against the same rule set the client reports.
  // A raw error mentioning a listed issue code duplicates that issue.
  // It is therefore neither shown verbatim nor counted as an extra error.
  const saveErrorCovered =
    hasSaveError && coversAnyIssueCode(saveError, issues);
  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  const errorCount =
    errors.length + (hasSaveError && !saveErrorCovered ? 1 : 0);
  const warningCount = warnings.length;

  if (errorCount === 0 && warningCount === 0) {
    return null;
  }

  const hasErrors = errorCount > 0;
  const summary = ((): string => {
    const errorsLabel = t('panel.errors', { count: errorCount });
    const warningsLabel = t('panel.warnings', { count: warningCount });
    if (hasErrors && warningCount > 0) {
      return t('panel.errorsAndWarnings', {
        errors: errorsLabel,
        warnings: warningsLabel,
      });
    }
    if (hasErrors) {
      return errorsLabel;
    }
    return warningsLabel;
  })();

  const hasRawSaveError = hasSaveError && !saveErrorCovered;

  return (
    <StatusPill
      variant={hasErrors ? 'error' : 'warning'}
      summary={summary}
      ariaLabel={summary}
      title={summary}
      popoverTitle={hasRawSaveError ? t('save.errorTitle') : t('panel.title')}
      popoverDescription={issues.length > 0 ? t('panel.locateHint') : undefined}
      open={open}
      onOpenChange={setOpen}
    >
      {hasRawSaveError ? (
        <div className='border-b border-border/60'>
          <p className='px-3 py-2.5 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap text-foreground select-text'>
            {saveError}
          </p>
        </div>
      ) : null}
      {issues.length > 0 ? (
        <ScrollArea className='max-h-64'>
          <ul className='divide-y divide-border/60'>
            {issues.map((issue) => (
              <IssueRow
                key={`${issue.code}-${issue.path}`}
                issue={issue}
                onClose={() => {
                  setOpen(false);
                }}
                onSelect={onSelectIssue}
              />
            ))}
          </ul>
        </ScrollArea>
      ) : null}
    </StatusPill>
  );
}

function escapeRegExp(text: string): string {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

function coversAnyIssueCode(
  message: string,
  issues: readonly WorkflowValidationIssue[],
): boolean {
  const codes = new Set(issues.map((issue) => issue.code));
  if (codes.size === 0) {
    return false;
  }
  const pattern = new RegExp(
    [...codes].map((code) => escapeRegExp(code)).join('|'),
    'u',
  );
  return pattern.test(message);
}

function IssueRow({
  issue,
  onClose,
  onSelect,
}: {
  issue: WorkflowValidationIssue;
  onClose: () => void;
  onSelect: (issue: WorkflowValidationIssue) => void;
}): JSX.Element {
  const { t } = useTranslation('workflows');
  const hasNode = issue.nodeId !== undefined;
  const severityClass =
    issue.severity === 'error'
      ? 'border-destructive/40 text-destructive'
      : 'border-amber-500/40 text-amber-600 dark:text-amber-400';
  const content = (
    <>
      <span className='flex flex-wrap items-center gap-1.5'>
        <Tooltip>
          <TooltipTrigger
            render={
              <span
                tabIndex={0}
                className='inline-flex w-fit outline-none focus-visible:ring-2 focus-visible:ring-ring'
              >
                <Badge
                  variant='outline'
                  className={cn('font-mono text-[0.625rem]', severityClass)}
                >
                  {issue.code}
                </Badge>
              </span>
            }
          />
          <TooltipContent side='top'>
            {translateWorkflowIssue(issue, t)}
          </TooltipContent>
        </Tooltip>
        {hasNode ? (
          <code className='font-mono text-[0.625rem] text-muted-foreground'>
            {issue.nodeId}
          </code>
        ) : null}
      </span>
      <span className='text-sm text-foreground'>
        {translateWorkflowIssue(issue, t)}
      </span>
    </>
  );

  if (!hasNode) {
    return <li className='flex flex-col gap-1 px-3 py-2.5'>{content}</li>;
  }

  return (
    <li>
      <button
        type='button'
        className='flex w-full flex-col gap-1 px-3 py-2.5 text-left outline-none select-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent'
        onClick={() => {
          onClose();
          onSelect(issue);
        }}
      >
        {content}
      </button>
    </li>
  );
}
