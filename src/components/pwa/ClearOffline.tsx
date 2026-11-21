"use client";
// Na tela de login: apaga as páginas do painel guardadas no aparelho (dados de quem saiu).
import { useEffect } from "react";
export function ClearOffline() {
  useEffect(() => {
    navigator.serviceWorker?.controller?.postMessage({ type: "clear" });
    if ("caches" in window) caches.keys().then((ks) => ks.filter((k) => k.startsWith("paginas-")).forEach((k) => caches.delete(k))).catch(() => {});
  }, []);
  return null;
}
