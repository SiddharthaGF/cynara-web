export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  failed?: boolean;
  /** Waiting to send while another reply is in flight. */
  queued?: boolean;
  /** True while SSE tokens are still arriving. */
  streaming?: boolean;
  /**
   * Stream phase after early assistant text (`schema` = applying draft
   * changes). Cleared when the turn settles.
   */
  streamPhase?: 'message' | 'schema';
  /** True when this turn updated the open form draft.
   *  Explicit `false` means the turn finished without changing schemas. */
  draftApplied?: boolean;
  /** Short designer-facing note about what was applied. */
  appliedSummary?: string;
}

export function turnsToFormAiMessages(
  nextTurns: ChatTurn[],
): { role: 'user' | 'assistant'; content: string }[] {
  return nextTurns.flatMap((turn) => {
    if (turn.failed || (turn.streaming && !turn.content)) {
      return [];
    }
    return [
      {
        role: turn.role,
        content: turn.content,
      },
    ];
  });
}
