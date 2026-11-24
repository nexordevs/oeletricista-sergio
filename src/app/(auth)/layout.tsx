import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getTheme } from "@/lib/theme";
import { ThemeToggle } from "@/components/ThemeToggle";
export const metadata = { robots: { index: false } };
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const theme = await getTheme();
  return (
    <div data-theme-root data-theme={theme} className="flex min-h-screen flex-col bg-navy">
      <div className="h-1.5 bg-brand" />
      <div className="container-x py-6"><Link href="/" aria-label="Início"><Logo dark /></Link></div>
      <div className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:items-center">
        <div className="w-full max-w-md space-y-4">
          <div className="rounded-2xl bg-white p-6 shadow-2xl sm:p-8">{children}</div>
          <ThemeToggle initial={theme} onDark />
        </div>
      </div>
    </div>
  );
}
