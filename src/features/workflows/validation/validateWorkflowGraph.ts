import {
  DATA_CODE_PATTERN,
  isIncompleteExpression,
  NODE_ID_PATTERN,
} from '@/features/workflows/model/workflowGraph.ts';
import type {
  WorkflowEdge,
  WorkflowExpression,
  WorkflowGraph,
  WorkflowNode,
  WorkflowValidationIssue,
} from '@/features/workflows/types.ts';

export interface ValidateWorkflowGraphOptions {
  /** `published` adds publish-time rules such as pinned form versions. */
  context?: 'draft' | 'published';
}

const NODE_TYPES = new Set(['start', 'end', 'task', 'decision']);

function issue(
  code: string,
  path: string,
  message: string,
  severity: WorkflowValidationIssue['severity'],
  extras: { nodeId?: string; edgeIndex?: number } = {},
): WorkflowValidationIssue {
  return { code, path, message, severity, ...extras };
}

/** Traverse the condition AST, calling visit for every `ref` node. */
function visitConditionRefs(
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
function findCycleEdge(
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
  const queue = graph.nodes
    .map((node) => node.id)
    .filter((id) => (indegree.get(id) ?? 0) === 0);
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

export function validateWorkflowGraph(
  graph: WorkflowGraph,
  options: ValidateWorkflowGraphOptions = {},
): WorkflowValidationIssue[] {
  const context = options.context ?? 'draft';
  const issues: WorkflowValidationIssue[] = [];
  const nodeById = new Map<string, WorkflowNode>();
  const nodeIndexById = new Map<string, number>();

  for (const node of graph.nodes) {
    nodeById.set(node.id, node);
    nodeIndexById.set(node.id, nodeIndexById.size);
  }

  if (!graph.schemaVersion || graph.schemaVersion.trim() === '') {
    issues.push(
      issue(
        'MISSING_SCHEMA_VERSION',
        '/schemaVersion',
        'Workflow schemaVersion is required.',
        'error',
      ),
    );
  }

  // Node structure: id, type, uniqueness.
  const idCounts = new Map<string, number>();
  for (const node of graph.nodes) {
    const index = nodeIndexById.get(node.id) ?? 0;
    const nodeId = node.id;
    idCounts.set(nodeId, (idCounts.get(nodeId) ?? 0) + 1);
    if (!nodeId || nodeId.trim() === '') {
      issues.push(
        issue(
          'MISSING_NODE_ID',
          `/nodes/${index}/id`,
          'Node id is required.',
          'error',
          { nodeId },
        ),
      );
    } else if (!NODE_ID_PATTERN.test(nodeId)) {
      issues.push(
        issue(
          'INVALID_NODE_ID',
          `/nodes/${index}/id`,
          `Node id '${nodeId}' must be lowercase kebab-case.`,
          'error',
          { nodeId },
        ),
      );
    }
    const nodeType = node.type;
    if (!nodeType) {
      issues.push(
        issue(
          'MISSING_NODE_TYPE',
          `/nodes/${index}/type`,
          `Node '${nodeId}' is missing a type.`,
          'error',
          { nodeId },
        ),
      );
    } else if (!NODE_TYPES.has(nodeType)) {
      issues.push(
        issue(
          'UNKNOWN_NODE_TYPE',
          `/nodes/${index}/type`,
          `Node '${nodeId}' has unknown type '${nodeType}'.`,
          'error',
          { nodeId },
        ),
      );
    }
    if (node.type === 'task' && node.assignee) {
      const { actor, role, discipline } = node.assignee;
      if (!actor?.trim() && !role?.trim() && !discipline?.trim()) {
        issues.push(
          issue(
            'INVALID_ASSIGNEE',
            `/nodes/${index}/assignee`,
            `Task '${node.id}' must assign at least one actor, role, or discipline.`,
            'error',
            { nodeId: node.id },
          ),
        );
      }
    }
  }

  // Duplicate ids.
  for (const node of graph.nodes) {
    const count = idCounts.get(node.id) ?? 0;
    const index = nodeIndexById.get(node.id) ?? 0;
    if (count > 1) {
      issues.push(
        issue(
          'DUPLICATE_NODE_ID',
          `/nodes/${index}/id`,
          `Node id '${node.id}' is used more than once.`,
          'error',
          { nodeId: node.id },
        ),
      );
    }
  }

  // Edge endpoints + duplicate edges.
  const edgeKeySeen = new Set<string>();
  for (const [index, edge] of graph.edges.entries()) {
    const key = `${edge.from}\u0000${edge.to}`;
    if (!edge.from || !edge.to) {
      issues.push(
        issue(
          'MISSING_EDGE_ENDPOINTS',
          `/edges/${index}`,
          'Edge endpoints are required.',
          'error',
          { edgeIndex: index },
        ),
      );
    } else {
      validateEdgeStructure(
        issues,
        graph,
        nodeById,
        edgeKeySeen,
        edge,
        index,
        key,
        context,
      );
    }
  }

  // Input codes.
  for (const input of graph.inputs ?? []) {
    if (!DATA_CODE_PATTERN.test(input)) {
      issues.push(
        issue(
          'INVALID_INPUT_CODE',
          '/inputs',
          `Input '${input}' must be lowercase letters, numbers, dots, hyphens, or underscores.`,
          'error',
        ),
      );
    }
  }

  // Entry / exit structure.
  const startNodes = graph.nodes.filter((node) => node.type === 'start');
  const endNodes = graph.nodes.filter((node) => node.type === 'end');
  const startId = startNodes[0]?.id ?? null;

  if (startNodes.length === 0) {
    issues.push(
      issue(
        'ENTRY_REQUIRED',
        '/nodes',
        'A workflow must include exactly one start node.',
        'warning',
      ),
    );
  }
  for (const extra of startNodes.slice(1)) {
    issues.push(
      issue(
        'ENTRY_UNIQUE',
        `/nodes/${nodeIndexById.get(extra.id) ?? 0}`,
        `The workflow has more than one start node ('${extra.id}').`,
        'warning',
        { nodeId: extra.id },
      ),
    );
  }
  if (endNodes.length === 0) {
    issues.push(
      issue(
        'EXIT_REQUIRED',
        '/nodes',
        'A workflow must include at least one end node.',
        'warning',
      ),
    );
  }

  // Per-node edge arity.
  const outgoingByNode = new Map<string, WorkflowEdge[]>();
  const incomingByNode = new Map<string, WorkflowEdge[]>();
  for (const node of graph.nodes) {
    outgoingByNode.set(node.id, []);
    incomingByNode.set(node.id, []);
  }
  for (const edge of graph.edges) {
    outgoingByNode.get(edge.from)?.push(edge);
    incomingByNode.get(edge.to)?.push(edge);
  }

  for (const node of graph.nodes) {
    const outgoing = outgoingByNode.get(node.id) ?? [];
    const incoming = incomingByNode.get(node.id) ?? [];
    const index = nodeIndexById.get(node.id) ?? 0;

    if (node.type === 'start') {
      if (incoming.length > 0) {
        issues.push(
          issue(
            'ENTRY_INCOMING_EDGE',
            `/nodes/${index}`,
            `Start node '${node.id}' must not have incoming edges.`,
            'warning',
            { nodeId: node.id },
          ),
        );
      }
      if (outgoing.length !== 1) {
        issues.push(
          issue(
            'ENTRY_SINGLE_OUTPUT',
            `/nodes/${index}`,
            `Start node '${node.id}' must have exactly one outgoing edge.`,
            'warning',
            { nodeId: node.id },
          ),
        );
      }
    }

    if (node.type === 'end' && outgoing.length > 0) {
      issues.push(
        issue(
          'EXIT_OUTGOING_EDGE',
          `/nodes/${index}`,
          `End node '${node.id}' must not have outgoing edges.`,
          'warning',
          { nodeId: node.id },
        ),
      );
    }

    if (node.type === 'task') {
      if (outgoing.length !== 1) {
        issues.push(
          issue(
            'TASK_SINGLE_OUTPUT',
            `/nodes/${index}`,
            `Task '${node.id}' must have exactly one outgoing edge.`,
            'warning',
            { nodeId: node.id },
          ),
        );
      } else if (outgoing[0]?.condition) {
        issues.push(
          issue(
            'TASK_UNCONDITIONAL_OUTPUT',
            `/edges/${graph.edges.indexOf(outgoing[0])}/condition`,
            `Task '${node.id}' must have an unconditional outgoing edge.`,
            'warning',
            { nodeId: node.id },
          ),
        );
      }
      if (context === 'published' && node.formCode && !node.formVersion) {
        issues.push(
          issue(
            'FORM_VERSION_REQUIRED',
            `/nodes/${index}/formVersion`,
            `Task '${node.id}' references form '${node.formCode}' without a pinned version.`,
            'error',
            { nodeId: node.id },
          ),
        );
      }
    }

    if (node.type === 'decision') {
      if (outgoing.length < 2) {
        issues.push(
          issue(
            'DECISION_OUTPUTS',
            `/nodes/${index}`,
            `Decision '${node.id}' must have at least two outgoing edges.`,
            'warning',
            { nodeId: node.id },
          ),
        );
      }
      const defaults = outgoing.filter((edge) => !edge.condition);
      if (defaults.length > 1) {
        issues.push(
          issue(
            'DECISION_DEFAULT_EDGE',
            `/nodes/${index}`,
            `Decision '${node.id}' may have at most one unconditional (default) edge.`,
            'warning',
            { nodeId: node.id },
          ),
        );
      }
    }
  }

  // Connectivity from the start node.
  if (startId) {
    const reachable = new Set<string>();
    const stack = [startId];
    while (stack.length > 0) {
      const id = stack.pop();
      if (id !== undefined && !reachable.has(id)) {
        reachable.add(id);
        for (const edge of outgoingByNode.get(id) ?? []) {
          stack.push(edge.to);
        }
      }
    }
    for (const node of graph.nodes) {
      if (!reachable.has(node.id)) {
        issues.push(
          issue(
            'UNREACHABLE_NODE',
            `/nodes/${nodeIndexById.get(node.id) ?? 0}`,
            `Node '${node.id}' is not reachable from the start node.`,
            'warning',
            { nodeId: node.id },
          ),
        );
      }
    }
  }

  // Acyclicity.
  const cycle = findCycleEdge(graph);
  if (cycle) {
    issues.push(
      issue(
        'CYCLE_DETECTED',
        `/edges/${cycle.index}`,
        `The workflow graph contains a cycle ('${cycle.from}' → '${cycle.to}').`,
        'warning',
        { nodeId: cycle.from, edgeIndex: cycle.index },
      ),
    );
  }

  return issues;
}

function validateEdgeStructure(
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

export function issuesForNode(
  issues: WorkflowValidationIssue[],
  nodeId: string,
): WorkflowValidationIssue[] {
  return issues.filter(
    (item) => item.nodeId === nodeId || item.path.includes(`/${nodeId}`),
  );
}

export function issuesForEdge(
  issues: WorkflowValidationIssue[],
  edgeIndex: number,
): WorkflowValidationIssue[] {
  return issues.filter((item) => item.edgeIndex === edgeIndex);
}

export function blockingIssues(
  issues: WorkflowValidationIssue[],
): WorkflowValidationIssue[] {
  return issues.filter((item) => item.severity === 'error');
}
