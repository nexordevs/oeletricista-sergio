import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { env } from "@/lib/env";

const brandFont = localFont({
  src: [
    { path: "../../public/fonts/Carlito-Regular.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/Carlito-Italic.ttf", weight: "400", style: "italic" },
    { path: "../../public/fonts/Carlito-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-brand",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: { default: "Sergio Eletricista | Eletricista em João Pessoa – PB", template: "%s | Sergio Eletricista" },
  description: "Eletricista em João Pessoa – PB: instalações elétricas residenciais, chuveiros, tomadas, disjuntores, quadros e manutenção. Orçamento pelo WhatsApp.",
  icons: { icon: "/icon.svg" },
  openGraph: { type: "website", locale: "pt_BR", siteName: "Sergio Eletricista" },
};
export const viewport: Viewport = { themeColor: "#0F2742", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={brandFont.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
