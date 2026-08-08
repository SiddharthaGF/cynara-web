import { describe, expect, it } from 'vitest';

import { inferInputType } from '@/features/workflows/simulation/inferInputType.ts';
import type { WorkflowGraph } from '@/features/workflows/types.ts';

function graph(overrides: Partial<WorkflowGraph>): WorkflowGraph {
  return {
    schemaVersion: '1.0.0',
    inputs: ['age', 'insured', 'risk', 'unused'],
    nodes: [
      { id: 'start', type: 'start' },
      { id: 'decision', type: 'decision' },
      { id: 'end', type: 'end' },
    ],
    edges: [
      { from: 'start', to: 'decision' },
      { from: 'decision', to: 'end' },
    ],
    ...overrides,
  };
}

describe('inferInputType', () => {
  it('infers number from numeric comparisons', () => {
    const result = inferInputType(
      graph({
        edges: [
          {
            from: 'decision',
            to: 'end',
            condition: { op: 'gte', args: [{ ref: 'age' }, { lit: 18 }] },
          },
        ],
      }),
    );

    expect(result.age).toBe('number');
    expect(result.insured).toBe('text');
    expect(result.risk).toBe('text');
    expect(result.unused).toBe('text');
  });

  it('infers boolean from boolean literals', () => {
    const result = inferInputType(
      graph({
        edges: [
          {
            from: 'decision',
            to: 'end',
            condition: { op: 'eq', args: [{ ref: 'insured' }, { lit: true }] },
          },
        ],
      }),
    );

    expect(result.insured).toBe('boolean');
  });

  it('prefers number over boolean over text when several conditions disagree', () => {
    const result = inferInputType(
      graph({
        edges: [
          {
            from: 'decision',
            to: 'end',
            condition: {
              op: 'and',
              args: [
                { op: 'eq', args: [{ ref: 'insured' }, { lit: true }] },
                { op: 'gt', args: [{ ref: 'age' }, { lit: 18 }] },
                { op: 'eq', args: [{ ref: 'age' }, { lit: 'senior' }] },
              ],
            },
          },
        ],
      }),
    );

    expect(result.age).toBe('number');
    expect(result.insured).toBe('boolean');
  });

  it('handles refs on either side of the comparison', () => {
    const result = inferInputType(
      graph({
        edges: [
          {
            from: 'decision',
            to: 'end',
            condition: { op: 'lte', args: [{ lit: 3 }, { ref: 'risk' }] },
          },
        ],
      }),
    );

    expect(result.risk).toBe('number');
  });

  it('ignores refs that are not declared inputs', () => {
    const result = inferInputType(
      graph({
        edges: [
          {
            from: 'decision',
            to: 'end',
            condition: {
              op: 'eq',
              args: [{ ref: 'undeclared' }, { lit: 5 }],
            },
          },
        ],
      }),
    );

    expect(result.undeclared).toBeUndefined();
  });
});
