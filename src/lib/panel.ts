import "server-only";
import { cache } from "react";
import { requireUser } from "./auth";
import { getAccess } from "./access";
/** Usuário + acesso da requisição atual (memoizado por request). */
export const panelContext = cache(async () => {
  const user = await requireUser();
  const access = await getAccess(user);
  return { user, access };
});
