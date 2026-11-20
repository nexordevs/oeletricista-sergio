import { panelContext } from "@/lib/panel";
import { NeedsPlan } from "@/components/panel/NeedsPlan";
import { Calculadora } from "./Calculadora";
export default async function Page() {
  const { access } = await panelContext();
  if (!access.active) return <NeedsPlan what="A calculadora de dimensionamento" />;
  return <Calculadora />;
}
