import { Router } from "express";
import { Resend } from "resend";

const router = Router();

function getResend() {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) return null;
  return { resend: new Resend(key), from };
}

router.post("/transfer-emails/submitted", async (req, res) => {
  const { studentEmail, studentName, fromActivity, toActivity, reason } = req.body as {
    studentEmail: string;
    studentName: string;
    fromActivity: string;
    toActivity: string;
    reason?: string;
  };

  if (!studentEmail || !studentName || !fromActivity || !toActivity) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const cfg = getResend();
  if (!cfg) {
    res.status(503).json({ error: "Resend credentials not configured" });
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const reasonHtml = reason ? `<p style="margin:8px 0 0;font-size:13px;color:#64748b;font-style:italic;">"${reason}"</p>` : "";

  const studentHtml = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,sans-serif;">
<div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
  <div style="background:#0f172a;padding:24px 28px;">
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:.08em;">YSA Skills Hub · Ojodu Stake</p>
    <h1 style="margin:6px 0 0;font-size:20px;font-weight:700;color:#fff;">Transfer Request Received</h1>
  </div>
  <div style="padding:24px 28px;">
    <p style="margin:0 0 12px;font-size:14px;color:#475569;">Hi <strong>${studentName}</strong>,</p>
    <p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.6;">We've received your request to transfer from <strong>${fromActivity}</strong> to <strong>${toActivity}</strong>. An admin will review it shortly.</p>
    ${reasonHtml}
    <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;">— The YSA Skills Hub Team</p>
  </div>
  <div style="background:#f8fafc;padding:14px 28px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">Ojodu Stake · Saturday Skills Program</p>
  </div>
</div></body></html>`;

  const adminHtml = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,sans-serif;">
<div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
  <div style="background:#f59e0b;padding:24px 28px;">
    <p style="margin:0;font-size:11px;color:rgba(0,0,0,0.5);text-transform:uppercase;letter-spacing:.08em;">Admin Alert</p>
    <h1 style="margin:6px 0 0;font-size:20px;font-weight:700;color:#0f172a;">New Transfer Request</h1>
  </div>
  <div style="padding:24px 28px;">
    <p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>Student:</strong> ${studentName} (${studentEmail})</p>
    <p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>From:</strong> ${fromActivity}</p>
    <p style="margin:0 0 8px;font-size:14px;color:#334155;"><strong>To:</strong> ${toActivity}</p>
    ${reason ? `<p style="margin:0;font-size:14px;color:#334155;"><strong>Reason:</strong> ${reason}</p>` : ""}
  </div>
</div></body></html>`;

  const sends: Promise<void>[] = [];

  sends.push(
    cfg.resend.emails.send({ from: cfg.from, to: studentEmail, subject: "Transfer Request Received – YSA Skills Hub", html: studentHtml })
      .then(({ error }) => { if (error) req.log.warn({ error }, "Student confirmation email failed"); })
  );

  if (adminEmail) {
    sends.push(
      cfg.resend.emails.send({ from: cfg.from, to: adminEmail, subject: `New Transfer Request: ${studentName}`, html: adminHtml })
        .then(({ error }) => { if (error) req.log.warn({ error }, "Admin notification email failed"); })
    );
  }

  await Promise.all(sends);
  res.json({ ok: true });
});

router.post("/transfer-emails/decision", async (req, res) => {
  const { studentEmail, studentName, fromActivity, toActivity, decision, note } = req.body as {
    studentEmail: string;
    studentName: string;
    fromActivity: string;
    toActivity: string;
    decision: "approved" | "rejected";
    note?: string;
  };

  if (!studentEmail || !studentName || !decision) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const cfg = getResend();
  if (!cfg) {
    res.status(503).json({ error: "Resend credentials not configured" });
    return;
  }

  const approved = decision === "approved";
  const headerBg = approved ? "#10b981" : "#ef4444";
  const subject = approved
    ? `Transfer Approved – Welcome to ${toActivity}!`
    : `Transfer Request Update – YSA Skills Hub`;

  const bodyContent = approved
    ? `<p style="margin:0 0 12px;font-size:14px;color:#475569;">Hi <strong>${studentName}</strong>,</p>
       <p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">Great news! Your transfer from <strong>${fromActivity}</strong> to <strong>${toActivity}</strong> has been <strong>approved</strong>. Welcome to your new class!</p>`
    : `<p style="margin:0 0 12px;font-size:14px;color:#475569;">Hi <strong>${studentName}</strong>,</p>
       <p style="margin:0 0 12px;font-size:14px;color:#334155;line-height:1.6;">Unfortunately your request to transfer to <strong>${toActivity}</strong> was not approved at this time.</p>
       ${note ? `<p style="margin:0;font-size:13px;color:#64748b;font-style:italic;">Admin note: "${note}"</p>` : ""}`;

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,sans-serif;">
<div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
  <div style="background:${headerBg};padding:24px 28px;">
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:.08em;">YSA Skills Hub · Ojodu Stake</p>
    <h1 style="margin:6px 0 0;font-size:20px;font-weight:700;color:#fff;">${approved ? "Transfer Approved!" : "Transfer Request Update"}</h1>
  </div>
  <div style="padding:24px 28px;">${bodyContent}
    <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;">— The YSA Skills Hub Team</p>
  </div>
  <div style="background:#f8fafc;padding:14px 28px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">Ojodu Stake · Saturday Skills Program</p>
  </div>
</div></body></html>`;

  const { error } = await cfg.resend.emails.send({ from: cfg.from, to: studentEmail, subject, html });
  if (error) req.log.warn({ error }, "Decision email failed");
  res.json({ ok: true });
});

export default router;
