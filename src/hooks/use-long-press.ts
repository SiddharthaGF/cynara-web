import { useCallback, useEffect, useRef, type PointerEvent } from 'react';

const LONG_PRESS_MS = 500;
const MOVE_THRESHOLD_PX = 10;

export interface LongPressPoint {
  /** Client-space coordinates, for anchoring a floating menu at the press. */
  x: number;
  y: number;
  /** Element the press started on, for resolving which surface was held. */
  target: EventTarget | null;
}

export interface UseLongPressOptions {
  /** Fires once a touch/pen press is held still past the long-press threshold. */
  onLongPress: (point: LongPressPoint) => void;
  /**
   * Skip tracking for presses that start on interactive children (buttons,
   * connection handles, panels…).
   */
  shouldIgnore?: (target: EventTarget | null) => boolean;
}

export interface UseLongPressHandlers {
  onPointerDown: (event: PointerEvent) => void;
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
  onPointerCancel: (event: PointerEvent) => void;
  onPointerLeave: (event: PointerEvent) => void;
}

/**
 * Detects a touch or pen press held still for ~500ms (long press) so touch
 * devices get an equivalent of the right-click context menu. The gesture is
 * cancelled by moving past a small threshold, by releasing early, or by a
 * pointercancel. Mouse presses are ignored on purpose: right-click already
 * covers the desktop path.
 *
 * All state lives in refs so a held press never triggers a re-render, and the
 * underlying pan/drag/connect gestures are left untouched.
 */
export function useLongPress({
  onLongPress,
  shouldIgnore,
}: UseLongPressOptions): UseLongPressHandlers {
  const onLongPressRef = useRef(onLongPress);
  useEffect(() => {
    onLongPressRef.current = onLongPress;
  }, [onLongPress]);

  const shouldIgnoreRef = useRef(shouldIgnore);
  useEffect(() => {
    shouldIgnoreRef.current = shouldIgnore;
  }, [shouldIgnore]);

  const timerRef = useRef<number | null>(null);
  const startRef = useRef<LongPressPoint | null>(null);
  const disarmTimerRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

  const clearTimer = useCallback((): void => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancel = useCallback((): void => {
    clearTimer();
    startRef.current = null;
  }, [clearTimer]);

  useEffect(() => cancel, [cancel]);

  // The browser fires a click when the held finger is lifted. Swallow that one
  // Click so the released press does not select a node (which would slide the
  // Inspector over the just-opened menu on mobile). The suppression is disarmed
  // By the next pointerdown, so subsequent menu taps work normally.
  const disarmSuppressedClick = useCallback((): void => {
    suppressClickRef.current = false;
    if (disarmTimerRef.current !== null) {
      window.clearTimeout(disarmTimerRef.current);
      disarmTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent): void => {
      if (!suppressClickRef.current || event.button !== 0) {
        return;
      }
      disarmSuppressedClick();
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };
    const onPointerDown = (): void => {
      disarmSuppressedClick();
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('click', onClick, true);
    return (): void => {
      disarmSuppressedClick();
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('click', onClick, true);
    };
  }, [disarmSuppressedClick]);

  const suppressClickAfterLongPress = useCallback((): void => {
    if (suppressClickRef.current) {
      return;
    }
    suppressClickRef.current = true;
    // Safety net: never swallow a click that arrives long after the press.
    disarmTimerRef.current = window.setTimeout(disarmSuppressedClick, 1500);
  }, [disarmSuppressedClick]);

  const handlePointerDown = useCallback(
    (event: PointerEvent): void => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') {
        return;
      }
      if (!event.isPrimary) {
        return;
      }
      if (shouldIgnoreRef.current?.(event.target)) {
        return;
      }
      clearTimer();
      startRef.current = {
        x: event.clientX,
        y: event.clientY,
        target: event.target,
      };
      const start = startRef.current;
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        if (startRef.current === start) {
          suppressClickAfterLongPress();
          onLongPressRef.current({
            x: start.x,
            y: start.y,
            target: start.target,
          });
        }
      }, LONG_PRESS_MS);
    },
    [clearTimer, suppressClickAfterLongPress],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent): void => {
      const start = startRef.current;
      if (!start || timerRef.current === null) {
        return;
      }
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (dx * dx + dy * dy > MOVE_THRESHOLD_PX ** 2) {
        cancel();
      }
    },
    [cancel],
  );

  const handlePointerUp = useCallback((): void => cancel(), [cancel]);
  const handlePointerCancel = useCallback((): void => cancel(), [cancel]);
  const handlePointerLeave = useCallback((): void => cancel(), [cancel]);

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
    onPointerLeave: handlePointerLeave,
  };
}
