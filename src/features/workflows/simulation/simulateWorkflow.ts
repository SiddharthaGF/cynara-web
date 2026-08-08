import { outgoingEdges } from '@/features/workflows/model/workflowGraph.ts';
import type {
  WorkflowAssignee,
  WorkflowEdge,
  WorkflowGraph,
  WorkflowNode,
} from '@/features/workflows/types.ts';

import {
  evaluateWorkflowExpression,
  type SimulationValues,
} from './evaluateWorkflowExpression.ts';

export type WorkflowSimulationStatus = 'completed' | 'blocked';

export type WorkflowBlockReason =
  | 'no-start'
  | 'no-exit'
  | 'no-branch-taken'
  | 'cycle';

/** Outcome of one outgoing branch of a decision during the walk. */
export interface WorkflowBranchEvaluation {
  /** Edge key (`from\u0000to`) of the branch. */
  edgeKey: string;
  from: string;
  to: string;
  /** Resolved edge label, when present. */
  label: string | null;
  /** True when the branch is the unconditional default. */
  isDefault: boolean;
  /** Condition truth (conditional branches) or fallback outcome (default). */
  result: boolean;
  /** False when the branch was skipped without being considered. */
  evaluated: boolean;
  /** True when the walk left the decision through this branch. */
  taken: boolean;
  reason:
    | 'condition-true'
    | 'condition-false'
    | 'default-taken'
    | 'default-skipped';
}

export interface WorkflowSimulationStep {
  node: WorkflowNode;
  /** Edge the walk entered this node through; null for the entry point. */
  enteredVia: WorkflowEdge | null;
  /** Branch evaluations recorded at this node (only decisions). */
  branchEvaluations: WorkflowBranchEvaluation[];
  /** Assignee recorded when this step is a task node. */
  assignee: WorkflowAssignee | null;
  /** Edge the walk left this node through; null when blocked or terminal. */
  exitedVia: WorkflowEdge | null;
}

export interface WorkflowSimulation {
  status: WorkflowSimulationStatus;
  steps: WorkflowSimulationStep[];
  visitedNodeIds: string[];
  takenEdgeKeys: string[];
  endedAtNodeId: string | null;
  blockedAtNodeId: string | null;
  blockReason: WorkflowBlockReason | null;
}

function blocked(
  blockReason: WorkflowBlockReason,
  atNodeId: string,
  steps: WorkflowSimulationStep[],
  visitedNodeIds: string[],
  takenEdgeKeys: string[],
): WorkflowSimulation {
  return {
    status: 'blocked',
    steps,
    visitedNodeIds,
    takenEdgeKeys,
    endedAtNodeId: null,
    blockedAtNodeId: atNodeId,
    blockReason,
  };
}

/**
 * Walks the graph from its entry point to an end node, evaluating decision
 * guards against the provided test values and recording task assignments.
 *
 * Decision semantics mirror the contract: conditional branches are evaluated
 * in edge order and the first true one is taken; when none passes, the single
 * unconditional (default) branch is taken. A decision without a passing
 * branch, a non-end node without an exit, a missing entry point, or a
 * repeated edge (cycle) blocks the run. The result is pure — the graph and
 * values are never mutated.
 */
export function simulateWorkflow(
  graph: WorkflowGraph,
  values: SimulationValues,
): WorkflowSimulation {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const startNode = graph.nodes.find((node) => node.type === 'start');

  const steps: WorkflowSimulationStep[] = [];
  const visitedNodeIds: string[] = [];
  const takenEdgeKeys: string[] = [];
  const maxSteps = graph.nodes.length * 4 + 16;

  if (!startNode) {
    return blocked('no-start', '', steps, visitedNodeIds, takenEdgeKeys);
  }

  let current: WorkflowNode = startNode;
  let enteredVia: WorkflowEdge | null = null;

  while (true) {
    if (steps.length >= maxSteps) {
      return blocked('cycle', current.id, steps, visitedNodeIds, takenEdgeKeys);
    }

    const outgoing = outgoingEdges(graph, current.id);

    if (current.type === 'end') {
      visitedNodeIds.push(current.id);
      steps.push(stepFor(current, enteredVia, [], null, null));
      return {
        status: 'completed',
        steps,
        visitedNodeIds,
        takenEdgeKeys,
        endedAtNodeId: current.id,
        blockedAtNodeId: null,
        blockReason: null,
      };
    }

    if (outgoing.length === 0) {
      visitedNodeIds.push(current.id);
      steps.push(stepFor(current, enteredVia, [], assigneeFor(current), null));
      return blocked(
        'no-exit',
        current.id,
        steps,
        visitedNodeIds,
        takenEdgeKeys,
      );
    }

    const outcome = walkNode(current, outgoing, values, enteredVia);

    if (outcome.kind === 'blocked') {
      visitedNodeIds.push(current.id);
      steps.push(outcome.step);
      return blocked(
        outcome.reason,
        current.id,
        steps,
        visitedNodeIds,
        takenEdgeKeys,
      );
    }

    visitedNodeIds.push(current.id);
    steps.push(outcome.step);

    const key = edgeKeyOf(outcome.exitedVia);
    if (takenEdgeKeys.includes(key)) {
      return blocked('cycle', current.id, steps, visitedNodeIds, takenEdgeKeys);
    }
    takenEdgeKeys.push(key);

    const next = nodeById.get(outcome.exitedVia.to);
    if (!next) {
      return blocked(
        'no-exit',
        current.id,
        steps,
        visitedNodeIds,
        takenEdgeKeys,
      );
    }
    enteredVia = outcome.exitedVia;
    current = next;
  }
}

