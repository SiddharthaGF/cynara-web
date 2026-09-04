import { describe, expect, it } from 'vitest';

import { computeDagreLayout } from '@/features/workflows/designer/flow/autoLayout.ts';
import type { WorkflowGraph } from '@/features/workflows/types.ts';

function graph(
  nodes: WorkflowGraph['nodes'],
  edges: WorkflowGraph['edges'],
): WorkflowGraph {
  return { schemaVersion: '1.0.0', nodes, edges };
}

function branchingGraph(): WorkflowGraph {
  return graph(
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
  );
}

function requirePosition(
  positions: ReadonlyMap<string, { x: number; y: number }>,
  id: string,
): { x: number; y: number } {
  const position = positions.get(id);
  if (position === undefined) {
    throw new Error(`missing layout position for node "${id}"`);
  }
  return position;
}

describe('computeDagreLayout', () => {
  it('gives every node a finite top-left anchored position', () => {
    const positions = computeDagreLayout(branchingGraph(), new Map());

    expect(positions.size).toBe(5);
    for (const [id, position] of positions) {
      expect(id).toBeTruthy();
      expect(Number.isFinite(position.x)).toBeTruthy();
      expect(Number.isFinite(position.y)).toBeTruthy();
    }
  });

  it('places decision branches side by side in the same rank', () => {
    const positions = computeDagreLayout(branchingGraph(), new Map());
    const taskA = requirePosition(positions, 'task-a');
    const taskB = requirePosition(positions, 'task-b');

    expect(taskA.y).toBe(taskB.y);
    expect(taskA.x).not.toBe(taskB.x);
  });

  it('orders decision branches left to right in edge order', () => {
    const positions = computeDagreLayout(
      graph(
        [
          { id: 'start', type: 'start' },
          { id: 'decision', type: 'decision' },
          { id: 'task-1', type: 'task' },
          { id: 'task-2', type: 'task' },
          { id: 'task-3', type: 'task' },
          { id: 'task-4', type: 'task' },
          { id: 'end', type: 'end' },
        ],
        [
          { from: 'start', to: 'decision' },
          { from: 'decision', to: 'task-1' },
          { from: 'decision', to: 'task-2' },
          { from: 'decision', to: 'task-3' },
          { from: 'decision', to: 'task-4' },
          { from: 'task-1', to: 'end' },
          { from: 'task-2', to: 'end' },
          { from: 'task-3', to: 'end' },
          { from: 'task-4', to: 'end' },
        ],
      ),
      new Map(),
    );

    const xs = ['task-1', 'task-2', 'task-3', 'task-4'].map(
      (id) => requirePosition(positions, id).x,
    );
    for (let i = 1; i < xs.length; i += 1) {
      expect(xs[i]).toBeGreaterThan(xs[i - 1]);
    }
  });

  it('keeps a deeper branch in its own column under the first branch', () => {
    const positions = computeDagreLayout(
      graph(
        [
          { id: 'start', type: 'start' },
          { id: 'decision', type: 'decision' },
          { id: 'a', type: 'task' },
          { id: 'b', type: 'task' },
          { id: 'c', type: 'task' },
          { id: 'c1', type: 'task' },
          { id: 'end', type: 'end' },
        ],
        [
          { from: 'start', to: 'decision' },
          { from: 'decision', to: 'a' },
          { from: 'decision', to: 'b' },
          { from: 'decision', to: 'c' },
          { from: 'a', to: 'end' },
          { from: 'b', to: 'end' },
          { from: 'c', to: 'c1' },
          { from: 'c1', to: 'end' },
        ],
      ),
      new Map(),
    );

    const a = requirePosition(positions, 'a');
    const b = requirePosition(positions, 'b');
    const c = requirePosition(positions, 'c');
    const c1 = requirePosition(positions, 'c1');
    expect(a.x).toBeLessThan(b.x);
    expect(b.x).toBeLessThan(c.x);
    expect(c1.x).toBe(c.x);
  });

  it('centers a converging node between its branches', () => {
    const positions = computeDagreLayout(branchingGraph(), new Map());
    const taskA = requirePosition(positions, 'task-a');
    const taskB = requirePosition(positions, 'task-b');
    const end = requirePosition(positions, 'end');

    const lower = Math.min(taskA.x, taskB.x);
    const upper = Math.max(taskA.x, taskB.x);
    expect(end.x).toBeGreaterThan(lower);
    expect(end.x).toBeLessThan(upper);
  });

  it('stacks a linear chain in a single column', () => {
    const positions = computeDagreLayout(
      graph(
        [
          { id: 'start', type: 'start' },
          { id: 't1', type: 'task' },
          { id: 't2', type: 'task' },
          { id: 'end', type: 'end' },
        ],
        [
          { from: 'start', to: 't1' },
          { from: 't1', to: 't2' },
          { from: 't2', to: 'end' },
        ],
      ),
      new Map(),
    );

    const xs = new Set(
      ['start', 't1', 't2', 'end'].map(
        (id) => requirePosition(positions, id).x,
      ),
    );
    expect(xs.size).toBe(1);
    expect(requirePosition(positions, 't2').y).toBeGreaterThan(
      requirePosition(positions, 't1').y,
    );
  });

  it('keeps disconnected nodes apart instead of stacking them', () => {
    const positions = computeDagreLayout(
      graph(
        [
          { id: 'start', type: 'start' },
          { id: 'orphan-a', type: 'task' },
          { id: 'orphan-b', type: 'task' },
        ],
        [],
      ),
      new Map(),
    );

    const orphanA = requirePosition(positions, 'orphan-a');
    const orphanB = requirePosition(positions, 'orphan-b');
    const distance =
      Math.abs(orphanA.x - orphanB.x) + Math.abs(orphanA.y - orphanB.y);
    expect(distance).toBeGreaterThan(0);
  });

  it('uses measured sizes when provided for more generous spacing', () => {
    const positions = computeDagreLayout(
      branchingGraph(),
      new Map([
        ['start', { width: 232, height: 80 }],
        ['decision', { width: 232, height: 160 }],
        ['task-a', { width: 232, height: 120 }],
        ['task-b', { width: 232, height: 120 }],
        ['end', { width: 232, height: 80 }],
      ]),
    );

    const decision = requirePosition(positions, 'decision');
    const taskA = requirePosition(positions, 'task-a');
    expect(taskA.y).toBeGreaterThan(decision.y + 160);
  });

  it('keeps decision branches on one rank even when depths differ', () => {
    const positions = computeDagreLayout(
      graph(
        [
          { id: 'start', type: 'start' },
          { id: 'decision', type: 'decision' },
          { id: 'a', type: 'task' },
          { id: 'b', type: 'task' },
          { id: 'c', type: 'task' },
          { id: 'c1', type: 'task' },
          { id: 'c2', type: 'task' },
          { id: 'end', type: 'end' },
        ],
        [
          { from: 'start', to: 'decision' },
          { from: 'decision', to: 'a' },
          { from: 'decision', to: 'b' },
          { from: 'decision', to: 'c' },
          { from: 'a', to: 'end' },
          { from: 'b', to: 'end' },
          { from: 'c', to: 'c1' },
          { from: 'c1', to: 'c2' },
          { from: 'c2', to: 'end' },
        ],
      ),
      new Map(),
    );

    // A deeper branch must not pull its siblings down; all children stay on the row below the decision.
    const decisionY = requirePosition(positions, 'decision').y;
    const a = requirePosition(positions, 'a');
    const b = requirePosition(positions, 'b');
    const c = requirePosition(positions, 'c');
    expect(a.y).toBe(b.y);
    expect(b.y).toBe(c.y);
    expect(a.y).toBeGreaterThan(decisionY);
    expect(requirePosition(positions, 'c1').y).toBeGreaterThan(c.y);
    expect(requirePosition(positions, 'end').y).toBeGreaterThan(
      requirePosition(positions, 'c2').y,
    );
  });
});
