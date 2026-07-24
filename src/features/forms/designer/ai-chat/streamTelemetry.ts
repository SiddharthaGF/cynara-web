/**
 * Local-only telemetry for AI chat streams.
 *
 * Captures the data points that explain why large prompts used to time out
 * (TTFB, total wall-clock, the farthest stream phase reached, the safety-net
 * fallback outcome from the server, total events seen, and how many
 * characters the user actually submitted). We deliberately do not include
 * any sensitive payload content — only sizes and outcomes — so this can be
 * safely shipped to a beacon endpoint for monitoring.
 *
 * Two sinks:
 *  - In dev: emits a browser performance mark so engineers can correlate UI
 *    behaviour with network timings without leaving devtools.
 *  - Anywhere `import.meta.env.VITE_AI_METRICS_URL` is configured: fires a
 *    `navigator.sendBeacon` POST with the JSON payload. sendBeacon is
 *    fire-and-forget and survives page unload.
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
  // Always attempt sendBeacon when available; keepalive: true gives the
  // Browser an even larger budget if the tab is closing.
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
  // Fallback to fetch with keepalive; only as a last resort because fetch
  // Does not survive page unload.
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
    // `import.meta.env` is replaced at build time by Vite. We deliberately
    // Resolve this lazily so calling the helper at SSR time still works.
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
