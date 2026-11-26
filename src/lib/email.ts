import nodemailer from "nodemailer";

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

export function getSmtpConfig(): SmtpConfig | null {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!user || !pass) return null;

  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const parsedPort = Number(process.env.SMTP_PORT || "465");
  const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 465;
  const from = process.env.SMTP_FROM?.trim() || `Aizuchi.AI <${user}>`;

  return { host, port, user, pass, from };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendPasswordResetOtpEmail({
  to,
  otp,
}: {
  to: string;
  otp: string;
}) {
  const config = getSmtpConfig();
  if (!config) {
    throw new Error("Personal SMTP email is not configured (SMTP_USER / SMTP_PASS).");
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  const safeOtp = escapeHtml(otp);
  const safeTo = escapeHtml(to);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:#f7f8fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1b1c20;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border:1px solid #eceef0;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(6,22,56,0.06);">
          <tr>
            <td style="background-color:#061638;padding:24px 32px;">
              <div style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">Aizuchi.AI</div>
              <div style="font-size:12px;color:#a4cbff;margin-top:4px;">AI Japanese Interview Trainer</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#061638;">Password Reset Verification Code</h1>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#4b4e58;">
                We received a request to reset the password for <strong>${safeTo}</strong>. Enter the verification code below into the password reset form on Aizuchi.AI:
              </p>
              <div style="margin:24px 0;padding:20px;background-color:#f3f4f6;border:1px dashed #b7c6ee;border-radius:12px;text-align:center;">
                <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#4b4e58;margin-bottom:8px;">Verification Code</div>
                <div style="font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:700;letter-spacing:0.22em;color:#061638;">${safeOtp}</div>
              </div>
              <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#4b4e58;">
                This code expires shortly and can only be used once. For your security, do not share this code with anyone.
              </p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#81848c;">
                If you did not request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background-color:#f7f8fa;border-top:1px solid #eceef0;font-size:12px;color:#81848c;text-align:center;">
              Sent by Aizuchi.AI
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  await transporter.sendMail({
    from: config.from,
    to,
    subject: "Aizuchi.AI — Password Reset Verification Code",
    text: `Your Aizuchi.AI password reset verification code is: ${otp}\n\nEnter this code in the password reset form on Aizuchi.AI to choose a new password. If you did not request this, you can safely ignore this email.`,
    html,
  });
}
