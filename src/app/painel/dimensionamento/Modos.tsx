"use client";
import { useState } from "react";
import { Calculadora } from "./Calculadora";
import { Multipla } from "./Multipla";
export function Modos() {
  const [modo, setModo] = useState<"varios" | "um">("varios");
  const tab = (on: boolean) => `flex-1 rounded-xl px-4 py-3 text-center font-bold transition ${on ? "bg-navy text-white" : "bg-white text-navy hover:bg-light"}`;
  return (
    <div className="space-y-5">
      <nav className="flex gap-2" aria-label="Modo da calculadora">
        <button type="button" className={tab(modo === "varios")} aria-pressed={modo === "varios"} onClick={() => setModo("varios")}>Vários de uma vez</button>
        <button type="button" className={tab(modo === "um")} aria-pressed={modo === "um"} onClick={() => setModo("um")}>Um circuito</button>
      </nav>
      <div hidden={modo !== "varios"}><Multipla /></div>
      <div hidden={modo !== "um"}><Calculadora /></div>
    </div>
  );
}
