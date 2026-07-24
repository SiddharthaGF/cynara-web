/**
 * Splits long user prompts into paragraph-level blocks so we can queue them
 * as consecutive assistant turns instead of sending one massive prompt that
 * blows past the provider's TTFB budget.
 *
 * Mirrors the W2 layer from the formai-stream-hardening plan: keep each
 * block self-contained, prefix it with "Continúa. Sección X/N:" so the
 * model knows the request is split, and keep the existing conversation
 * history intact so context is preserved across the queued turns.
 */

/** Default prompt size after which we start splitting. */
export const LARGE_PROMPT_THRESHOLD = 1500;

/**
 * Split a prompt into one or more self-contained blocks. The first block is
 * returned with the user's original content (unchanged), so the assistant
 * still sees a "fresh" request rather than a continuation of itself. Each
 * subsequent block is prefixed with a continuation marker describing its
 * position in the queue.
 *
 * The splitter is intentionally conservative: it preserves every paragraph
 * exactly as written; we never rephrase or trim the user's words.
 *
 * @param content user-submitted prompt text.
 * @returns an array with one element if the prompt is short, or N elements
 *          (`> 1`) when auto-split fires.
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
  // Fall back to the raw content if the splitter finds no paragraph breaks —
  // Split on a hard character cap instead of leaving a single oversized
  // Paragraph untouched.
  const blocks =
    paragraphs.length > 1
      ? paragraphs
      : chunkByCharacters(trimmed, LARGE_PROMPT_THRESHOLD);
  if (blocks.length <= 1) {
    return [trimmed];
  }
  const total = blocks.length;
  // The first block is left as-is so the AI sees the user's opening request
  // Verbatim. Continuation blocks include a small header so the model
  // Understands it should pick up where the previous turn left off rather
  // Than start a new conversation.
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
