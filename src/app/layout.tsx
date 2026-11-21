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
  title: { default: "Eletricista em João Pessoa – PB | Sergio Eletricista", template: "%s | Sergio Eletricista" },
  description: "Eletricista em João Pessoa: Bessa, Bancários, José Américo, Mangabeira e região. Instalações, quadros (QDC), disjuntores, curto-circuito, chuveiros e tomadas. Orçamento pelo WhatsApp.",
  alternates: { canonical: "/" },
  icons: { icon: "/icon.svg", apple: "/icons/apple-180.png" },
  appleWebApp: { capable: true, title: "Orçamentos", statusBarStyle: "black-translucent" },
  openGraph: { type: "website", locale: "pt_BR", siteName: "Sergio Eletricista", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Sergio Eletricista – Eletricista em João Pessoa" }] },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
  formatDetection: { telephone: true },
};
export const viewport: Viewport = { themeColor: "#0F2742", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={brandFont.variable}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
