export function parseFaq(text: string) {
  return text.split(/\n\s*\n/).map((b) => b.trim().split("\n")).filter((l) => l.length >= 2 && l[0].trim())
    .map(([q, ...a]) => ({ q: q.trim(), a: a.join("\n").trim() }));
}
