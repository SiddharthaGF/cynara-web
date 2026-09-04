import { isComparisonOperator } from '@/features/workflows/model/workflowExpression.ts';
import type {
  WorkflowExpression,
  WorkflowGraph,
} from '@/features/workflows/types.ts';

/** Test-data control types offered per workflow input in the preview editor. */
export type SimulationInputType = 'text' | 'number' | 'boolean';

const TYPE_RANK: Record<SimulationInputType, number> = {
  number: 2,
  boolean: 1,
  text: 0,
};

/**
 * Infers a display type per input from its conditions: a numeric literal
 * upgrades to `number`, a boolean literal to `boolean`, else `text`. Only
 * pre-selects the editor control — the evaluator never depends on it.
 */
export function inferInputType(
  graph: WorkflowGraph,
): Record<string, SimulationInputType> {
  const types: Record<string, SimulationInputType> = {};
  for (const input of graph.inputs ?? []) {
    types[input] = 'text';
  }
  for (const edge of graph.edges) {
    if (edge.condition) {
      visitComparisons(edge.condition, (ref, literal) => {
        if (!(ref in types)) {
          return;
        }
        const inferred = literalType(literal);
        if (inferred === null || TYPE_RANK[inferred] <= TYPE_RANK[types[ref]]) {
          return;
        }
        types[ref] = inferred;
      });
    }
  }
  return types;
}

function literalType(value: unknown): SimulationInputType | null {
  if (typeof value === 'number') {
    return 'number';
  }
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  return null;
}

/**
 * Visits every `ref OP lit` comparison in the expression tree. Comparison
 * arguments are not recursed into, so nested refs only surface through their
 * own comparison nodes.
 */
function visitComparisons(
  expression: WorkflowExpression,
  visit: (ref: string, literal: unknown) => void,
): void {
  if ('op' in expression && expression.op && expression.args) {
    if (isComparisonOperator(expression.op) && expression.args.length === 2) {
      const [left, right] = expression.args;
      if ('ref' in left && 'lit' in right) {
        visit(left.ref, right.lit);
      } else if ('ref' in right && 'lit' in left) {
        visit(right.ref, left.lit);
      }
      return;
    }
    for (const arg of expression.args) {
      visitComparisons(arg, visit);
    }
  }
}
