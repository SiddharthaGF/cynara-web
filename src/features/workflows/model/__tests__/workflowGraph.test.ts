import { describe, expect, it } from 'vitest';

import {
  addNode,
  duplicateNode,
  insertNodeBetween,
  nodeIdFromName,
  renameNode,
  slugifyNodeName,
} from '@/features/workflows/model/workflowGraph.ts';
import type {
  WorkflowEdge,
  WorkflowExpression,
  WorkflowGraph,
  WorkflowNode,
} from '@/features/workflows/types.ts';

function graph(
  nodes: WorkflowGraph['nodes'],
  edges: WorkflowGraph['edges'],
): WorkflowGraph {
  return { schemaVersion: '1.0.0', nodes, edges };
}

interface InsertResult {
  graph: WorkflowGraph;
  node: WorkflowNode;
}

function requireResult(result: InsertResult | null): InsertResult {
  if (result === null) {
    throw new Error('expected insertNodeBetween to return a result');
  }
  return result;
}

function requireEdge(
  source: WorkflowGraph,
  from: string,
  to: string,
): WorkflowEdge {
  const edge = source.edges.find(
    (item) => item.from === from && item.to === to,
  );
  if (edge === undefined) {
    throw new Error(`expected edge ${from} → ${to}`);
  }
  return edge;
}

function requireTaskNode(
  node: WorkflowNode,
): Extract<WorkflowNode, { type: 'task' }> {
  if (node.type !== 'task') {
    throw new Error(`expected a task node, got ${node.type}`);
  }
  return node;
}

describe('addNode', () => {
  it('connects a branch after a decision with a default edge when none exists', () => {
    const result = addNode(
      graph([{ id: 'decision', type: 'decision' }], []),
      'task',
      'decision',
    );

    const edge = requireEdge(result.graph, 'decision', result.node.id);
    expect(edge.condition).toBeUndefined();
  });

  it('makes a new branch conditional once the decision already has a default', () => {
    const result = addNode(
      graph(
        [
          { id: 'decision', type: 'decision' },
          { id: 'task-a', type: 'task' },
        ],
        [{ from: 'decision', to: 'task-a' }],
      ),
      'task',
      'decision',
    );

    const branchA = requireEdge(result.graph, 'decision', 'task-a');
    expect(branchA.condition).toBeUndefined();
    const newEdge = requireEdge(result.graph, 'decision', result.node.id);
    expect(newEdge.condition).toBeDefined();
  });

  it('keeps the connecting edge unconditional for non-decision sources', () => {
    const result = addNode(
      graph([{ id: 'task-a', type: 'task' }], []),
      'task',
      'task-a',
    );

    const edge = requireEdge(result.graph, 'task-a', result.node.id);
    expect(edge.condition).toBeUndefined();
  });
});

