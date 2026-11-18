"use client";
import { usePathname } from "next/navigation";
export function usePanelTitle(map: [string, string][], fallback: string) {
  const p = usePathname();
  return map.find(([k]) => p === k || p.startsWith(k + "/"))?.[1] ?? fallback;
}
