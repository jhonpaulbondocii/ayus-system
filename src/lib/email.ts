// src/lib/email.ts

import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/* ─────────────────────────────────────────────────────────────────────────────
   WELCOME EMAIL
───────────────────────────────────────────────────────────────────────────── */
export async function sendWelcomeEmail({
  to,
  name,
  email,
  password,
}: {
  to: string;
  name: string;
  email: string;
  password: string;
}) {
  const loginUrl = `https://ayus-system-production.up.railway.app/login`;

  await transporter.sendMail({
    from: `"AYUS - Pampanga State University" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Welcome to AYUS - Pampanga State University Mexico Campus",
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>AYUS - Welcome</title>
        </head>
        <body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',sans-serif;">

          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f5;">
            <tr>
              <td align="center" style="padding:20px 0;">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;">

                  <!-- HEADER -->
                  <tr>
                    <td style="background:#7b1113;padding:20px 24px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td width="68" style="vertical-align:middle;">
                            <img src="https://dhvsu.edu.ph/images/VPAA/VPAA%20Logos/Campuses/Mexico%20Campus%20LOGO.png"
                                 alt="PSU Logo"
                                 width="60" height="60"
                                 style="display:block;border-radius:4px;background:#fff;padding:4px;width:60px;height:60px;">
                          </td>
                          <td style="vertical-align:middle;padding-left:14px;">
                            <p style="margin:0;font-size:15px;font-weight:700;color:#ffffff;line-height:1.3;">Pampanga State University</p>
                            <p style="margin:3px 0 0;font-size:12px;color:rgba(255,255,255,0.85);">Mexico Campus</p>
                          </td>
                          <td style="vertical-align:middle;text-align:right;padding-left:12px;">
                            <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:1px;">AYUS</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- CONTENT -->
                  <tr>
                    <td style="padding:32px 24px 28px;">

                      <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#1a1a1a;">Good day, ${name}</p>

                      <p style="margin:0 0 28px;font-size:14px;color:#555555;line-height:1.6;">
                        Congratulations! Your AYUS account at Pampanga State University - Mexico Campus has been successfully created. Your login credentials are ready below. Please log in and change your password immediately.
                      </p>

                      <!-- Credentials Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0"
                             style="background:#f9f9f9;border-left:4px solid #7b1113;margin-bottom:24px;">
                        <tr>
                          <td style="padding:20px 24px;">
                            <p style="margin:0 0 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#999999;">Account Details</p>

                            <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#999999;">Email Address</p>
                            <p style="margin:0 0 18px;font-size:14px;font-weight:700;color:#1a1a1a;word-break:break-all;">${email}</p>

                            <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#999999;">Temporary Password</p>
                            <p style="margin:0;font-size:14px;font-weight:700;color:#1a1a1a;word-break:break-all;">${password}</p>
                          </td>
                        </tr>
                      </table>

                      <!-- Login Button -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td>
                            <a href="${loginUrl}"
                               style="display:block;background:#7b1113;color:#ffffff;padding:14px 24px;border-radius:4px;font-size:14px;font-weight:600;text-decoration:none;text-align:center;">
                              Login to AYUS
                            </a>
                          </td>
                        </tr>
                      </table>

                    </td>
                  </tr>

                  <!-- FOOTER -->
                  <tr>
                    <td style="background:#7b1113;padding:24px 20px;text-align:center;">
                      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.5px;">Pampanga State University - Mexico Campus</p>
                      <p style="margin:0 0 4px;font-size:12px;color:#ffffff;">San Juan, Mexico, Pampanga</p>
                      <p style="margin:0 0 4px;font-size:12px;">
                        <a href="mailto:dhvsu@psu.edu.ph" style="color:#ffffff;text-decoration:none;">dhvsu@psu.edu.ph</a>
                      </p>
                      <p style="margin:0 0 14px;font-size:12px;">
                        <a href="https://dhvsu.edu.ph" style="color:#ffffff;text-decoration:none;">https://dhvsu.edu.ph</a>
                      </p>
                      <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.8);">This is an automated message. Please do not reply to this email.</p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>

        </body>
      </html>
    `,
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
   GRADE EMAIL
───────────────────────────────────────────────────────────────────────────── */

function getLetterGrade(pct: number): string {
  if (pct >= 93) return "A";
  if (pct >= 90) return "A-";
  if (pct >= 87) return "B+";
  if (pct >= 83) return "B";
  if (pct >= 80) return "B-";
  if (pct >= 77) return "C+";
  if (pct >= 73) return "C";
  if (pct >= 70) return "C-";
  if (pct >= 67) return "D+";
  if (pct >= 60) return "D";
  return "F";
}

function getGradeColor(pct: number): string {
  if (pct >= 90) return "#15803d";
  if (pct >= 70) return "#b45309";
  if (pct >= 50) return "#c2410c";
  return "#b91c1c";
}

export async function sendGradeEmail({
  to,
  name,
  courseName,
  assignmentTitle,
  score,
  maxPoints,
  feedback,
  gradedBy,
  senderRole = "Admin",
}: {
  to: string;
  name: string;
  courseName: string;
  assignmentTitle: string;
  score: number;
  maxPoints: number;
  feedback?: string | null;
  gradedBy?: string;
  senderRole?: "Admin" | "Head";
}) {
  const percentage  = maxPoints > 0 ? Math.round((score / maxPoints) * 100) : 0;
  const letterGrade = getLetterGrade(percentage);
  const gradeColor  = getGradeColor(percentage);
  const loginUrl    = `https://ayus-system-production.up.railway.app/login`;

  const roleLabel = senderRole === "Head" ? "Course Head" : "Administrator";

  const gradedByLine =
    gradedBy
      ? `<p style="margin:0 0 20px;font-size:12px;color:#999;">Graded by ${gradedBy} &mdash; <span style="color:#7b1113;font-weight:600;">${roleLabel}</span></p>`
      : "";

  const feedbackBlock =
    feedback && feedback.trim().length > 0
      ? `
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:#f0f9ff;border-left:4px solid #0891b2;margin-bottom:24px;">
          <tr>
            <td style="padding:16px 20px;">
              <p style="margin:0 0 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#0891b2;">
                Instructor Feedback
              </p>
              <p style="margin:0;font-size:13px;color:#1e3a5f;line-height:1.6;">${feedback.trim()}</p>
            </td>
          </tr>
        </table>`
      : "";

  await transporter.sendMail({
    from: `"AYUS - Pampanga State University" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Grade Released: ${assignmentTitle} — ${courseName}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>AYUS - Grade Released</title>
        </head>
        <body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',sans-serif;">

          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f5;">
            <tr>
              <td align="center" style="padding:20px 0;">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;">

                  <!-- HEADER -->
                  <tr>
                    <td style="background:#7b1113;padding:20px 24px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td width="68" style="vertical-align:middle;">
                            <img src="https://dhvsu.edu.ph/images/VPAA/VPAA%20Logos/Campuses/Mexico%20Campus%20LOGO.png"
                                 alt="PSU Logo"
                                 width="60" height="60"
                                 style="display:block;border-radius:4px;background:#fff;padding:4px;width:60px;height:60px;">
                          </td>
                          <td style="vertical-align:middle;padding-left:14px;">
                            <p style="margin:0;font-size:15px;font-weight:700;color:#ffffff;line-height:1.3;">Pampanga State University</p>
                            <p style="margin:3px 0 0;font-size:12px;color:rgba(255,255,255,0.85);">Mexico Campus</p>
                          </td>
                          <td style="vertical-align:middle;text-align:right;padding-left:12px;">
                            <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:1px;">AYUS</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- CONTENT -->
                  <tr>
                    <td style="padding:32px 24px 28px;">

                      <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#1a1a1a;">Good day, ${name}</p>

                      <p style="margin:0 0 8px;font-size:14px;color:#555555;line-height:1.6;">
                        Your grade for <strong>${assignmentTitle}</strong> in <strong>${courseName}</strong> has been released.
                      </p>

                      ${gradedByLine}

                      <!-- Grade Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0"
                             style="background:#f9f9f9;border-left:4px solid #7b1113;margin-bottom:24px;">
                        <tr>
                          <td style="padding:20px 24px;">
                            <p style="margin:0 0 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#999999;">Grade Details</p>

                            <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#999999;">Course</p>
                            <p style="margin:0 0 18px;font-size:14px;font-weight:700;color:#1a1a1a;">${courseName}</p>

                            <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#999999;">Assignment</p>
                            <p style="margin:0 0 18px;font-size:14px;font-weight:700;color:#1a1a1a;">${assignmentTitle}</p>

                            <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#999999;">Score</p>

                            <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:0;">
                              <tr>
                                <td style="vertical-align:middle;padding-right:16px;">
                                  <p style="margin:0;font-size:36px;font-weight:800;color:${gradeColor};line-height:1;">
                                    ${score}
                                    <span style="font-size:18px;font-weight:600;color:#999999;">/ ${maxPoints}</span>
                                  </p>
                                </td>
                                <td style="vertical-align:middle;">
                                  <table cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                      <td style="padding-right:6px;">
                                        <span style="display:inline-block;background:${gradeColor}18;color:${gradeColor};font-size:13px;font-weight:800;padding:4px 12px;border-radius:20px;border:1px solid ${gradeColor}40;">
                                          ${percentage}%
                                        </span>
                                      </td>
                                      <td>
                                        <span style="display:inline-block;background:${gradeColor}18;color:${gradeColor};font-size:13px;font-weight:800;padding:4px 12px;border-radius:20px;border:1px solid ${gradeColor}40;">
                                          ${letterGrade}
                                        </span>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>

                          </td>
                        </tr>
                      </table>

                      ${feedbackBlock}

                      <!-- Login Button -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td>
                            <a href="${loginUrl}"
                               style="display:block;background:#7b1113;color:#ffffff;padding:14px 24px;border-radius:4px;font-size:14px;font-weight:600;text-decoration:none;text-align:center;">
                              View in AYUS
                            </a>
                          </td>
                        </tr>
                      </table>

                    </td>
                  </tr>

                  <!-- FOOTER -->
                  <tr>
                    <td style="background:#7b1113;padding:24px 20px;text-align:center;">
                      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.5px;">Pampanga State University - Mexico Campus</p>
                      <p style="margin:0 0 4px;font-size:12px;color:#ffffff;">San Juan, Mexico, Pampanga</p>
                      <p style="margin:0 0 4px;font-size:12px;">
                        <a href="mailto:dhvsu@psu.edu.ph" style="color:#ffffff;text-decoration:none;">dhvsu@psu.edu.ph</a>
                      </p>
                      <p style="margin:0 0 14px;font-size:12px;">
                        <a href="https://dhvsu.edu.ph" style="color:#ffffff;text-decoration:none;">https://dhvsu.edu.ph</a>
                      </p>
                      <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.8);">This is an automated message. Please do not reply to this email.</p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>

        </body>
      </html>
    `,
  });
}