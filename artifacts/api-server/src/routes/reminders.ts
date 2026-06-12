import { Router } from "express";
import { Resend } from "resend";
import twilio from "twilio";

const router = Router();

interface Recipient {
  name: string;
  email?: string;
  phone?: string;
}

interface SendReminderBody {
  title: string;
  message: string;
  channel: "email" | "whatsapp" | "both";
  recipients: Recipient[];
}

interface DeliveryResult {
  emailCount: number;
  whatsappCount: number;
  skipped: number;
  errors: string[];
}

function normalizePhone(phone: string): string {
  if (phone.startsWith("whatsapp:")) return phone;
  if (phone.startsWith("+")) return `whatsapp:${phone}`;
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `whatsapp:+234${digits.slice(1)}`;
  return `whatsapp:+${digits}`;
}

function isSandboxOptInError(err: unknown): boolean {
  const e = err as { code?: number; status?: number; message?: string };
  if (e.code === 63007) return true;
  const msg = (e.message ?? "").toLowerCase();
  return (
    msg.includes("unregistered") ||
    msg.includes("opt-in") ||
    msg.includes("opted in") ||
    msg.includes("sandbox") ||
    msg.includes("channel:whatsapp") ||
    msg.includes("not a whatsapp user")
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmailHtml(name: string, title: string, message: string): string {
  const safeMsg = escapeHtml(message).replace(/\n/g, "<br>");
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
    <div style="background:#0f172a;padding:24px 28px;">
      <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:.08em;">YSA Skills Hub · Ojodu Stake</p>
      <h1 style="margin:6px 0 0;font-size:20px;font-weight:700;color:#fff;">${escapeHtml(title)}</h1>
    </div>
    <div style="padding:24px 28px;">
      <p style="margin:0 0 12px;font-size:14px;color:#475569;">Hi <strong>${escapeHtml(name)}</strong>,</p>
      <p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.6;">${safeMsg}</p>
      <p style="margin:0;font-size:13px;color:#94a3b8;">— The YSA Skills Hub Team</p>
    </div>
    <div style="background:#f8fafc;padding:14px 28px;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:11px;color:#94a3b8;">Ojodu Stake · Saturday Skills Program</p>
    </div>
  </div>
</body>
</html>`;
}

router.post("/reminders/send", async (req, res) => {
  const { title, message, channel, recipients } = req.body as SendReminderBody;

  req.log.info({ channel, recipientCount: Array.isArray(recipients) ? recipients.length : 0 }, "Reminder dispatch requested");

  if (!title || !message || !channel || !Array.isArray(recipients)) {
    req.log.warn("Reminder dispatch rejected: missing required fields");
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  if (recipients.length === 0) {
    req.log.warn("Reminder dispatch rejected: no recipients");
    res.status(400).json({ error: "No recipients found for this target" });
    return;
  }

  const result: DeliveryResult = { emailCount: 0, whatsappCount: 0, skipped: 0, errors: [] };

  // ── Email ──────────────────────────────────────────────────────────────────
  if (channel === "email" || channel === "both") {
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!resendKey || !fromEmail) {
      result.errors.push("Email not configured: RESEND_API_KEY or RESEND_FROM_EMAIL missing on server");
    } else {
      const resend = new Resend(resendKey);
      const emailRecipients = recipients.filter((r) => r.email);
      const noEmail = recipients.filter((r) => !r.email);

      for (const recipient of noEmail) {
        result.errors.push(`${recipient.name}: no email address on file — skipped`);
        result.skipped++;
      }

      for (const recipient of emailRecipients) {
        // Resend SDK returns {data, error} — does NOT throw on API errors
        const { error } = await resend.emails.send({
          from: fromEmail,
          to: recipient.email!,
          subject: title,
          html: buildEmailHtml(recipient.name, title, message),
        });
        if (error) {
          const msg = (error as { message?: string }).message ?? JSON.stringify(error);
          req.log.warn({ email: recipient.email, error }, "Email send failed");
          result.errors.push(`${recipient.name} (${recipient.email}): ${msg}`);
        } else {
          result.emailCount++;
        }
      }
    }
  }

  // ── WhatsApp ───────────────────────────────────────────────────────────────
  if (channel === "whatsapp" || channel === "both") {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;
    if (!sid || !token || !from) {
      result.errors.push("WhatsApp not configured: Twilio credentials missing on server");
    } else {
      const client = twilio(sid, token);
      const waRecipients = recipients.filter((r) => r.phone);
      const noPhone = recipients.filter((r) => !r.phone);

      for (const recipient of noPhone) {
        result.errors.push(`${recipient.name}: no phone number on file — skipped`);
        result.skipped++;
      }

      for (const recipient of waRecipients) {
        const to = normalizePhone(recipient.phone!);
        try {
          await client.messages.create({
            from,
            to,
            body: `Hi ${recipient.name}!\n\n${message}\n\n— YSA Skills Hub, Ojodu Stake`,
          });
          result.whatsappCount++;
        } catch (err: unknown) {
          if (isSandboxOptInError(err)) {
            const phone = to.replace("whatsapp:", "");
            req.log.warn({ phone, recipient: recipient.name }, "WhatsApp sandbox opt-in required");
            result.errors.push(
              `${recipient.name} (${phone}): WhatsApp sandbox — must opt-in first by texting "join <sandbox-name>" to the Twilio number`
            );
          } else {
            const msg = err instanceof Error ? err.message : String(err);
            req.log.warn({ phone: to, error: msg }, "WhatsApp send failed");
            result.errors.push(`${recipient.name} (${to.replace("whatsapp:", "")}): ${msg}`);
          }
        }
      }
    }
  }

  req.log.info(
    { emailCount: result.emailCount, whatsappCount: result.whatsappCount, skipped: result.skipped, errors: result.errors.length },
    "Reminder dispatch complete"
  );
  res.json(result);
});

export default router;
