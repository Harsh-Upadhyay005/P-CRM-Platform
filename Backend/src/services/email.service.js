import SibApiV3Sdk from "sib-api-v3-sdk";
import { env } from "../config/env.js";

const client = SibApiV3Sdk.ApiClient.instance;
client.authentications["api-key"].apiKey = env.BREVO_API_KEY;

const transactionalEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const emailWrapper = (headerColor, headerContent, bodyContent) => `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

  <!-- Preheader (hidden preview text) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${headerContent.preheader}</div>

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2f7;padding:32px 16px;">
    <tr>
      <td align="center">

        <!-- Email card -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

          <!-- ── GOVERNMENT BADGE ── -->
          <tr>
            <td style="background-color:#1a3a6e;padding:10px 32px;text-align:center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align:center;">
                    <span style="display:inline-block;background-color:#f59e0b;color:#1a1a1a;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:4px 14px;border-radius:2px;">Government of India</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── HEADER ── -->
          <tr>
            <td style="background:${headerColor};padding:40px 32px 36px;text-align:center;">
              <!-- Emblem placeholder circle -->
              <div style="display:inline-block;width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,0.18);margin-bottom:16px;line-height:60px;font-size:28px;">🏛️</div>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:0.5px;">P-CRM Portal</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:13px;letter-spacing:1px;">Smart Political CRM — Citizen Grievance Management</p>
            </td>
          </tr>

          <!-- ── DIVIDER ── -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#f59e0b,#ef4444,#1a56db);"></td>
          </tr>

          <!-- ── BODY ── -->
          <tr>
            <td style="padding:40px 40px 32px;">
              ${bodyContent}
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="background-color:#1a3a6e;padding:28px 32px;text-align:center;">
              <p style="margin:0;color:#93c5fd;font-size:12px;line-height:1.6;">
                This is an automated message from the <strong style="color:#ffffff;">P-CRM Government Portal</strong>.<br/>
                Please do not reply to this email.
              </p>
              <p style="margin:12px 0 0;color:rgba(255,255,255,0.4);font-size:11px;">
                © ${new Date().getFullYear()} P-CRM Portal &nbsp;|&nbsp; All Rights Reserved
              </p>
            </td>
          </tr>

        </table>
        <!-- /Email card -->

      </td>
    </tr>
  </table>

</body>
</html>
`;

const verificationEmailBody = (fullName, url, expiryMinutes) => `
  <!-- Greeting -->
  <h2 style="margin:0 0 8px;color:#1a3a6e;font-size:22px;font-weight:700;">Verify Your Email Address</h2>
  <p style="margin:0 0 24px;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;padding-bottom:20px;">Account Activation Required</p>

  <p style="margin:0 0 8px;color:#374151;font-size:16px;">Dear <strong>${fullName}</strong>,</p>
  <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.7;">
    Welcome to the <strong>P-CRM Portal</strong>. Your staff account has been created successfully.
    To activate your account and gain access to the system, please verify your official email address.
  </p>

  <!-- CTA Button -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
    <tr>
      <td align="center">
        <a href="${url}"
           style="display:inline-block;background-color:#1a56db;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 44px;border-radius:8px;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(26,86,219,0.35);">
          ✔&nbsp;&nbsp;Verify Email Address
        </a>
      </td>
    </tr>
  </table>

  <!-- Warning box -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
    <tr>
      <td style="background-color:#fffbeb;border-left:4px solid #f59e0b;border-radius:6px;padding:16px 20px;">
        <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
          <strong>⏳ Expires in ${expiryMinutes} minutes.</strong>
          If you did not sign up for P-CRM, please disregard this email.
          Your account will not be activated without verification.
        </p>
      </td>
    </tr>
  </table>

  <!-- Fallback link -->
  <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
    Button not working? Copy and paste this link into your browser:<br/>
    <a href="${url}" style="color:#1a56db;word-break:break-all;">${url}</a>
  </p>
`;

const resetPasswordEmailBody = (fullName, url, expiryMinutes) => `
  <!-- Greeting -->
  <h2 style="margin:0 0 8px;color:#991b1b;font-size:22px;font-weight:700;">Password Reset Request</h2>
  <p style="margin:0 0 24px;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;padding-bottom:20px;">Security Notification — P-CRM Portal</p>

  <p style="margin:0 0 8px;color:#374151;font-size:16px;">Dear <strong>${fullName}</strong>,</p>
  <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.7;">
    We received a request to reset the password for your <strong>P-CRM Portal</strong> account.
    Click the button below to create a new password. If you did not make this request, no action is needed.
  </p>

  <!-- CTA Button -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
    <tr>
      <td align="center">
        <a href="${url}"
           style="display:inline-block;background-color:#dc2626;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 44px;border-radius:8px;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(220,38,38,0.35);">
          🔒&nbsp;&nbsp;Reset My Password
        </a>
      </td>
    </tr>
  </table>

  <!-- Danger box -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
    <tr>
      <td style="background-color:#fef2f2;border-left:4px solid #dc2626;border-radius:6px;padding:16px 20px;">
        <p style="margin:0;color:#7f1d1d;font-size:13px;line-height:1.6;">
          <strong>⚠️ Expires in ${expiryMinutes} minutes.</strong>
          If you did not request a password reset, please contact your system administrator immediately
          as your account may be at risk.
        </p>
      </td>
    </tr>
  </table>

  <!-- Info row -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
    <tr>
      <td style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:14px 20px;">
        <p style="margin:0;color:#64748b;font-size:12px;line-height:1.7;">
          <strong>For your security:</strong> This link can only be used once.
          After resetting, all active sessions will be logged out automatically.
        </p>
      </td>
    </tr>
  </table>

  <!-- Fallback link -->
  <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
    Button not working? Copy and paste this link into your browser:<br/>
    <a href="${url}" style="color:#dc2626;word-break:break-all;">${url}</a>
  </p>
`;

