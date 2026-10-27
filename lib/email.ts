import nodemailer from "nodemailer";
import { readFile } from "node:fs/promises";
import path from "node:path";

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
};

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass || !Number.isFinite(port)) {
    throw new Error("SMTP is not configured.");
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure:
      process.env.SMTP_SECURE === "true" ||
      (process.env.SMTP_SECURE !== "false" && port === 465),
    auth: { user, pass },
  });

  return transporter;
}

export function isEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.EMAIL_FROM
  );
}

export async function sendAppEmail(message: EmailMessage) {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM is not configured.");

  // Attach the logo inside the email itself, so it shows even when the site address is not public
  // (localhost) and when the mail app blocks remote images. Falls back to the hosted logo.
  let html = message.html;
  let attachments: Array<Record<string, unknown>> = [...(message.attachments ?? [])];
  if (html && /\/logo\/Canuck-Motors\.png"/.test(html)) {
    try {
      const logo = await readFile(path.join(process.cwd(), "public", "logo", "Canuck-Motors.png"));
      html = html.replace(/src="[^"]*\/logo\/Canuck-Motors\.png"/, 'src="cid:cm-logo"');
      attachments = [{ filename: "canuck-motors.png", content: logo, contentType: "image/png", cid: "cm-logo", contentDisposition: "inline" }, ...attachments];
    } catch {
      /* keep the hosted logo link */
    }
  }

  const result = await getTransporter().sendMail({
    from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html,
    attachments: attachments as never,
    ...(process.env.EMAIL_REPLY_TO
      ? { replyTo: process.env.EMAIL_REPLY_TO }
      : {}),
  });

  return String(result.messageId || "");
}
