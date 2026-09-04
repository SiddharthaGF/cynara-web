/**
 * Splits long prompts into paragraph blocks queued as consecutive assistant
 * turns, so one massive prompt never blows past the provider's TTFB budget.
 * Each block stays self-contained and later blocks carry a "Continúa.
 * Sección X/N:" marker; the existing conversation history is preserved.
 */

/** Default prompt size after which we start splitting. */
export const LARGE_PROMPT_THRESHOLD = 1500;

/**
 * Splits a prompt into self-contained blocks; the first keeps the user's
 * original content unchanged, later ones get a continuation marker.
 * Conservative: paragraphs are preserved verbatim, never rephrased.
 *
 * @returns one element when short, N (>1) when auto-split fires.
 */
export function splitPromptIntoBlocks(content: string): string[] {
  const trimmed = content.trim();
  if (trimmed.length <= LARGE_PROMPT_THRESHOLD) {
    return trimmed.length > 0 ? [trimmed] : [];
  }
  const paragraphs = trimmed
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
  // No paragraph breaks: chunk on a hard character cap instead of one oversized block.
  const blocks =
    paragraphs.length > 1
      ? paragraphs
      : chunkByCharacters(trimmed, LARGE_PROMPT_THRESHOLD);
  if (blocks.length <= 1) {
    return [trimmed];
  }
  const total = blocks.length;
  // First block verbatim; continuation blocks carry the marker so the model
  // Picks up where the previous turn left off.
  return blocks.map((block, index) => {
    if (index === 0) {
      return block;
    }
    const header = `Continúa. Sección ${index + 1}/${total}:`;
    return `${header}\n\n${block}`;
  });
}

function chunkByCharacters(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) {
    return [text];
  }
  const chunks: string[] = [];
  // Try to break on whitespace near the cap so we do not split words.
  let cursor = 0;
  while (cursor < text.length) {
    let end = Math.min(cursor + maxChars, text.length);
    if (end < text.length) {
      const lastSpace = text.lastIndexOf(' ', end);
      if (lastSpace > cursor + maxChars / 2) {
        end = lastSpace;
      }
    }
    const slice = text.slice(cursor, end).trim();
    if (slice.length > 0) {
      chunks.push(slice);
    }
    cursor = end;
  }
  return chunks;
}
