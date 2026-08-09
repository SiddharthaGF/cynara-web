import { describe, expect, it } from 'vitest';

import {
  nodeIdFromName,
  slugifyNodeName,
} from '@/features/workflows/model/workflowGraph.ts';

import { graph } from './workflowGraphTestUtils.ts';

describe('slugifyNodeName', () => {
  it('slugs a human name into kebab-case', () => {
    expect(slugifyNodeName('Valoración del dolor')).toBe(
      'valoracion-del-dolor',
    );
  });

  it('strips diacritics, punctuation and repeated separators', () => {
    expect(slugifyNodeName('Pain assessment — step 1!')).toBe(
      'pain-assessment-step-1',
    );
  });

  it('returns an empty string for names with no usable characters', () => {
    expect(slugifyNodeName('***')).toBe('');
    expect(slugifyNodeName('')).toBe('');
  });
});

describe('nodeIdFromName', () => {
  const source = graph(
    [
      { id: 'start', type: 'start' },
      { id: 'task-1', type: 'task' },
      { id: 'end', type: 'end' },
    ],
    [],
  );

  it('derives a readable id from the name for tasks and decisions', () => {
    expect(nodeIdFromName(source, 'task-1', 'Triage assessment')).toBe(
      'triage-assessment',
    );
    const decision = graph([{ id: 'decision-1', type: 'decision' }], []);
    expect(nodeIdFromName(decision, 'decision-1', '¿Riesgo alto?')).toBe(
      'riesgo-alto',
    );
  });

  it('returns null for structural nodes and empty names', () => {
    expect(nodeIdFromName(source, 'start', 'Renamed start')).toBeNull();
    expect(nodeIdFromName(source, 'end', 'Renamed end')).toBeNull();
    expect(nodeIdFromName(source, 'task-1', '')).toBeNull();
  });

  it('returns null when the id would not change', () => {
    const named = graph(
      [{ id: 'triage-assessment', type: 'task', name: 'Triage assessment' }],
      [],
    );
    expect(
      nodeIdFromName(named, 'triage-assessment', 'Triage assessment'),
    ).toBeNull();
  });

  it('prefixes the node type when the name starts with a digit', () => {
    expect(nodeIdFromName(source, 'task-1', '2 fast')).toBe('task-2-fast');
  });

  it('disambiguates against existing ids deterministically', () => {
    const busy = graph(
      [
        { id: 'triage', type: 'task' },
        { id: 'triage-2', type: 'task' },
      ],
      [],
    );
    expect(nodeIdFromName(busy, 'triage-2', 'Triage')).toBe('triage-1');
  });
});
