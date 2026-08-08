import { isComparisonOperator } from '@/features/workflows/model/workflowGraph.ts';
import type {
  WorkflowBooleanOp,
  WorkflowComparisonOp,
  WorkflowExpression,
} from '@/features/workflows/types.ts';

export interface EditableComparison {
  kind: 'comparison';
  ref: string;
  op: WorkflowComparisonOp;
  value: string;
}

export interface EditableGroup {
  kind: 'group';
  combinator: 'and' | 'or';
  items: EditableCondition[];
}

export interface EditableNot {
  kind: 'not';
  item: EditableCondition;
}

export type EditableCondition =
  | EditableComparison
  | EditableGroup
  | EditableNot;

export const DEFAULT_COMPARISON_OP: WorkflowComparisonOp = 'eq';

export function createComparison(
  ref = '',
  op: WorkflowComparisonOp = DEFAULT_COMPARISON_OP,
): EditableComparison {
  return { kind: 'comparison', ref, op, value: '' };
}

export function createGroup(combinator: 'and' | 'or' = 'and'): EditableGroup {
  return { kind: 'group', combinator, items: [createComparison()] };
}

export function createNot(): EditableNot {
  return { kind: 'not', item: createComparison() };
}

function stringifyLiteral(expression: WorkflowExpression): string {
  if ('lit' in expression && expression.lit !== undefined) {
    return String(expression.lit);
  }
  return '';
}

function literalFromString(value: string): string | number | boolean | null {
  if (value === '') {
    return null;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  const numeric = Number(value);
  if (value.trim() !== '' && !Number.isNaN(numeric)) {
    return numeric;
  }
  return value;
}

function refOf(expression: WorkflowExpression): string {
  if ('ref' in expression && expression.ref) {
    return expression.ref;
  }
  return '';
}

export function expressionToEditable(
  expression: WorkflowExpression,
): EditableCondition {
  if ('ref' in expression && expression.ref) {
    // A bare boolean-valued ref reads as a boolean. The editor cannot express
    // That succinctly, so model it as an explicit comparison to keep the AST
    // Round-trippable.
    return { kind: 'comparison', ref: expression.ref, op: 'eq', value: 'true' };
  }
  if (
    'lit' in expression &&
    expression.lit !== undefined &&
    typeof expression.lit === 'boolean'
  ) {
    return {
      kind: 'comparison',
      ref: '',
      op: 'eq',
      value: String(expression.lit),
    };
  }
  if (
    'op' in expression &&
    expression.op === 'not' &&
    expression.args.length === 1
  ) {
    return {
      kind: 'not',
      item: expressionToEditable(expression.args[0] ?? { lit: true }),
    };
  }
  if (
    'op' in expression &&
    (expression.op === 'and' || expression.op === 'or')
  ) {
    return {
      kind: 'group',
      combinator: expression.op,
      items: expression.args.map((arg) => expressionToEditable(arg)),
    };
  }
  if ('op' in expression && isComparisonOperator(expression.op)) {
    const [left, right] = expression.args;
    return {
      kind: 'comparison',
      ref: left ? refOf(left) : '',
      op: expression.op,
      value: right ? stringifyLiteral(right) : '',
    };
  }
  return createComparison();
}

/** True when the comparison can be serialized into a structurally valid AST. */
export function isComparisonComplete(comparison: EditableComparison): boolean {
  return comparison.ref.trim() !== '' && comparison.value.trim() !== '';
}

export function isConditionComplete(condition: EditableCondition): boolean {
  switch (condition.kind) {
    case 'comparison': {
      return isComparisonComplete(condition);
    }
    case 'group': {
      return (
        condition.items.length > 0 && condition.items.every(isConditionComplete)
      );
    }
    case 'not': {
      return isConditionComplete(condition.item);
    }
    default: {
      return false;
    }
  }
}

export function editableToExpression(
  condition: EditableCondition,
): WorkflowExpression | undefined {
  switch (condition.kind) {
    case 'comparison': {
      const ref = condition.ref.trim();
      const value = condition.value.trim();
      if (ref === '' || value === '') {
        return undefined;
      }
      return {
        op: condition.op,
        args: [{ ref }, { lit: literalFromString(value) }],
      };
    }
    case 'group': {
      const args: WorkflowExpression[] = [];
      for (const item of condition.items) {
        const expression = editableToExpression(item);
        if (expression) {
          args.push(expression);
        }
      }
      if (args.length === 0) {
        return undefined;
      }
      // The contract requires and/or groups to hold at least two operands.
      // Unwrap single-operand groups so serialized output stays valid.
      if (args.length === 1) {
        const [single] = args;
        return single === undefined ? undefined : single;
      }
      const op: WorkflowBooleanOp = condition.combinator;
      return { op, args };
    }
    case 'not': {
      const inner = editableToExpression(condition.item);
      if (!inner) {
        return undefined;
      }
      return { op: 'not', args: [inner] };
    }
    default: {
      return undefined;
    }
  }
}
