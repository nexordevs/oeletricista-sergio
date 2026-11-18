// Limitador simples em memória (por instância). Em produção com várias instâncias,
// o bloqueio de conta por tentativas (User.failedLogins/lockedUntil) continua valendo no banco.
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) { buckets.set(key, { count: 1, reset: now + windowMs }); return true; }
  b.count++;
  return b.count <= max;
}
