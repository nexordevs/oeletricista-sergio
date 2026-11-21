import type { MetadataRoute } from "next";
// App instalável (PWA) do sistema para eletricistas — abre direto no painel.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sergio Eletricista – Sistema de Orçamentos",
    short_name: "Orçamentos",
    description: "Orçamentos, clientes, calculadora de circuitos e guia de defeitos — funciona também sem internet.",
    id: "/painel",
    start_url: "/painel",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F3F6FA",
    theme_color: "#0F2742",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Novo orçamento", url: "/painel/orcamentos/novo" },
      { name: "Calculadora de circuitos", url: "/painel/dimensionamento" },
    ],
  };
}
