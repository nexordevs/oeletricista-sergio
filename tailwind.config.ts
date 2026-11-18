import type { Config } from "tailwindcss";
// Paleta extraída do orçamento PDF original (identidade Sergio Eletricista)
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0F2742", 2: "#1B3B5F", soft: "#B8C6D6" },
        brand: { DEFAULT: "#FFB400", dark: "#E6A200" },
        ink: "#111827",
        muted: "#5B6B7D",
        light: "#F3F6FA",
        line: "#DCE3EC",
      },
      fontFamily: { sans: ["var(--font-brand)", "Lato", "Calibri", "system-ui", "sans-serif"] },
      borderRadius: { xl: "0.85rem" },
    },
  },
  plugins: [],
};
export default config;
