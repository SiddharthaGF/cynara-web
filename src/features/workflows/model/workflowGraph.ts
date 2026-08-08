import type {
  WorkflowEdge,
  WorkflowExpression,
  WorkflowGraph,
  WorkflowNode,
  WorkflowNodeType,
} from '@/features/workflows/types.ts';

export const WORKFLOW_SCHEMA_VERSION = '1.0.0';
export const WORKFLOW_SCHEMA_URI =
  'https://cynara.dev/schemas/v1/workflow-schema.schema.json';

export const NODE_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
export const DATA_CODE_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;

export function parseWorkflowGraph(
  json: string | null | undefined,
): WorkflowGraph {
  if (!json) {
    return createDefaultWorkflowGraph();
  }
  try {
    const parsed = JSON.parse(json) as Partial<WorkflowGraph>;
    if (!parsed || typeof parsed !== 'object') {
      return createDefaultWorkflowGraph();
    }
    return {
      $schema: parsed.$schema ?? WORKFLOW_SCHEMA_URI,
      schemaVersion: parsed.schemaVersion ?? WORKFLOW_SCHEMA_VERSION,
      inputs: Array.isArray(parsed.inputs)
        ? parsed.inputs.filter(
            (item): item is string => typeof item === 'string',
          )
        : [],
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
    };
  } catch {
    return createDefaultWorkflowGraph();
  }
}

export function serializeWorkflowGraph(graph: WorkflowGraph): string {
  return JSON.stringify(graph);
}

/** Fresh draft graph: a unique entry point and a single exit state. */
export function createDefaultWorkflowGraph(): WorkflowGraph {
  return {
    $schema: WORKFLOW_SCHEMA_URI,
    schemaVersion: WORKFLOW_SCHEMA_VERSION,
    inputs: [],
    nodes: [
      { id: 'start', type: 'start', name: 'Start' },
      { id: 'end', type: 'end', name: 'End' },
    ],
    edges: [],
  };
}

let generatedIdCounter = 0;

const TYPE_SLUGS: Record<WorkflowNodeType, string> = {
  start: 'start',
  end: 'end',
  decision: 'decision',
  task: 'task',
};

/** Next unique kebab-case node id for the given type within the graph. */
export function nextNodeId(
  graph: WorkflowGraph,
  type: WorkflowNodeType,
): string {
  const base = TYPE_SLUGS[type];
  const used = new Set(graph.nodes.map((node) => node.id));
  for (let attempt = 0; attempt < 10_000; attempt += 1) {
    generatedIdCounter += 1;
    const candidate = `${base}-${generatedIdCounter}`;
    if (!used.has(candidate)) {
      return candidate;
    }
  }
  // Unreachable in practice; deterministic fallback keeps ids unique.
  const suffix = Date.now().toString(36);
  return `${base}-${suffix}`;
}

const NODE_FACTORIES: Record<WorkflowNodeType, (id: string) => WorkflowNode> = {
  start: (id) => ({ id, type: 'start' }),
  end: (id) => ({ id, type: 'end' }),
  decision: (id) => ({ id, type: 'decision' }),
  task: (id) => ({ id, type: 'task' }),
};

export function createNode(type: WorkflowNodeType, id: string): WorkflowNode {
  return NODE_FACTORIES[type](id);
}

/**
 * Kebab-case slug for a node name, e.g. "Valoración del dolor" →
 * "valoracion-del-dolor". Accents are stripped so non-ASCII names stay valid
 * against `NODE_ID_PATTERN`.
 */
export function slugifyNodeName(name: string): string {
  return name
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/-{2,}/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, 48)
    .replaceAll(/-+$/g, '');
}

/**
 * Resolves the id a node should take once it is given `name`, or `null` when
 * the name does not warrant a rename (empty, unchanged, or a structural node).
 * Task and decision ids are derived from their name so ids stay readable; the
 * start and end anchors keep their structural ids.
 */
export function nodeIdFromName(
  graph: WorkflowGraph,
  nodeId: string,
  name: string,
): string | null {
  const node = graph.nodes.find((item) => item.id === nodeId);
  if (!node || (node.type !== 'task' && node.type !== 'decision')) {
    return null;
  }
  let slug = slugifyNodeName(name);
  if (!slug) {
    return null;
  }
  // NODE_ID_PATTERN requires a leading lowercase letter. Names that begin
  // With a digit or punctuation get the node type as a readable prefix.
  if (!/^[a-z]/.test(slug)) {
    slug = `${TYPE_SLUGS[node.type]}-${slug}`;
  }
  if (slug === nodeId) {
    return null;
  }
  const used = new Set(graph.nodes.map((item) => item.id));
  let candidate = slug;
  for (let counter = 1; used.has(candidate); counter += 1) {
    candidate = `${slug}-${counter}`;
  }
  return candidate;
}

