import { describe, expect, it } from 'vitest';

import { simulateWorkflow } from '@/features/workflows/simulation/simulateWorkflow.ts';
import type { WorkflowGraph } from '@/features/workflows/types.ts';

function graph(overrides: Partial<WorkflowGraph>): WorkflowGraph {
  return {
    schemaVersion: '1.0.0',
    inputs: [],
    nodes: [
      { id: 'start', type: 'start', name: 'Start' },
      { id: 'end', type: 'end', name: 'End' },
    ],
    edges: [{ from: 'start', to: 'end' }],
    ...overrides,
  };
}

describe('simulateWorkflow', () => {
  it('completes a straight start → end path', () => {
    const result = simulateWorkflow(graph({}), {});

    expect(result.status).toBe('completed');
    expect(result.blockReason).toBeNull();
    expect(result.endedAtNodeId).toBe('end');
    expect(result.visitedNodeIds).toStrictEqual(['start', 'end']);
    expect(result.takenEdgeKeys).toStrictEqual(['start\u0000end']);
  });

  it('records assignees and referenced forms on task steps', () => {
    const result = simulateWorkflow(
      graph({
        nodes: [
          { id: 'start', type: 'start' },
          {
            id: 'assess',
            type: 'task',
            name: 'Initial assessment',
            assignee: { role: 'nutritionist' },
            formCode: 'nutri-assessment',
          },
          { id: 'end', type: 'end' },
        ],
        edges: [
          { from: 'start', to: 'assess' },
          { from: 'assess', to: 'end' },
        ],
      }),
      {},
    );

    expect(result.status).toBe('completed');
    const task = result.steps.find((step) => step.node.id === 'assess');
    expect(task?.assignee).toStrictEqual({ role: 'nutritionist' });
  });

  it('takes the first passing conditional branch of a decision', () => {
    const result = simulateWorkflow(
      graph({
        inputs: ['age'],
        nodes: [
          { id: 'start', type: 'start' },
          { id: 'decision', type: 'decision', name: 'Adult?' },
          { id: 'adult', type: 'task', name: 'Adult path' },
          { id: 'minor', type: 'task', name: 'Minor path' },
          { id: 'end', type: 'end' },
        ],
        edges: [
          { from: 'start', to: 'decision' },
          {
            from: 'decision',
            to: 'adult',
            condition: { op: 'gte', args: [{ ref: 'age' }, { lit: 18 }] },
          },
          {
            from: 'decision',
            to: 'minor',
            condition: { op: 'lt', args: [{ ref: 'age' }, { lit: 18 }] },
          },
          { from: 'adult', to: 'end' },
          { from: 'minor', to: 'end' },
        ],
      }),
      { age: 25 },
    );

    expect(result.status).toBe('completed');
    expect(result.visitedNodeIds).toStrictEqual([
      'start',
      'decision',
      'adult',
      'end',
    ]);

    const decision = result.steps.find((step) => step.node.id === 'decision');
    expect(decision?.branchEvaluations).toHaveLength(2);
    const adultBranch = decision?.branchEvaluations.find(
      (branch) => branch.to === 'adult',
    );
    expect(adultBranch?.taken).toBeTruthy();
    expect(adultBranch?.reason).toBe('condition-true');
  });

  it('falls back to the default branch when no condition passes', () => {
    const result = simulateWorkflow(
      graph({
        inputs: ['risk'],
        nodes: [
          { id: 'start', type: 'start' },
          { id: 'decision', type: 'decision' },
          { id: 'high', type: 'task' },
          { id: 'low', type: 'task' },
          { id: 'end', type: 'end' },
        ],
        edges: [
          { from: 'start', to: 'decision' },
          {
            from: 'decision',
            to: 'high',
            condition: { op: 'eq', args: [{ ref: 'risk' }, { lit: 'high' }] },
          },
          { from: 'decision', to: 'low' },
          { from: 'high', to: 'end' },
          { from: 'low', to: 'end' },
        ],
      }),
      { risk: 'low' },
    );

    expect(result.status).toBe('completed');
    expect(result.visitedNodeIds).toStrictEqual([
      'start',
      'decision',
      'low',
      'end',
    ]);
    const decision = result.steps.find((step) => step.node.id === 'decision');
    const defaultBranch = decision?.branchEvaluations.find(
      (branch) => branch.isDefault,
    );
    expect(defaultBranch?.taken).toBeTruthy();
    expect(defaultBranch?.reason).toBe('default-taken');
    const skippedConditional = decision?.branchEvaluations.find(
      (branch) => branch.to === 'high',
    );
    expect(skippedConditional?.result).toBeFalsy();
  });

  it('blocks when a decision has no passing branch and no default', () => {
    const result = simulateWorkflow(
      graph({
        inputs: ['risk'],
        nodes: [
          { id: 'start', type: 'start' },
          { id: 'decision', type: 'decision' },
          { id: 'end', type: 'end' },
        ],
        edges: [
          { from: 'start', to: 'decision' },
          {
            from: 'decision',
            to: 'end',
            condition: { op: 'eq', args: [{ ref: 'risk' }, { lit: 'high' }] },
          },
        ],
      }),
      { risk: 'low' },
    );

    expect(result.status).toBe('blocked');
    expect(result.blockReason).toBe('no-branch-taken');
    expect(result.blockedAtNodeId).toBe('decision');
  });

  it('blocks when the graph has no start node', () => {
    const result = simulateWorkflow(
      graph({
        nodes: [
          { id: 'task', type: 'task' },
          { id: 'end', type: 'end' },
        ],
        edges: [{ from: 'task', to: 'end' }],
      }),
      {},
    );

    expect(result.status).toBe('blocked');
    expect(result.blockReason).toBe('no-start');
  });

  it('blocks at a non-end node without an outgoing edge', () => {
    const result = simulateWorkflow(
      graph({
        nodes: [
          { id: 'start', type: 'start' },
          { id: 'task', type: 'task' },
        ],
        edges: [{ from: 'start', to: 'task' }],
      }),
      {},
    );

    expect(result.status).toBe('blocked');
    expect(result.blockReason).toBe('no-exit');
    expect(result.blockedAtNodeId).toBe('task');
  });

  it('blocks on a repeated edge (cycle)', () => {
    const result = simulateWorkflow(
      graph({
        nodes: [
          { id: 'start', type: 'start' },
          { id: 'loop', type: 'task' },
          { id: 'end', type: 'end' },
        ],
        edges: [
          { from: 'start', to: 'loop' },
          { from: 'loop', to: 'loop' },
          { from: 'loop', to: 'end' },
        ],
      }),
      {},
    );

    expect(result.status).toBe('blocked');
    expect(result.blockReason).toBe('cycle');
  });
});
