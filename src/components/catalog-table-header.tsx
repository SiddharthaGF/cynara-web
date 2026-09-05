import type { JSX } from 'react';

import {
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx';

export interface CatalogTableColumn {
  id: string;
  label: string;
}

interface CatalogTableHeaderProps {
  columns: CatalogTableColumn[];
  actionsLabel: string;
}

/**
 * Table head row with a screen-reader-only actions column, shared by the
 * form, workflow, and patient catalog tables. Callers translate every
 * label; column ids only key the row.
 */
export function CatalogTableHeader({
  columns,
  actionsLabel,
}: CatalogTableHeaderProps): JSX.Element {
  return (
    <TableHeader>
      <TableRow>
        {columns.map((column) => (
          <TableHead key={column.id}>{column.label}</TableHead>
        ))}
        <TableHead className='text-right'>
          <span className='sr-only'>{actionsLabel}</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}
