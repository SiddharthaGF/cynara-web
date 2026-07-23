export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  failed?: boolean;
  /** Waiting to send while another reply is in flight. */
  queued?: boolean;
  /** True while SSE tokens are still arriving. */
  streaming?: boolean;
  /** True when this turn updated the open form draft. */
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
