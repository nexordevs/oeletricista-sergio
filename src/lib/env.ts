// Leitura sob demanda (getters): variáveis só existem no servidor e nunca vão para o navegador.
const e = (k: string, d = "") => process.env[k] || d;
export const env = {
  get appUrl() { const v = process.env.VERCEL_PROJECT_PRODUCTION_URL; return e("APP_URL", v ? `https://${v}` : "http://localhost:3000").replace(/\/$/, ""); },
  get mpAccessToken() { return e("MP_ACCESS_TOKEN"); },
  get mpWebhookSecret() { return e("MP_WEBHOOK_SECRET"); },
  get smtpHost() { return e("SMTP_HOST"); },
  get smtpPort() { return Number(e("SMTP_PORT", "587")); },
  get smtpUser() { return e("SMTP_USER"); },
  get smtpPass() { return e("SMTP_PASS"); },
  get mailFrom() { return e("MAIL_FROM"); },
  get isProd() { return process.env.NODE_ENV === "production"; },
};
export const mpConfigured = () => Boolean(env.mpAccessToken);
