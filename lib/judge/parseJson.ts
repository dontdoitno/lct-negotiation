/**
 * LLMs sometimes wrap JSON in ```json fences or add stray text around it
 * even when told not to. Strip fences and grab the first {...} block before
 * parsing, so a well-formed-but-decorated response isn't treated as invalid.
 */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const braceMatch = candidate.match(/\{[\s\S]*\}/);
  const jsonText = braceMatch ? braceMatch[0] : candidate;
  return JSON.parse(jsonText);
}