/**
 * Re-ids a node and rewires every edge that referenced the old id. The rest of
 * the graph (other nodes, conditions, labels) is untouched.
 */
export function renameNode(
  graph: WorkflowGraph,
  nodeId: string,
  nextId: string,
): WorkflowGraph {
  if (nodeId === nextId) {
    return graph;
  }
  return {
    ...graph,
    nodes: graph.nodes.map((node) =>
      node.id === nodeId ? { ...node, id: nextId } : node,
    ),
    edges: graph.edges.map((edge) =>
      edge.from === nodeId || edge.to === nodeId
        ? {
            ...edge,
            from: edge.from === nodeId ? nextId : edge.from,
            to: edge.to === nodeId ? nextId : edge.to,
          }
        : edge,
    ),
  };
}

export function outgoingEdges(
  graph: WorkflowGraph,
  nodeId: string,
): WorkflowEdge[] {
  return graph.edges.filter((edge) => edge.from === nodeId);
}

export function incomingEdges(
  graph: WorkflowGraph,
  nodeId: string,
): WorkflowEdge[] {
  return graph.edges.filter((edge) => edge.to === nodeId);
}

export function edgeKey(from: string, to: string): string {
  return `${from}\u0000${to}`;
}

export function edgeIndex(
  graph: WorkflowGraph,
  from: string,
  to: string,
): number {
  return graph.edges.findIndex((edge) => edge.from === from && edge.to === to);
}

/**
 * Adds a node to the graph. When `afterNodeId` is given and the source node
 * can have an outgoing edge, the new node is connected with an edge. A
 * decision keeps exactly one default (unconditional) branch: if it already has
 * one, the new branch is created conditional, waiting for its condition.
 */
export function addNode(
  graph: WorkflowGraph,
  type: WorkflowNodeType,
  afterNodeId?: string | null,
): { graph: WorkflowGraph; node: WorkflowNode } {
  const id = nextNodeId(graph, type);
  const node = createNode(type, id);
  const nodes = [...graph.nodes, node];
  const source = afterNodeId ? typeOfNodeAt(graph, afterNodeId) : undefined;
  const edges =
    afterNodeId && source && canHaveOutgoingEdge(source)
      ? [...graph.edges, connectionEdge(graph, source, afterNodeId, id)]
      : graph.edges;
  return { graph: { ...graph, nodes, edges }, node };
}

/**
 * Edge created by `addNode`. For a decision source that already has an
 * unconditional (default) branch, the new branch is conditional with an empty
 * comparison the user completes in the inspector, so the graph never ends up
 * with more than one default branch.
 */
function connectionEdge(
  graph: WorkflowGraph,
  source: WorkflowNode,
  from: string,
  to: string,
): WorkflowEdge {
  const hasDefaultBranch = outgoingEdges(graph, source.id).some(
    (edge) => edge.condition === undefined,
  );
  if (source.type === 'decision' && hasDefaultBranch) {
    return {
      from,
      to,
      condition: { op: 'eq', args: [{ ref: '' }, { lit: '' }] },
    };
  }
  return { from, to };
}

export function updateNode(
  graph: WorkflowGraph,
  nodeId: string,
  patch: Partial<WorkflowNode>,
): WorkflowGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) =>
      node.id === nodeId ? { ...node, ...patch } : node,
    ),
  };
}

export function changeNodeType(
  graph: WorkflowGraph,
  nodeId: string,
  type: WorkflowNodeType,
): WorkflowGraph {
  const node = graph.nodes.find((item) => item.id === nodeId);
  if (!node || node.type === type) {
    return graph;
  }
  const next: WorkflowNode = { ...node, type };
  // Transition conditions only make sense on decision outputs. Strip them
  // When the source stops being a decision, keeping the graph free of
  // Orphaned conditions.
  const edges =
    type === 'decision'
      ? graph.edges
      : graph.edges.map((edge) =>
          edge.from === nodeId && edge.condition
            ? { from: edge.from, to: edge.to, label: edge.label }
            : edge,
        );
  return { ...graph, nodes: replaceNode(graph, next), edges };
}

export function removeNode(
  graph: WorkflowGraph,
  nodeId: string,
): WorkflowGraph {
  return {
    ...graph,
    nodes: graph.nodes.filter((node) => node.id !== nodeId),
    edges: graph.edges.filter(
      (edge) => edge.from !== nodeId && edge.to !== nodeId,
    ),
  };
}

export function addEdge(
  graph: WorkflowGraph,
  from: string,
  to: string,
  label?: string,
  condition?: WorkflowExpression,
): WorkflowGraph {
  if (edgeIndex(graph, from, to) !== -1) {
    return graph;
  }
  return {
    ...graph,
    edges: [
      ...graph.edges,
      {
        from,
        to,
        ...(label ? { label } : {}),
        ...(condition ? { condition } : {}),
      },
    ],
  };
}

