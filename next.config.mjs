/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];
const nextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@react-pdf/renderer", "sharp", "bcryptjs"],
  outputFileTracingIncludes: { "/**/*": ["./public/fonts/**"] }, // fontes usadas no PDF
  experimental: { serverActions: { bodySizeLimit: "4mb" } }, // Vercel aceita até 4,5 MB por requisição
  async headers() { return [{ source: "/(.*)", headers: securityHeaders }]; },
};
export default nextConfig;
