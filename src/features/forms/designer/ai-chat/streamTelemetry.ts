/**
 * Local-only telemetry for AI chat streams: TTFB, wall-clock, farthest stream
 * phase, server fallback outcome, event count, and prompt size — never payload
 * content, so it is safe for a beacon endpoint. Dev emits a performance mark;
 * with `VITE_AI_METRICS_URL` set, `navigator.sendBeacon` fires (survives unload).
 */
export interface StreamMetricsPayload {
  ttfb_ms: number;
  total_ms: number;
  event_count: number;
  phase_reached: 'message' | 'schema' | null;
  fallback_outcome: string | null;
  prompt_chars: number;
  attempt: number;
  status: 'succeeded' | 'failed';
  /** Optional error class so dashboards can bucket failures. */
  error_class?: string;
}

/**
 * Best-effort, non-blocking emission of a stream-metrics payload. Callers
 * should never await this; we always swallow transport errors so a failing
 * endpoint cannot break the user-visible chat.
 */
export function recordStreamMetrics(payload: StreamMetricsPayload): void {
  const json = JSON.stringify(payload);
  if (typeof performance !== 'undefined') {
    performance.mark('cynara-ai-stream-metrics', {
      detail: payload,
    });
  }
  // Prefer sendBeacon — it survives page unload.
  const metricsUrl = resolveMetricsUrl();
  if (metricsUrl === null) {
    return;
  }
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.sendBeacon === 'function'
  ) {
    try {
      const blob = new Blob([json], { type: 'application/json' });
      navigator.sendBeacon(metricsUrl, blob);
      return;
    } catch {
      return;
    }
  }
  // Fetch keepalive is the fallback — it does not survive page unload.
  if (typeof fetch === 'function') {
    try {
      void fetch(metricsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
        keepalive: true,
      });
    } catch {
      // Metrics are best effort; transport failures are intentionally ignored.
    }
  }
}

function resolveMetricsUrl(): string | null {
  try {
    // Resolve lazily (Vite replaces `import.meta.env` at build time) so SSR calls still work.
    const candidate = (import.meta.env as Record<string, unknown>)
      .VITE_AI_METRICS_URL;
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }
  } catch {
    // Importing import.meta.env at non-build time can throw — treat as absent.
  }
  return null;
}
