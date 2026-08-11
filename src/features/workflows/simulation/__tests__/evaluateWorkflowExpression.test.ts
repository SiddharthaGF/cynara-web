import { describe, expect, it } from 'vitest';

import { evaluateWorkflowExpression } from '@/features/workflows/simulation/evaluateWorkflowExpression.ts';
import type { WorkflowExpression } from '@/features/workflows/types.ts';

const eq = (
  ref: string,
  lit: string | number | boolean | null | string[],
): WorkflowExpression => ({
  op: 'eq',
  args: [{ ref }, { lit }],
});

describe('evaluateWorkflowExpression', () => {
  it('resolves refs from the test values and treats missing ones as null', () => {
    expect(evaluateWorkflowExpression({ ref: 'age' }, { age: 42 })).toBe(42);
    expect(evaluateWorkflowExpression({ ref: 'missing' }, {})).toBeNull();
  });

  it('returns literals as-is', () => {
    expect(evaluateWorkflowExpression({ lit: 'high' }, {})).toBe('high');
    expect(evaluateWorkflowExpression({ lit: 18 }, {})).toBe(18);
    expect(evaluateWorkflowExpression({ lit: true }, {})).toBeTruthy();
    expect(evaluateWorkflowExpression({ lit: null }, {})).toBeNull();
  });

  describe('eq / neq', () => {
    it('compares strings by identity', () => {
      expect(
        evaluateWorkflowExpression(eq('risk', 'high'), { risk: 'high' }),
      ).toBeTruthy();
      expect(
        evaluateWorkflowExpression(eq('risk', 'high'), { risk: 'low' }),
      ).toBeFalsy();
    });

    it('upgrades numeric comparisons so "42" equals 42', () => {
      const expr: WorkflowExpression = {
        op: 'eq',
        args: [{ ref: 'age' }, { lit: 42 }],
      };
      expect(evaluateWorkflowExpression(expr, { age: 42 })).toBeTruthy();
      expect(evaluateWorkflowExpression(expr, { age: '42' })).toBeTruthy();
      expect(evaluateWorkflowExpression(expr, { age: 'forty' })).toBeFalsy();
    });

    it('matches null against a null literal and nothing else', () => {
      const expr: WorkflowExpression = {
        op: 'eq',
        args: [{ ref: 'note' }, { lit: null }],
      };
      expect(evaluateWorkflowExpression(expr, { note: null })).toBeTruthy();
      expect(evaluateWorkflowExpression(expr, {})).toBeTruthy();
      expect(evaluateWorkflowExpression(expr, { note: 'x' })).toBeFalsy();
    });

    it('supports membership checks against literal arrays', () => {
      const expr: WorkflowExpression = {
        op: 'eq',
        args: [{ ref: 'state' }, { lit: ['admitted', 'observed'] }],
      };
      expect(
        evaluateWorkflowExpression(expr, { state: 'admitted' }),
      ).toBeTruthy();
      expect(
        evaluateWorkflowExpression(expr, { state: 'discharged' }),
      ).toBeFalsy();
    });

    it('negates eq for neq', () => {
      const expr: WorkflowExpression = {
        op: 'neq',
        args: [{ ref: 'risk' }, { lit: 'high' }],
      };
      expect(evaluateWorkflowExpression(expr, { risk: 'low' })).toBeTruthy();
      expect(evaluateWorkflowExpression(expr, { risk: 'high' })).toBeFalsy();
    });
  });

  describe('ordering', () => {
    it('compares numeric values', () => {
      const gt: WorkflowExpression = {
        op: 'gt',
        args: [{ ref: 'age' }, { lit: 18 }],
      };
      expect(evaluateWorkflowExpression(gt, { age: 20 })).toBeTruthy();
      expect(evaluateWorkflowExpression(gt, { age: 18 })).toBeFalsy();
    });

    it('coerces numeric strings', () => {
      const gte: WorkflowExpression = {
        op: 'gte',
        args: [{ ref: 'score' }, { lit: 10 }],
      };
      expect(evaluateWorkflowExpression(gte, { score: '10' })).toBeTruthy();
    });

    it('returns false when an operand has no numeric reading', () => {
      const lt: WorkflowExpression = {
        op: 'lt',
        args: [{ ref: 'age' }, { lit: 18 }],
      };
      expect(evaluateWorkflowExpression(lt, { age: 'unknown' })).toBeFalsy();
      expect(evaluateWorkflowExpression(lt, { age: null })).toBeFalsy();
    });
  });

  describe('boolean operators', () => {
    it('evaluates and / or over expression results', () => {
      const and: WorkflowExpression = {
        op: 'and',
        args: [
          { op: 'gt', args: [{ ref: 'age' }, { lit: 18 }] },
          { op: 'eq', args: [{ ref: 'insured' }, { lit: true }] },
        ],
      };
      expect(
        evaluateWorkflowExpression(and, { age: 20, insured: true }),
      ).toBeTruthy();
      expect(
        evaluateWorkflowExpression(and, { age: 16, insured: true }),
      ).toBeFalsy();

      const or: WorkflowExpression = {
        op: 'or',
        args: [
          { op: 'gt', args: [{ ref: 'age' }, { lit: 65 }] },
          { op: 'eq', args: [{ ref: 'pregnant' }, { lit: true }] },
        ],
      };
      expect(
        evaluateWorkflowExpression(or, { age: 70, pregnant: false }),
      ).toBeTruthy();
      expect(
        evaluateWorkflowExpression(or, { age: 30, pregnant: false }),
      ).toBeFalsy();
    });

    it('negates with not', () => {
      const not: WorkflowExpression = {
        op: 'not',
        args: [{ op: 'eq', args: [{ ref: 'risk' }, { lit: 'high' }] }],
      };
      expect(evaluateWorkflowExpression(not, { risk: 'low' })).toBeTruthy();
      expect(evaluateWorkflowExpression(not, { risk: 'high' })).toBeFalsy();
    });
  });

  describe('utility operators', () => {
    it('empty matches null, empty string and empty array', () => {
      const empty: WorkflowExpression = {
        op: 'empty',
        args: [{ ref: 'note' }],
      };
      expect(evaluateWorkflowExpression(empty, { note: null })).toBeTruthy();
      expect(evaluateWorkflowExpression(empty, { note: '' })).toBeTruthy();
      expect(evaluateWorkflowExpression(empty, {})).toBeTruthy();
      expect(evaluateWorkflowExpression(empty, { note: 'x' })).toBeFalsy();
    });

    it('coalesce returns the first non-empty argument', () => {
      const coalesce: WorkflowExpression = {
        op: 'coalesce',
        args: [{ ref: 'primary' }, { ref: 'fallback' }, { lit: 'none' }],
      };
      expect(
        evaluateWorkflowExpression(coalesce, {
          primary: '',
          fallback: 'ph-01',
        }),
      ).toBe('ph-01');
      expect(evaluateWorkflowExpression(coalesce, { primary: 'ph-00' })).toBe(
        'ph-00',
      );
      expect(evaluateWorkflowExpression(coalesce, {})).toBe('none');
    });
  });
});