export function removeEdgeByKey(
  graph: WorkflowGraph,
  key: string,
): WorkflowGraph {
  const [from, to] = key.split('\u0000');
  return {
    ...graph,
    edges: graph.edges.filter(
      (edge) => !(edge.from === from && edge.to === to),
    ),
  };
}

/**
 * Splits the edge `from → to` by inserting a new node in the middle. The
 * original transition's branch metadata (condition and label) moves to the new
 * `from → node` edge, so decision branch semantics are preserved. Returns
 * `null` when the edge does not exist.
 */
export function insertNodeBetween(
  graph: WorkflowGraph,
  type: WorkflowNodeType,
  from: string,
  to: string,
): { graph: WorkflowGraph; node: WorkflowNode } | null {
  const index = edgeIndex(graph, from, to);
  if (index === -1) {
    return null;
  }
  const original = graph.edges[index];
  const id = nextNodeId(graph, type);
  const node = createNode(type, id);
  const incoming: WorkflowEdge = {
    from,
    to: id,
    ...(original.label ? { label: original.label } : {}),
    ...(original.condition ? { condition: original.condition } : {}),
  };
  const edges = [
    ...graph.edges.slice(0, index),
    incoming,
    { from: id, to },
    ...graph.edges.slice(index + 1),
  ];
  return { graph: { ...graph, nodes: [...graph.nodes, node], edges }, node };
}

/**
 * Copies a node with a fresh id and rewires every edge touching the original
 * (incoming and outgoing) to the copy, preserving branch labels and conditions.
 * A named copy keeps a readable id derived from its name. Returns `null` when
 * the node does not exist.
 */
export function duplicateNode(
  graph: WorkflowGraph,
  nodeId: string,
): { graph: WorkflowGraph; node: WorkflowNode } | null {
  const source = graph.nodes.find((node) => node.id === nodeId);
  if (!source) {
    return null;
  }
  const id = duplicateNodeId(graph, source);
  const node: WorkflowNode = { ...source, id };
  const incoming: WorkflowEdge[] = [];
  const outgoing: WorkflowEdge[] = [];
  for (const edge of graph.edges) {
    if (edge.to === nodeId) {
      incoming.push({ ...edge, to: id });
    }
    if (edge.from === nodeId) {
      outgoing.push({ ...edge, from: id });
    }
  }
  return {
    graph: {
      ...graph,
      nodes: [...graph.nodes, node],
      edges: [...graph.edges, ...incoming, ...outgoing],
    },
    node,
  };
}

export function updateEdge(
  graph: WorkflowGraph,
  index: number,
  patch: Partial<Pick<WorkflowEdge, 'label' | 'condition'>>,
): WorkflowGraph {
  return {
    ...graph,
    edges: graph.edges.map((edge, i) =>
      i === index ? { ...edge, ...patch } : edge,
    ),
  };
}

export function updateEdgeCondition(
  graph: WorkflowGraph,
  index: number,
  condition: WorkflowExpression | undefined,
): WorkflowGraph {
  return {
    ...graph,
    edges: graph.edges.map((edge, i) =>
      i === index
        ? { ...edge, ...(condition ? { condition } : { label: edge.label }) }
        : edge,
    ),
  };
}

export function updateInputs(
  graph: WorkflowGraph,
  inputs: string[],
): WorkflowGraph {
  return { ...graph, inputs };
}

export function canHaveOutgoingEdge(node: WorkflowNode | undefined): boolean {
  return node !== undefined && node.type !== 'end';
}

/**
 * Id for a duplicated node: the name slug when the source is named, otherwise
 * the usual generic id. Disambiguates against the whole graph (including the
 * source, so a second copy of the same name becomes `name-2`).
 */
function duplicateNodeId(graph: WorkflowGraph, source: WorkflowNode): string {
  if (source.type === 'task' || source.type === 'decision') {
    let slug = slugifyNodeName(source.name ?? '');
    if (slug) {
      if (!/^[a-z]/.test(slug)) {
        slug = `${TYPE_SLUGS[source.type]}-${slug}`;
      }
      const used = new Set(graph.nodes.map((node) => node.id));
      if (!used.has(slug)) {
        return slug;
      }
      for (let counter = 1; counter < 10_000; counter += 1) {
        const candidate = `${slug}-${counter}`;
        if (!used.has(candidate)) {
          return candidate;
        }
      }
    }
  }
  return nextNodeId(graph, source.type);
}

function typeOfNodeAt(
  graph: WorkflowGraph,
  nodeId: string,
): WorkflowNode | undefined {
  return graph.nodes.find((node) => node.id === nodeId);
}

function replaceNode(graph: WorkflowGraph, next: WorkflowNode): WorkflowNode[] {
  return graph.nodes.map((node) => (node.id === next.id ? next : node));
}
