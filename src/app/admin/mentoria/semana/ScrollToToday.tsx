"use client";
// No celular, abre a semana já rolada até o dia de hoje.
import { useEffect } from "react";
export function ScrollToToday() {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>("[data-today]");
    if (el && window.innerWidth < 1024) el.parentElement?.scrollTo({ left: el.offsetLeft - 16, behavior: "auto" });
  }, []);
  return null;
}
