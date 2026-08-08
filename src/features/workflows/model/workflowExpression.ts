import type {
  WorkflowComparisonOp,
  WorkflowExpression,
} from '@/features/workflows/types.ts';

const COMPARISON_OPERATORS: readonly WorkflowComparisonOp[] = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
];

export function isComparisonOperator(
  value: string,
): value is WorkflowComparisonOp {
  return (COMPARISON_OPERATORS as readonly string[]).includes(value);
}

/** True when a comparison (or nested expression) still lacks a field or value. */
export function isIncompleteExpression(
  expression: WorkflowExpression,
): boolean {
  if ('op' in expression && expression.op && expression.args) {
    if (expression.args.length === 2) {
      const [left, right] = expression.args;
      if (left && right && 'ref' in left && 'lit' in right) {
        return !left.ref || right.lit === null || right.lit === '';
      }
    }
    return expression.args.some(isIncompleteExpression);
  }
  return false;
}

/** Best-effort human-readable rendering of a transition condition. */
export function describeExpression(expression: WorkflowExpression): string {
  if ('ref' in expression && expression.ref) {
    return expression.ref;
  }
  if ('lit' in expression) {
    return String(expression.lit);
  }
  if ('op' in expression && expression.op) {
    if (isIncompleteExpression(expression)) {
      return '';
    }
    const parts = expression.args.map((arg) => describeExpression(arg));
    return parts.join(` ${expression.op} `);
  }
  return '';
}
