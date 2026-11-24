import "server-only";
import { cookies } from "next/headers";
export type Theme = "light" | "dark";
/** Tema escolhido pelo usuário (cookie "tema"); padrão claro. */
export async function getTheme(): Promise<Theme> {
  return (await cookies()).get("tema")?.value === "escuro" ? "dark" : "light";
}
