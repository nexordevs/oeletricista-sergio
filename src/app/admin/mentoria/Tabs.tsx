import Link from "next/link";
const TABS = [["/admin/mentoria", "Painel"], ["/admin/mentoria/semana", "Semana"], ["/admin/mentoria/questoes", "Questões"]] as const;
export function MentoriaTabs({ active }: { active: string }) {
  return (
    <nav className="grid grid-cols-3 gap-2" aria-label="Seções da mentoria">
      {TABS.map(([href, label]) => <Link key={href} href={href} aria-current={active === href ? "page" : undefined} className={`rounded-xl px-3 py-3 text-center font-bold transition ${active === href ? "bg-navy text-white" : "bg-white text-navy hover:bg-light"}`}>{label}</Link>)}
    </nav>
  );
}