describe('insertNodeBetween', () => {
  it('splits an edge with the new node in the middle', () => {
    const result = requireResult(
      insertNodeBetween(
        graph(
          [
            { id: 'decision', type: 'decision' },
            { id: 'task-a', type: 'task' },
          ],
          [{ from: 'decision', to: 'task-a' }],
        ),
        'task',
        'decision',
        'task-a',
      ),
    );

    const incoming = requireEdge(result.graph, 'decision', result.node.id);
    const outgoing = requireEdge(result.graph, result.node.id, 'task-a');
    expect(incoming.from).toBe('decision');
    expect(incoming.to).toBe(result.node.id);
    expect(outgoing.from).toBe(result.node.id);
    expect(outgoing.to).toBe('task-a');
    expect(result.graph.edges).toHaveLength(2);
  });

  it('preserves a decision branch condition on the incoming edge', () => {
    const condition: WorkflowExpression = {
      op: 'eq',
      args: [{ ref: 'risk' }, { lit: 'high' }],
    };
    const result = requireResult(
      insertNodeBetween(
        graph(
          [
            { id: 'decision', type: 'decision' },
            { id: 'task-a', type: 'task' },
          ],
          [{ from: 'decision', to: 'task-a', label: 'High risk', condition }],
        ),
        'task',
        'decision',
        'task-a',
      ),
    );

    const incoming = requireEdge(result.graph, 'decision', result.node.id);
    const outgoing = requireEdge(result.graph, result.node.id, 'task-a');
    expect(incoming.condition).toStrictEqual(condition);
    expect(incoming.label).toBe('High risk');
    expect(outgoing.condition).toBeUndefined();
    expect(outgoing.label).toBeUndefined();
  });

  it('keeps unrelated edges and nodes untouched', () => {
    const result = requireResult(
      insertNodeBetween(
        graph(
          [
            { id: 'start', type: 'start' },
            { id: 'decision', type: 'decision' },
            { id: 'task-a', type: 'task' },
            { id: 'task-b', type: 'task' },
            { id: 'end', type: 'end' },
          ],
          [
            { from: 'start', to: 'decision' },
            { from: 'decision', to: 'task-a' },
            { from: 'decision', to: 'task-b' },
            { from: 'task-a', to: 'end' },
            { from: 'task-b', to: 'end' },
          ],
        ),
        'task',
        'task-b',
        'end',
      ),
    );

    expect(result.graph.edges).toHaveLength(6);
    expect(result.graph.nodes.map((node) => node.id)).toContain(result.node.id);
    expect(requireEdge(result.graph, 'decision', 'task-b').to).toBe('task-b');
    expect(requireEdge(result.graph, 'task-a', 'end').to).toBe('end');
  });

  it('returns null when the edge does not exist', () => {
    const result = insertNodeBetween(
      graph(
        [
          { id: 'task-a', type: 'task' },
          { id: 'task-b', type: 'task' },
        ],
        [],
      ),
      'task',
      'task-a',
      'task-b',
    );

    expect(result).toBeNull();
  });
});

describe('duplicateNode', () => {
  it('copies the node with a fresh id and same data', () => {
    const result = requireResult(
      duplicateNode(
        graph(
          [
            { id: 'start', type: 'start' },
            { id: 'task-a', type: 'task', name: 'Review', formCode: 'rev' },
            { id: 'end', type: 'end' },
          ],
          [
            { from: 'start', to: 'task-a' },
            { from: 'task-a', to: 'end' },
          ],
        ),
        'task-a',
      ),
    );

    expect(result.node.id).not.toBe('task-a');
    const copy = requireTaskNode(result.node);
    expect(copy.name).toBe('Review');
    expect(copy.formCode).toBe('rev');
    expect(copy.type).toBe('task');
  });

  it('derives a readable id from a named source and disambiguates duplicates', () => {
    const source = graph(
      [
        { id: 'start', type: 'start' },
        {
          id: 'triage-assessment',
          type: 'task',
          name: 'Triage assessment',
        },
        { id: 'end', type: 'end' },
      ],
      [],
    );

    const first = requireResult(duplicateNode(source, 'triage-assessment'));
    expect(first.node.id).toBe('triage-assessment-1');

    const second = requireResult(
      duplicateNode({ ...first.graph }, 'triage-assessment'),
    );
    expect(second.node.id).toBe('triage-assessment-2');
  });

  it('rewires incoming and outgoing edges to the copy', () => {
    const result = requireResult(
      duplicateNode(
        graph(
          [
            { id: 'start', type: 'start' },
            { id: 'task-a', type: 'task' },
            { id: 'end', type: 'end' },
          ],
          [
            { from: 'start', to: 'task-a' },
            { from: 'task-a', to: 'end' },
          ],
        ),
        'task-a',
      ),
    );

    const incoming = requireEdge(result.graph, 'start', result.node.id);
    const outgoing = requireEdge(result.graph, result.node.id, 'end');
    expect(incoming.to).toBe(result.node.id);
    expect(outgoing.from).toBe(result.node.id);
    expect(result.graph.nodes).toHaveLength(4);
    expect(result.graph.edges).toHaveLength(4);
  });

  it('preserves decision branch metadata on duplicated edges', () => {
    const condition: WorkflowExpression = {
      op: 'eq',
      args: [{ ref: 'risk' }, { lit: 'high' }],
    };
    const result = requireResult(
      duplicateNode(
        graph(
          [
            { id: 'start', type: 'start' },
            { id: 'decision', type: 'decision' },
            { id: 'task-a', type: 'task' },
          ],
          [
            { from: 'start', to: 'decision' },
            { from: 'decision', to: 'task-a', label: 'High risk', condition },
          ],
        ),
        'decision',
      ),
    );

    const branch = requireEdge(result.graph, result.node.id, 'task-a');
    expect(branch.condition).toStrictEqual(condition);
    expect(branch.label).toBe('High risk');
  });

  it('returns null when the node does not exist', () => {
    const result = duplicateNode(
      graph(
        [
          { id: 'task-a', type: 'task' },
          { id: 'end', type: 'end' },
        ],
        [{ from: 'task-a', to: 'end' }],
      ),
      'missing',
    );

    expect(result).toBeNull();
  });
});

