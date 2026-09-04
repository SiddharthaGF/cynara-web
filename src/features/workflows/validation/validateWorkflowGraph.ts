import {
  DATA_CODE_PATTERN,
  NODE_ID_PATTERN,
} from '@/features/workflows/model/workflowGraph.ts';
import type {
  WorkflowEdge,
  WorkflowGraph,
  WorkflowNode,
  WorkflowValidationIssue,
} from '@/features/workflows/types.ts';
import {
  findCycleEdge,
  issue,
  validateEdgeStructure,
} from '@/features/workflows/validation/workflowValidationHelpers.ts';

export interface ValidateWorkflowGraphOptions {
  /** `published` adds publish-time rules such as pinned form versions. */
  context?: 'draft' | 'published';
}

const NODE_TYPES = new Set(['start', 'end', 'task', 'decision']);

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

export function blockingIssues(
  issues: WorkflowValidationIssue[],
): WorkflowValidationIssue[] {
  return issues.filter((item) => item.severity === 'error');
}
