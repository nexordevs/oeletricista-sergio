// Verificação antes do build na Vercel: mensagem clara se o banco não estiver conectado.
const missing = ["DATABASE_URL", "DATABASE_URL_UNPOOLED"].filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`\n❌ Falta configurar: ${missing.join(", ")}\n` +
    "   Na Vercel: abra o projeto > Storage > Create Database > Neon (Postgres) > Connect.\n" +
    "   Isso cria as variáveis automaticamente. Depois faça Redeploy.\n");
  process.exit(1);
}
if (!process.env.ADMIN_EMAIL) console.warn("⚠️  ADMIN_EMAIL/ADMIN_PASSWORD não definidos: nenhum administrador será criado neste deploy.");
