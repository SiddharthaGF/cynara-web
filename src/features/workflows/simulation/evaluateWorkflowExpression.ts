import type { WorkflowExpression } from '@/features/workflows/types.ts';

/** A single test-data value the simulation can evaluate conditions against. */
export type SimulationValue = string | number | boolean | null;

/** Test-data record keyed by workflow input code. */
export type SimulationValues = Readonly<Record<string, SimulationValue>>;

/**
 * Values produced while evaluating an expression. A literal array (from a
 * `lit` node) is legal in the schema, so the internal evaluator keeps it
 * around to power membership checks in `eq`; the public entry point flattens
 * arrays back to `null` because they are not standalone test values.
 */
type EvalValue = SimulationValue | string[];

function isEmptyValue(value: EvalValue | undefined): boolean {
  return (
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

/**
 * Best-effort numeric coercion. Numbers pass through; numeric strings parse;
 * booleans map to 1/0 so `true eq 1` style conditions behave predictably.
 * Returns `null` when the value has no numeric reading.
 */
function toNumber(value: EvalValue | undefined): number | null {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  return null;
}

function arrayIncludes(array: string[], value: EvalValue): boolean {
  if (typeof value === 'number') {
    return array.some((item) => Number(item) === value);
  }
  if (typeof value === 'boolean') {
    return array.some((item) => item === String(value));
  }
  return array.includes(value as string);
}

/**
 * Equality with the schema's loose typing: a numeric literal on either side
 * upgrades the comparison to numbers; a right-hand `lit` array becomes a
 * membership check; everything else compares by identity (so null matches
 * null and booleans match booleans).
 */
function valuesEqual(left: EvalValue, right: EvalValue): boolean {
  if (typeof left === 'number' || typeof right === 'number') {
    const a = toNumber(left);
    const b = toNumber(right);
    return a !== null && b !== null && a === b;
  }
  if (Array.isArray(right)) {
    return arrayIncludes(right, left);
  }
  if (Array.isArray(left)) {
    return arrayIncludes(left, right);
  }
  return left === right;
}

function ordering(
  left: EvalValue,
  right: EvalValue,
  op: 'gt' | 'gte' | 'lt' | 'lte',
): boolean {
  const a = toNumber(left);
  const b = toNumber(right);
  if (a === null || b === null) {
    return false;
  }
  switch (op) {
    case 'gt': {
      return a > b;
    }
    case 'gte': {
      return a >= b;
    }
    case 'lt': {
      return a < b;
    }
    case 'lte': {
      return a <= b;
    }
    default: {
      return false;
    }
  }
}

function truthy(value: EvalValue): boolean {
  return !isEmptyValue(value) && Boolean(value);
}

function evalExpression(
  expression: WorkflowExpression,
  values: SimulationValues,
): EvalValue {
  if ('ref' in expression && expression.ref) {
    return values[expression.ref] ?? null;
  }
  if ('lit' in expression) {
    return expression.lit;
  }
  if ('op' in expression && expression.op) {
    const args = expression.args ?? [];
    const evaluate = (index: number): EvalValue =>
      args[index] === undefined ? null : evalExpression(args[index], values);
    switch (expression.op) {
      case 'eq': {
        return valuesEqual(evaluate(0), evaluate(1));
      }
      case 'neq': {
        return !valuesEqual(evaluate(0), evaluate(1));
      }
      case 'gt': {
        return ordering(evaluate(0), evaluate(1), 'gt');
      }
      case 'gte': {
        return ordering(evaluate(0), evaluate(1), 'gte');
      }
      case 'lt': {
        return ordering(evaluate(0), evaluate(1), 'lt');
      }
      case 'lte': {
        return ordering(evaluate(0), evaluate(1), 'lte');
      }
      case 'and': {
        return args.every((arg) => truthy(evalExpression(arg, values)));
      }
      case 'or': {
        return args.some((arg) => truthy(evalExpression(arg, values)));
      }
      case 'not': {
        return !truthy(evalExpression(args[0], values));
      }
      case 'empty': {
        return isEmptyValue(evaluate(0));
      }
      case 'coalesce': {
        for (const arg of args) {
          const value = evalExpression(arg, values);
          if (!isEmptyValue(value)) {
            return value;
          }
        }
        return null;
      }
      default: {
        return null;
      }
    }
  }
  return null;
}

/**
 * Evaluates a workflow transition condition against the given test values.
 *
 * Comparison and boolean operations return booleans; `empty` and `coalesce`
 * are the schema's utility operators. A missing ref evaluates to `null` so
 * `eq`/`neq`/`empty` stay total over partial test data.
 */
export function evaluateWorkflowExpression(
  expression: WorkflowExpression,
  values: SimulationValues,
): SimulationValue {
  const result = evalExpression(expression, values);
  return Array.isArray(result) ? null : result;
}
