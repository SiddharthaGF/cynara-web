import { useEffect, useMemo, useState } from 'react';

import type { SimulationValue } from '@/features/workflows/simulation/evaluateWorkflowExpression.ts';
import {
  inferInputType,
  type SimulationInputType,
} from '@/features/workflows/simulation/inferInputType.ts';
import {
  simulateWorkflow,
  type WorkflowSimulation,
} from '@/features/workflows/simulation/simulateWorkflow.ts';
import type { WorkflowGraph } from '@/features/workflows/types.ts';

export interface WorkflowSimulationControl {
  /** Session-only test data keyed by workflow input code. */
  values: Readonly<Record<string, SimulationValue>>;
  /** Per-input control type; inferred by default, overridable by the user. */
  inputTypes: Readonly<Record<string, SimulationInputType>>;
  setValue: (code: string, value: SimulationValue) => void;
  setInputType: (code: string, type: SimulationInputType) => void;
  /** Clears every input back to its empty state. */
  reset: () => void;
  /** Live walk of the current graph against the current test data. */
  simulation: WorkflowSimulation;
  currentStepIndex: number;
  setCurrentStepIndex: (index: number) => void;
  stepBack: () => void;
  stepForward: () => void;
  hasPreviousStep: boolean;
  hasNextStep: boolean;
}

/**
 * Session-only simulation state for the workflow preview. Holds the typed
 * test-data record and per-input control types, re-runs the walk whenever the
 * graph or the test data changes, and drives the trace stepper. Nothing here
 * is persisted or saved.
 */
export function useWorkflowSimulation(
  graph: WorkflowGraph,
): WorkflowSimulationControl {
  const inputCodes = useMemo(() => graph.inputs ?? [], [graph]);
  const inferredTypes = useMemo(() => inferInputType(graph), [graph]);

  const [values, setValues] = useState<Record<string, SimulationValue>>({});
  const [inputTypes, setInputTypes] = useState<
    Record<string, SimulationInputType>
  >({});
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Reconcile the control types with the graph's inputs.
  // New inputs inherit the inferred type and user overrides survive edits.
  // Codes that are no longer inputs are dropped.
  useEffect(() => {
    setInputTypes((current) => {
      const next: Record<string, SimulationInputType> = {};
      let changed = false;
      for (const input of inputCodes) {
        const resolved = current[input] ?? inferredTypes[input] ?? 'text';
        if (current[input] !== resolved) {
          changed = true;
        }
        next[input] = resolved;
      }
      if (Object.keys(current).length !== Object.keys(next).length) {
        changed = true;
      }
      return changed ? next : current;
    });
  }, [inputCodes, inferredTypes]);

  // Drop test values for inputs that no longer exist.
  // A reset then reflects the current shape of the workflow.
  useEffect(() => {
    setValues((current) => {
      const active = new Set(inputCodes);
      const stale = Object.keys(current).some((code) => !active.has(code));
      return stale
        ? Object.fromEntries(
            Object.entries(current).filter(([code]) => active.has(code)),
          )
        : current;
    });
  }, [inputCodes]);

  const simulation = useMemo(
    () => simulateWorkflow(graph, values),
    [graph, values],
  );

  const stepCount = simulation.steps.length;
  const lastIndex = Math.max(stepCount - 1, 0);

  // Clamp the stepper when a re-run shortens the trace.
  // Example: the walk now blocks earlier than before.
  useEffect(() => {
    setCurrentStepIndex((index) => Math.min(index, lastIndex));
  }, [lastIndex]);

  const setValue = (code: string, value: SimulationValue): void => {
    setValues((current) => {
      if (current[code] === value) {
        return current;
      }
      return { ...current, [code]: value };
    });
  };

  const setInputType = (code: string, type: SimulationInputType): void => {
    setInputTypes((current) => {
      if (current[code] === type) {
        return current;
      }
      return { ...current, [code]: type };
    });
  };

  const reset = (): void => {
    const cleared: Record<string, SimulationValue> = {};
    for (const input of inputCodes) {
      cleared[input] = null;
    }
    setValues(cleared);
    setCurrentStepIndex(0);
  };

  const stepBack = (): void => {
    setCurrentStepIndex((index) => Math.max(index - 1, 0));
  };

  const stepForward = (): void => {
    setCurrentStepIndex((index) => Math.min(index + 1, lastIndex));
  };

  return {
    values,
    inputTypes,
    setValue,
    setInputType,
    reset,
    simulation,
    currentStepIndex,
    setCurrentStepIndex,
    stepBack,
    stepForward,
    hasPreviousStep: currentStepIndex > 0,
    hasNextStep: currentStepIndex < lastIndex,
  };
}