export const sendVerificationEmail = async (email, fullName, rawToken) => {
  const url = `${env.FRONTEND_URL}/verify-email?token=${rawToken}`;

  const html = emailWrapper(
    "linear-gradient(135deg, #1a56db 0%, #1e3a8a 100%)",
    { preheader: `Verify your P-CRM Portal email address, ${fullName}` },
    verificationEmailBody(fullName, url, env.EMAIL_VERIFICATION_EXPIRY_MINUTES),
  );

  try {
    await transactionalEmailApi.sendTransacEmail({
      sender: { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME },
      to: [{ email, name: fullName }],
      subject: "Verify Your Email Address — P-CRM Portal",
      htmlContent: html,
      textContent: `Dear ${fullName},\n\nVerify your P-CRM Portal email:\n${url}\n\nExpires in ${env.EMAIL_VERIFICATION_EXPIRY_MINUTES} minutes.\n\nP-CRM Portal`,
    });
    console.log(`[email] Verification email sent to ${email}`);
  } catch (error) {
    console.error("[email] Failed to send verification email:", error?.message);
    throw new Error("Failed to send verification email");
  }
};

export const sendResetPasswordEmail = async (email, fullName, rawToken) => {
  const url = `${env.FRONTEND_URL}/reset-password?token=${rawToken}`;

  const html = emailWrapper(
    "linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)",
    { preheader: `Password reset requested for your P-CRM Portal account` },
    resetPasswordEmailBody(fullName, url, env.RESET_PASSWORD_EXPIRY_MINUTES),
  );

  try {
    await transactionalEmailApi.sendTransacEmail({
      sender: { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME },
      to: [{ email, name: fullName }],
      subject: "Password Reset Request — P-CRM Portal",
      htmlContent: html,
      textContent: `Dear ${fullName},\n\nReset your P-CRM Portal password:\n${url}\n\nExpires in ${env.RESET_PASSWORD_EXPIRY_MINUTES} minutes.\n\nIf you did not request this, ignore this email.\n\nP-CRM Portal`,
    });
    console.log(`[email] Password reset email sent to ${email}`);
  } catch (error) {
    console.error(
      "[email] Failed to send password reset email:",
      error?.message,
    );
    throw new Error("Failed to send password reset email");
  }
};

const slaBreachEmailBody = (complaintTrackingId, departmentName, createdAt, slaHours) => `
  <h2 style="margin:0 0 8px;color:#7c2d12;font-size:22px;font-weight:700;">SLA Breach Alert</h2>
  <p style="margin:0 0 24px;color:#6b7280;font-size:13px;border-bottom:1px solid #e5e7eb;padding-bottom:20px;">Auto-Escalation Notification — P-CRM Portal</p>

  <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.7;">
    A complaint has exceeded its Service Level Agreement (SLA) window and has been <strong>automatically escalated</strong>.
  </p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
    <tr>
      <td style="background-color:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:20px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="color:#92400e;font-size:13px;padding:4px 0;"><strong>Tracking ID:</strong></td><td style="color:#1c1917;font-size:13px;padding:4px 0;">${complaintTrackingId}</td></tr>
          <tr><td style="color:#92400e;font-size:13px;padding:4px 0;"><strong>Department:</strong></td><td style="color:#1c1917;font-size:13px;padding:4px 0;">${departmentName}</td></tr>
          <tr><td style="color:#92400e;font-size:13px;padding:4px 0;"><strong>Filed On:</strong></td><td style="color:#1c1917;font-size:13px;padding:4px 0;">${new Date(createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td></tr>
          <tr><td style="color:#92400e;font-size:13px;padding:4px 0;"><strong>SLA Window:</strong></td><td style="color:#dc2626;font-size:13px;font-weight:700;padding:4px 0;">${slaHours} hours (BREACHED)</td></tr>
        </table>
      </td>
    </tr>
  </table>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
    <tr>
      <td style="background-color:#fef2f2;border-left:4px solid #dc2626;border-radius:6px;padding:16px 20px;">
        <p style="margin:0;color:#7f1d1d;font-size:13px;line-height:1.6;">
          <strong>⚠️ Immediate Action Required.</strong> Please review this complaint and take necessary action to resolve it as soon as possible.
        </p>
      </td>
    </tr>
  </table>
`;

export const sendSlaBreachEmail = async (recipients, complaintTrackingId, departmentName, createdAt, slaHours) => {
  if (!recipients || recipients.length === 0) return;

  const html = emailWrapper(
    "linear-gradient(135deg, #dc2626 0%, #7c2d12 100%)",
    { preheader: `SLA Breach Alert — Complaint ${complaintTrackingId} auto-escalated` },
    slaBreachEmailBody(complaintTrackingId, departmentName, createdAt, slaHours),
  );

  const subject = `SLA Breach — Complaint ${complaintTrackingId} Auto-Escalated`;

  for (const { email, name } of recipients) {
    try {
      await transactionalEmailApi.sendTransacEmail({
        sender:      { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME },
        to:          [{ email, name }],
        subject,
        htmlContent: html,
        textContent: `SLA Breach Alert\n\nComplaint ${complaintTrackingId} has exceeded its ${slaHours}-hour SLA window and has been auto-escalated.\n\nDepartment: ${departmentName}\nFiled On: ${new Date(createdAt).toISOString()}\n\nPlease take immediate action.\n\nP-CRM Portal`,
      });
    } catch (err) {
      console.error(`[email] Failed to send SLA breach email to ${email}:`, err?.message);
    }
  }
};
