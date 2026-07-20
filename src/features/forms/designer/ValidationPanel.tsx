import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@/components/ui/alert.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import type { ValidationIssue } from '@/features/forms/types.ts';
import { translateValidationIssue } from '@/features/forms/validation/translateValidationIssue.ts';
import { cn } from '@/lib/utils.ts';

interface ValidationPanelProps {
  issues: ValidationIssue[];
  className?: string;
}

export function ValidationPanel({
  issues,
  className,
}: ValidationPanelProps): JSX.Element {
  const { t } = useTranslation('validation');

  if (issues.length === 0) {
    return (
      <Alert className={cn('mx-auto mt-4 max-w-2xl', className)}>
        <CheckCircle2 />
        <AlertDescription>{t('panel.allPassed')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={cn('mx-auto mt-4 max-w-2xl', className)}>
      <CardHeader className='border-b'>
        <CardTitle className='flex items-center gap-2 text-base'>
          <AlertTriangle className='size-4 text-amber-600 dark:text-amber-400' />
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
                <Badge variant='outline'>{issue.code}</Badge>
                <AlertDescription className='text-foreground'>
                  {translateValidationIssue(issue, t)}
                </AlertDescription>
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
