import { isIncompleteExpression } from '@/features/workflows/model/workflowExpression.ts';
import type {
  WorkflowEdge,
  WorkflowExpression,
  WorkflowGraph,
  WorkflowNode,
  WorkflowValidationIssue,
} from '@/features/workflows/types.ts';

export function issue(
  code: string,
  path: string,
  message: string,
  severity: WorkflowValidationIssue['severity'],
  extras: { nodeId?: string; edgeIndex?: number } = {},
): WorkflowValidationIssue {
  return { code, path, message, severity, ...extras };
}

/** Traverse the condition AST, calling visit for every `ref` node. */
export function visitConditionRefs(
  expression: WorkflowExpression,
  visit: (ref: string) => void,
): void {
  if ('ref' in expression && expression.ref) {
    visit(expression.ref);
  }
  if ('op' in expression && expression.args) {
    for (const arg of expression.args) {
      visitConditionRefs(arg, visit);
    }
  }
}

/** Detect a directed cycle with Kahn's algorithm; returns the first cycle edge. */
export function findCycleEdge(
  graph: WorkflowGraph,
): { index: number; from: string; to: string } | null {
  const indegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  for (const node of graph.nodes) {
    indegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }
  for (const edge of graph.edges) {
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
    adjacency.get(edge.from)?.push(edge.to);
  }
  const queue: string[] = [];
  for (const node of graph.nodes) {
    if ((indegree.get(node.id) ?? 0) === 0) {
      queue.push(node.id);
    }
  }
  let visited = 0;
  while (queue.length > 0) {
    const id = queue.shift();
    if (id === undefined) {
      break;
    }
    visited += 1;
    for (const next of adjacency.get(id) ?? []) {
      const nextDegree = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, nextDegree);
      if (nextDegree === 0) {
        queue.push(next);
      }
    }
  }
  if (visited === graph.nodes.length) {
    return null;
  }
  // Any remaining edge inside the cycle is reported as the offending edge.
  for (const [index, edge] of graph.edges.entries()) {
    if (
      (indegree.get(edge.from) ?? 0) > 0 &&
      (indegree.get(edge.to) ?? 0) > 0
    ) {
      return { index, from: edge.from, to: edge.to };
    }
  }
  return null;
}

export function validateEdgeStructure(
  issues: WorkflowValidationIssue[],
  graph: WorkflowGraph,
  nodeById: Map<string, WorkflowNode>,
  edgeKeySeen: Set<string>,
  edge: WorkflowEdge,
  index: number,
  key: string,
  context: 'draft' | 'published',
): void {
  if (!nodeById.has(edge.from)) {
    issues.push(
      issue(
        'EDGE_UNKNOWN_NODE',
        `/edges/${index}/from`,
        `Edge source '${edge.from}' does not match any node.`,
        'error',
        { edgeIndex: index },
      ),
    );
  }
  if (!nodeById.has(edge.to)) {
    issues.push(
      issue(
        'EDGE_UNKNOWN_NODE',
        `/edges/${index}/to`,
        `Edge target '${edge.to}' does not match any node.`,
        'error',
        { edgeIndex: index },
      ),
    );
  }
  if (edgeKeySeen.has(key)) {
    issues.push(
      issue(
        'EDGE_DUPLICATE',
        `/edges/${index}`,
        `Transition from '${edge.from}' to '${edge.to}' already exists.`,
        'error',
        { edgeIndex: index },
      ),
    );
  }
  edgeKeySeen.add(key);

  const { condition } = edge;
  if (!condition) {
    return;
  }
  const source = nodeById.get(edge.from);
  if (source && source.type !== 'decision') {
    issues.push(
      issue(
        'NON_DECISION_CONDITION',
        `/edges/${index}/condition`,
        'Conditions are only allowed on outgoing edges of decision nodes.',
        'warning',
        { nodeId: edge.from, edgeIndex: index },
      ),
    );
  }
  let incomplete = false;
  if ('op' in condition && condition.args) {
    incomplete = isIncompleteExpression(condition);
  }
  if (incomplete) {
    issues.push(
      issue(
        'CONDITION_INCOMPLETE',
        `/edges/${index}/condition`,
        'Transition condition is missing a field or a value.',
        context === 'published' ? 'error' : 'warning',
        { nodeId: edge.from, edgeIndex: index },
      ),
    );
  }
  visitConditionRefs(condition, (ref) => {
    if (!(graph.inputs ?? []).includes(ref)) {
      issues.push(
        issue(
          'CONDITION_UNKNOWN_REF',
          `/edges/${index}/condition`,
          `Condition references '${ref}', which is not declared in the workflow inputs.`,
          'warning',
          { nodeId: edge.from, edgeIndex: index },
        ),
      );
    }
  });
}
