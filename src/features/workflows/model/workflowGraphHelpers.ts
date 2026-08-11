import type {
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
 * Id for a duplicated node: the name slug when the source is named, otherwise
 * the usual generic id. Disambiguates against the whole graph (including the
 * source, so a second copy of the same name becomes `name-2`).
 */
export function duplicateNodeId(
  graph: WorkflowGraph,
  source: WorkflowNode,
): string {
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
