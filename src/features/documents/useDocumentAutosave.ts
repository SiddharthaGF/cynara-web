import { useCallback, useEffect, useRef, useState } from 'react';

const AUTOSAVE_MS = 1500;

export interface UseDocumentAutosaveOptions {
  /** Autosave and dirty tracking are disabled while the document is read-only. */
  editable: boolean;
  /**
   * Serialized current form values; the dirty state derives from changes to this string.
   */
  valuesJson: string;
  /**
   * Persists the given answers (used for autosave and the final flush before
   * leaving the page). Resolve with `true` when the save was persisted so the
   * dirty snapshot can advance; stale or failed saves resolve with `false`.
   */
  save: (answersJson: string) => Promise<boolean>;
  /**
   * While true the autosave timer is paused. Used after a concurrent-edit
   * conflict so the workspace stops hammering the API with failing saves and
   * waits for the user to reload the latest version.
   */
  paused?: boolean;
}

export interface UseDocumentAutosaveResult {
  /** True while the current values differ from the last persisted snapshot. */
  isDirty: boolean;
  /** Advance the persisted snapshot after an explicit manual save. */
  markSaved: (answersJson: string) => void;
  /** Called from the "Discard" confirmation; suppresses the final flush. */
  markDiscarding: () => void;
}

/**
 * Tracks unsaved changes in a document workspace and debounces an autosave of
 * the current answers. A final flush persists pending changes when the
 * workspace unmounts unless the user explicitly discarded them.
 */
export function useDocumentAutosave({
  editable,
  valuesJson,
  save,
  paused = false,
}: UseDocumentAutosaveOptions): UseDocumentAutosaveResult {
  const [savedSnapshot, setSavedSnapshot] = useState(valuesJson);
  const isDirty = editable && valuesJson !== savedSnapshot;

  const valuesRef = useRef(valuesJson);
  const snapshotRef = useRef(savedSnapshot);
  const editableRef = useRef(editable);
  const pausedRef = useRef(paused);
  const discardingRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    valuesRef.current = valuesJson;
  }, [valuesJson]);
  useEffect(() => {
    snapshotRef.current = savedSnapshot;
  }, [savedSnapshot]);
  useEffect(() => {
    editableRef.current = editable;
  }, [editable]);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const advanceSnapshot = useCallback((answersJson: string): void => {
    snapshotRef.current = answersJson;
    setSavedSnapshot(answersJson);
  }, []);

  const persist = useCallback(
    (answersJson: string): void => {
      void saveRef.current(answersJson).then((persisted) => {
        if (persisted) {
          advanceSnapshot(answersJson);
        }
      });
    },
    [advanceSnapshot],
  );

  useEffect(() => {
    if (editable && !paused && isDirty) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(
        () => persist(valuesRef.current),
        AUTOSAVE_MS,
      );
    }
    return (): void => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = null;
    };
  }, [editable, isDirty, paused, persist, valuesJson]);

  useEffect(
    () => (): void => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (
        editableRef.current &&
        !pausedRef.current &&
        !discardingRef.current &&
        snapshotRef.current !== valuesRef.current
      ) {
        persist(valuesRef.current);
      }
    },
    [persist],
  );

  const markSaved = useCallback(
    (answersJson: string): void => {
      advanceSnapshot(answersJson);
    },
    [advanceSnapshot],
  );

  const markDiscarding = useCallback((): void => {
    discardingRef.current = true;
  }, []);

  return { isDirty, markSaved, markDiscarding };
}
