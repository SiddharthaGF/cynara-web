import type { JSX, ReactElement, ReactNode } from 'react';
import { Fragment } from 'react';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb.tsx';

export interface PageBreadcrumbEntry {
  /** Stable identity for the crumb within the trail. */
  key: string;
  /** Visible label for the crumb. */
  label: ReactNode;
  /**
   * Optional TanStack `<Link>` element used as the crumb target. Omit for the
   * current page, which renders as plain text.
   */
  link?: ReactElement;
}

interface PageBreadcrumbsProps {
  items: PageBreadcrumbEntry[];
  className?: string;
}

export function PageBreadcrumbs({
  items,
  className,
}: PageBreadcrumbsProps): JSX.Element {
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={item.key}>
              <BreadcrumbItem>
                {isLast || !item.link ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={item.link}>
                    {item.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {isLast ? null : <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
