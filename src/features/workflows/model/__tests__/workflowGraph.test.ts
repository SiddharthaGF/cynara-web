import { describe, expect, it } from 'vitest';

import {
  addNode,
  duplicateNode,
  insertNodeBetween,
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
