import "server-only";
import nodemailer from "nodemailer";
import { env } from "./env";

export const mailConfigured = () => Boolean(env.smtpHost && env.smtpUser && env.smtpPass && env.mailFrom);

export async function sendMail(to: string, subject: string, html: string) {
  if (!mailConfigured()) {
    if (env.isProd) throw new Error("SMTP não configurado (SMTP_HOST, SMTP_USER, SMTP_PASS, MAIL_FROM).");
    console.log(`\n[e-mail DEV] Para: ${to}\nAssunto: ${subject}\n${html.replace(/<[^>]+>/g, " ")}\n`);
    return;
  }
  const t = nodemailer.createTransport({ host: env.smtpHost, port: env.smtpPort, secure: env.smtpPort === 465, auth: { user: env.smtpUser, pass: env.smtpPass } });
  await t.sendMail({ from: env.mailFrom, to, subject, html });
}
