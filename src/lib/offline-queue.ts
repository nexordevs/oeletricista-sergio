// Fila de orçamentos criados SEM internet (guardados no aparelho e enviados quando a conexão volta).
import type { QuotePayload } from "@/app/painel/orcamentos/actions";
export type QueuedQuote = { id: string; userId: string; payload: QuotePayload; intent: "draft" | "finalize"; createdAt: number; clientName: string; total: number; error?: string };
const KEY = "fila-orcamentos";
export const EVENT = "fila-orcamentos-mudou";
export function readQueue(): QueuedQuote[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(q: QueuedQuote[]) {
  try { localStorage.setItem(KEY, JSON.stringify(q)); } catch { /* armazenamento cheio/bloqueado */ }
  window.dispatchEvent(new Event(EVENT));
}
export function enqueue(item: Omit<QueuedQuote, "id" | "createdAt">) {
  const q = readQueue();
  q.push({ ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now() });
  write(q);
}
export function removeFromQueue(id: string) { write(readQueue().filter((x) => x.id !== id)); }
export function markError(id: string, error: string) { write(readQueue().map((x) => (x.id === id ? { ...x, error } : x))); }
export const isNetworkError = (e: unknown) => !navigator.onLine || /fetch|network|Failed to fetch|Load failed|NetworkError/i.test(String((e as Error)?.message ?? e));
