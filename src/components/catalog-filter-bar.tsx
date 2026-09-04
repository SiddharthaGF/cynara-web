import { Search } from 'lucide-react';
import type { JSX } from 'react';

import { Input } from '@/components/ui/input.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';

export interface CatalogStatusOption<TStatus extends string> {
  value: TStatus;
  label: string;
}

interface CatalogFilterBarProps<TStatus extends string> {
  query: string;
  onQueryChange: (query: string) => void;
  searchPlaceholder: string;
  statusItems: CatalogStatusOption<TStatus>[];
  status: TStatus;
  onStatusChange: (status: TStatus | null) => void;
  filterStatusLabel: string;
}

/**
 * Search input plus status select shared by the form and workflow
 * catalog tables. Callers own filtering and translate every string.
 */
export function CatalogFilterBar<TStatus extends string>({
  query,
  onQueryChange,
  searchPlaceholder,
  statusItems,
  status,
  onStatusChange,
  filterStatusLabel,
}: CatalogFilterBarProps<TStatus>): JSX.Element {
  return (
    <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
      <div className='relative min-w-0 flex-1'>
        <Search
          aria-hidden
          className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground'
        />
        <Input
          type='search'
          value={query}
          onChange={(event) => {
            onQueryChange(event.target.value);
          }}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className='pl-8'
        />
      </div>
      <Select
        items={statusItems}
        value={status}
        onValueChange={(value) => {
          onStatusChange(value);
        }}
      >
        <SelectTrigger
          className='w-full sm:w-44'
          aria-label={filterStatusLabel}
        >
          <SelectValue placeholder={filterStatusLabel} />
        </SelectTrigger>
        <SelectContent>
          {statusItems.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value}
            >
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
