// src/lib/sendCourseEnrollmentEmail.ts

import { transporter } from "./mailer";

export async function sendCourseEnrollmentEmail({
  to,
  recipientName,
  courseName,
  role,
  enrolledBy,
  senderRole = "Admin",
}: {
  to: string;
  recipientName: string;
  courseName: string;
  role: string; // "Staff" | "Head"
  enrolledBy: string;
  senderRole?: "Admin" | "Head";
}) {
  const loginUrl = `https://ayus-system-production.up.railway.app/login`;

  const roleLabel = role === "Head" ? "Head" : "Staff";
  const enrollerLabel = senderRole === "Head" ? "Course Head" : "Administrator";

  const roleDescription =
    roleLabel === "Head"
      ? "As <strong>Head</strong>, you have elevated access and may assist in managing course content, members, and settings."
      : "As a <strong>Staff</strong> member, you have access to course materials and collaborative tools for this course.";

  const bannerNote = senderRole === "Head" ? ` · Added by Course Head` : "";

  await transporter.sendMail({
    from: `"AYUS - Pampanga State University" <${process.env.GMAIL_USER}>`,
    to,
    subject: `You've been added to ${courseName}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>AYUS - Course Enrollment</title>
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

                  <!-- BANNER LABEL -->
                  <tr>
                    <td style="background:#f3f3f3;padding:10px 24px;border-bottom:1px solid #e5e5e5;">
                      <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#7b1113;">
                        🎓 Course Enrollment Notification${bannerNote}
                      </p>
                    </td>
                  </tr>

                  <!-- CONTENT -->
                  <tr>
                    <td style="padding:32px 24px 28px;">

                      <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#1a1a1a;">Good day, ${recipientName}</p>

                      <p style="margin:0 0 28px;font-size:14px;color:#555555;line-height:1.6;">
                        You have been added to a course in AYUS by <strong>${enrolledBy}</strong>
                        (<span style="color:#7b1113;font-weight:600;">${enrollerLabel}</span>).
                        Your enrollment details are shown below.
                      </p>

                      <!-- Enrollment Details Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0"
                             style="background:#f9f9f9;border-left:4px solid #7b1113;margin-bottom:24px;">
                        <tr>
                          <td style="padding:20px 24px;">
                            <p style="margin:0 0 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#999999;">Enrollment Details</p>

                            <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#999999;">Course</p>
                            <p style="margin:0 0 18px;font-size:15px;font-weight:700;color:#1a1a1a;">${courseName}</p>

                            <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#999999;">Your Role</p>
                            <p style="margin:0 0 18px;">
                              <span style="display:inline-block;background:#7b1113;color:#ffffff;font-size:12px;font-weight:700;padding:4px 14px;border-radius:20px;letter-spacing:0.5px;">
                                ${roleLabel}
                              </span>
                            </p>

                            <p style="margin:0;font-size:13px;color:#555555;line-height:1.6;">${roleDescription}</p>
                          </td>
                        </tr>
                      </table>

                      <!-- Login Button -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td>
                            <a href="${loginUrl}"
                               style="display:block;background:#7b1113;color:#ffffff;padding:14px 24px;border-radius:4px;font-size:14px;font-weight:600;text-decoration:none;text-align:center;">
                              Go to AYUS →
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