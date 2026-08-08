import type { JSX } from 'react';
import { memo, useMemo } from 'react';
import ReactMarkdown, {
  defaultUrlTransform,
  type Components,
} from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cn } from '@/lib/utils.ts';

import {
  type MentionHit,
  MentionChip,
  scanMentionHits,
} from './ChatMentionContent.tsx';
import type { MentionableField } from './fieldMentions.ts';
import type { MentionableFieldType } from './fieldTypeMentions.ts';

/**
 * Renders assistant chat text as markdown (GFM) with mention chips injected
 * inline. Mentions are encoded as markdown links under a private URI scheme
 * before parsing; the `a` component then decodes them back into chips. The
 * children handed to react-markdown stays a plain string, which the parser
 * requires (passing elements throws "Unexpected value").
 */
const MENTION_SCHEME = 'cynara-mention:';

function encodeMentions(
  content: string,
  fieldsById?: Map<string, MentionableField>,
  typesBySlug?: Map<string, MentionableFieldType>,
): string {
  const hits = scanMentionHits(content, fieldsById, typesBySlug);
  if (hits.length === 0) {
    return content;
  }
  hits.sort((a, b) => a.index - b.index);
  let source = '';
  let cursor = 0;
  for (const hit of hits) {
    source += content.slice(cursor, hit.index);
    if (hit.kind === 'field' && hit.field) {
      const { id } = hit.field;
      source += `[@${id}](${MENTION_SCHEME}f:${id})`;
    } else if (hit.kind === 'type' && hit.fieldType) {
      const { slug } = hit.fieldType;
      source += `[#${slug}](${MENTION_SCHEME}t:${slug})`;
    } else {
      source += content.slice(hit.index, hit.index + hit.length);
    }
    cursor = hit.index + hit.length;
  }
  source += content.slice(cursor);
  return source;
}

function resolveMentionUri(
  uri: string,
  fieldsById?: Map<string, MentionableField>,
  typesBySlug?: Map<string, MentionableFieldType>,
): MentionHit | null {
  if (!uri.startsWith(MENTION_SCHEME)) {
    return null;
  }
  const [kind, id] = uri.slice(MENTION_SCHEME.length).split(':', 2);
  if (kind === 'f' && id) {
    const field = fieldsById?.get(id);
    if (field) {
      return { index: 0, length: 0, kind: 'field', label: field.label, field };
    }
  } else if (kind === 't' && id) {
    const fieldType = typesBySlug?.get(id);
    if (fieldType) {
      return {
        index: 0,
        length: 0,
        kind: 'type',
        label: fieldType.label,
        fieldType,
      };
    }
  }
  return null;
}

const baseComponents: Components = {
  p: ({ children }) => (
    <p className='my-1.5 first:mt-0 last:mb-0'>{children}</p>
  ),
  ul: ({ children }) => (
    <ul className='my-1.5 list-disc space-y-0.5 pl-5 first:mt-0 last:mb-0'>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className='my-1.5 list-decimal space-y-0.5 pl-5 first:mt-0 last:mb-0'>
      {children}
    </ol>
  ),
  li: ({ children }) => <li className='leading-relaxed'>{children}</li>,
  h1: ({ children }) => (
    <h1 className='my-2 text-lg font-semibold first:mt-0 last:mb-0'>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className='my-2 text-base font-semibold first:mt-0 last:mb-0'>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className='my-1.5 text-[15px] font-semibold first:mt-0 last:mb-0'>
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className='my-1.5 text-sm font-semibold first:mt-0 last:mb-0'>
      {children}
    </h4>
  ),
  strong: ({ children }) => (
    <strong className='font-semibold text-foreground'>{children}</strong>
  ),
  em: ({ children }) => <em>{children}</em>,
  code: ({ className, children }) => {
    const isBlock =
      typeof className === 'string' && className.includes('language-');
    return (
      <code
        className={cn(
          'font-mono text-[0.85em]',
          className,
          isBlock ? 'block' : 'rounded bg-muted px-1 py-0.5 text-foreground',
        )}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className='my-2 overflow-x-auto rounded-lg bg-muted p-2.5'>
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className='my-1.5 border-l-2 border-border pl-3 text-muted-foreground'>
      {children}
    </blockquote>
  ),
  hr: () => <hr className='my-2 border-border' />,
  table: ({ children }) => (
    <div className='my-2 overflow-x-auto'>
      <table className='w-full border-collapse text-[0.9em]'>{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className='border border-border bg-muted/50 px-2 py-1 text-left font-medium'>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className='border border-border px-2 py-1'>{children}</td>
  ),
};

/**
 * Memoized so a streaming delta on one turn does not re-parse the (unchanged)
 * markdown of every settled turn in the transcript.
 */
export const ChatMarkdownContent = memo(
  ({
    content,
    fieldsById,
    typesBySlug,
  }: {
    content: string;
    fieldsById?: Map<string, MentionableField>;
    typesBySlug?: Map<string, MentionableFieldType>;
  }): JSX.Element => {
    const components = useMemo<Components>(
      () => ({
        ...baseComponents,
        a: ({ href, children }) => {
          if (href) {
            const hit = resolveMentionUri(href, fieldsById, typesBySlug);
            if (hit) {
              return <MentionChip hit={hit} />;
            }
          }
          return (
            <a
              href={href}
              target='_blank'
              rel='noreferrer'
              className='text-primary underline underline-offset-3 hover:text-primary/80'
            >
              {children}
            </a>
          );
        },
      }),
      [fieldsById, typesBySlug],
    );
    const source = encodeMentions(content, fieldsById, typesBySlug);
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={(url) =>
          url.startsWith(MENTION_SCHEME) ? url : defaultUrlTransform(url)
        }
        components={components}
      >
        {source}
      </ReactMarkdown>
    );
  },
);
