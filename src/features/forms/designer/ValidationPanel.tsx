import { AlertTriangle } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge.tsx';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx';
import type { ValidationIssue } from '@/features/forms/types.ts';
import { translateValidationIssue } from '@/features/forms/validation/translateValidationIssue.ts';

interface ValidationPanelProps {
  issues: ValidationIssue[];
}

export function ValidationPanel({
  issues,
}: ValidationPanelProps): JSX.Element | null {
  const { t } = useTranslation('validation');

  if (issues.length === 0) {
    return null;
  }

  return (
    <Card className='mx-auto mt-4 max-w-2xl border-destructive/30 bg-card/90'>
      <CardHeader className='border-b border-destructive/20 px-4 py-3'>
        <CardTitle className='flex items-center gap-2 text-sm'>
          <AlertTriangle className='size-4 text-destructive' />
          {t('panel.issuesToFix', { count: issues.length })}
        </CardTitle>
      </CardHeader>
      <CardContent className='overflow-hidden p-0'>
        <ScrollArea className='max-h-64'>
          <ul className='divide-y pr-3'>
            {issues.map((issue) => (
              <li
                key={`${issue.code}-${issue.path}`}
                className='grid gap-1 px-4 py-3'
              >
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <span className='inline-flex w-fit'>
                        <Badge
                          variant='outline'
                          className='font-mono text-[0.625rem]'
                        >
                          {issue.code}
                        </Badge>
                      </span>
                    }
                  />
                  <TooltipContent side='top'>
                    {translateValidationIssue(issue, t)}
                  </TooltipContent>
                </Tooltip>
                <p className='text-sm text-foreground'>
                  {translateValidationIssue(issue, t)}
                </p>
                <code className='text-xs text-muted-foreground'>
                  {issue.path}
                </code>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