type NodeOutcome =
  | {
      kind: 'blocked';
      reason: WorkflowBlockReason;
      step: WorkflowSimulationStep;
    }
  | {
      kind: 'advance';
      step: WorkflowSimulationStep;
      exitedVia: WorkflowEdge;
    };

function walkNode(
  current: WorkflowNode,
  outgoing: WorkflowEdge[],
  values: SimulationValues,
  enteredVia: WorkflowEdge | null,
): NodeOutcome {
  if (current.type === 'decision') {
    const rows = outgoing.map((edge) => ({
      edge,
      isConditional: edge.condition !== undefined,
      truth: edge.condition
        ? Boolean(evaluateWorkflowExpression(edge.condition, values))
        : false,
    }));
    const passed = rows.find((row) => row.isConditional && row.truth);
    const fallback = rows.find((row) => !row.isConditional) ?? null;
    const taken = passed ?? fallback;

    if (taken === null) {
      return {
        kind: 'blocked',
        reason: 'no-branch-taken',
        step: stepFor(
          current,
          enteredVia,
          rows.map((row) =>
            branchEvaluation(
              row,
              row.truth,
              false,
              row.isConditional ? 'condition-false' : 'default-skipped',
            ),
          ),
          null,
          null,
        ),
      };
    }

    const takenKey = edgeKeyOf(taken.edge);
    const branchEvaluations = rows.map((row) => {
      if (row.isConditional) {
        return branchEvaluation(
          row,
          row.truth,
          edgeKeyOf(row.edge) === takenKey,
          row.truth ? 'condition-true' : 'condition-false',
        );
      }
      const isTaken = edgeKeyOf(row.edge) === takenKey;
      return branchEvaluation(
        row,
        isTaken,
        isTaken,
        isTaken ? 'default-taken' : 'default-skipped',
      );
    });

    return {
      kind: 'advance',
      step: stepFor(current, enteredVia, branchEvaluations, null, taken.edge),
      exitedVia: taken.edge,
    };
  }

  // Start and task nodes advance through their single outgoing edge.
  const [exitedVia] = outgoing;
  if (exitedVia === undefined) {
    return {
      kind: 'blocked',
      reason: 'no-exit',
      step: stepFor(current, enteredVia, [], assigneeFor(current), null),
    };
  }
  return {
    kind: 'advance',
    step: stepFor(current, enteredVia, [], assigneeFor(current), exitedVia),
    exitedVia,
  };
}

interface BranchRow {
  edge: WorkflowEdge;
  isConditional: boolean;
  truth: boolean;
}

function branchEvaluation(
  row: BranchRow,
  result: boolean,
  taken: boolean,
  reason: WorkflowBranchEvaluation['reason'],
): WorkflowBranchEvaluation {
  return {
    edgeKey: edgeKeyOf(row.edge),
    from: row.edge.from,
    to: row.edge.to,
    label: row.edge.label?.trim() ?? null,
    isDefault: !row.isConditional,
    result,
    // Conditional branches are always considered.
    // A default branch only when it is the one the walk fell back to.
    evaluated: row.isConditional || taken,
    taken,
    reason,
  };
}

function stepFor(
  node: WorkflowNode,
  enteredVia: WorkflowEdge | null,
  branchEvaluations: WorkflowBranchEvaluation[],
  assignee: WorkflowAssignee | null,
  exitedVia: WorkflowEdge | null,
): WorkflowSimulationStep {
  return {
    node,
    enteredVia,
    branchEvaluations,
    assignee,
    exitedVia,
  };
}

function assigneeFor(node: WorkflowNode): WorkflowAssignee | null {
  if (node.type === 'task' && node.assignee) {
    return node.assignee;
  }
  return null;
}

function edgeKeyOf(edge: WorkflowEdge): string {
  return `${edge.from}\u0000${edge.to}`;
}