describe('slugifyNodeName', () => {
  it('slugs a human name into kebab-case', () => {
    expect(slugifyNodeName('Valoración del dolor')).toBe(
      'valoracion-del-dolor',
    );
  });

  it('strips diacritics, punctuation and repeated separators', () => {
    expect(slugifyNodeName('Pain assessment — step 1!')).toBe(
      'pain-assessment-step-1',
    );
  });

  it('returns an empty string for names with no usable characters', () => {
    expect(slugifyNodeName('***')).toBe('');
    expect(slugifyNodeName('')).toBe('');
  });
});

describe('nodeIdFromName', () => {
  const source = graph(
    [
      { id: 'start', type: 'start' },
      { id: 'task-1', type: 'task' },
      { id: 'end', type: 'end' },
    ],
    [],
  );

  it('derives a readable id from the name for tasks and decisions', () => {
    expect(nodeIdFromName(source, 'task-1', 'Triage assessment')).toBe(
      'triage-assessment',
    );
    const decision = graph([{ id: 'decision-1', type: 'decision' }], []);
    expect(nodeIdFromName(decision, 'decision-1', '¿Riesgo alto?')).toBe(
      'riesgo-alto',
    );
  });

  it('returns null for structural nodes and empty names', () => {
    expect(nodeIdFromName(source, 'start', 'Renamed start')).toBeNull();
    expect(nodeIdFromName(source, 'end', 'Renamed end')).toBeNull();
    expect(nodeIdFromName(source, 'task-1', '')).toBeNull();
  });

  it('returns null when the id would not change', () => {
    const named = graph(
      [{ id: 'triage-assessment', type: 'task', name: 'Triage assessment' }],
      [],
    );
    expect(
      nodeIdFromName(named, 'triage-assessment', 'Triage assessment'),
    ).toBeNull();
  });

  it('prefixes the node type when the name starts with a digit', () => {
    expect(nodeIdFromName(source, 'task-1', '2 fast')).toBe('task-2-fast');
  });

  it('disambiguates against existing ids deterministically', () => {
    const busy = graph(
      [
        { id: 'triage', type: 'task' },
        { id: 'triage-2', type: 'task' },
      ],
      [],
    );
    expect(nodeIdFromName(busy, 'triage-2', 'Triage')).toBe('triage-1');
  });
});

describe('renameNode', () => {
  const source = graph(
    [
      { id: 'start', type: 'start' },
      { id: 'task-1', type: 'task' },
      { id: 'task-2', type: 'task' },
      { id: 'end', type: 'end' },
    ],
    [
      { from: 'start', to: 'task-1' },
      { from: 'task-1', to: 'task-2' },
      { from: 'task-1', to: 'end' },
      { from: 'task-2', to: 'end' },
    ],
  );

  it('re-ids the node and rewires every edge touching it', () => {
    const result = renameNode(source, 'task-1', 'triage');
    expect(result.nodes.find((node) => node.id === 'triage')).toBeDefined();
    expect(result.nodes.some((node) => node.id === 'task-1')).toBeFalsy();
    expect(requireEdge(result, 'start', 'triage').to).toBe('triage');
    expect(requireEdge(result, 'triage', 'task-2').from).toBe('triage');
    expect(requireEdge(result, 'triage', 'end').from).toBe('triage');
  });

  it('leaves edges not touching the renamed node intact', () => {
    const result = renameNode(source, 'task-1', 'triage');
    expect(requireEdge(result, 'task-2', 'end').to).toBe('end');
  });

  it('returns the same graph when ids match', () => {
    expect(renameNode(source, 'task-1', 'task-1')).toBe(source);
  });
});
