/** One SSE `event:` + `data:` pair after normalization (see MAYRA_TECHNICAL_SPEC §3.4). */
export type SseEvent = { event: string; data: string };

/**
 * Parse a full SSE response body into ordered (event, data) pairs.
 * Ignores comment lines (`:` ping) and blank lines.
 */
export function parseSseText(body: string): SseEvent[] {
  const events: SseEvent[] = [];
  let currentEvent: string | null = null;
  for (const raw of body.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      currentEvent = null;
      continue;
    }
    if (line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      currentEvent = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      const data = line.slice(5).trim();
      if (currentEvent != null) {
        events.push({ event: currentEvent, data });
      }
      currentEvent = null;
    }
  }
  return events;
}
