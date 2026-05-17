import { transporter } from "./mailer";

export async function sendAnnouncementEmail({
  to,
  recipientName,
  announcementTitle,
  announcementBodyHtml,
  courseTitle = "AYUS",
  postedBy,
  senderRole = "Admin",
}: {
  to: string;
  recipientName: string;
  announcementTitle: string;
  announcementBodyHtml: string;
  courseTitle?: string;
  postedBy: string;
  senderRole?: "Admin" | "Head";
}) {
  const loginUrl = `https://ayus-system-production.up.railway.app/login`;

  const roleLabel = senderRole === "Head" ? "Course Head" : "Administrator";
  const bannerNote = senderRole === "Head" ? ` · Posted by Course Head` : "";

  await transporter.sendMail({
    from: `"AYUS - Pampanga State University" <${process.env.GMAIL_USER}>`,
    to,
    subject: `New Announcement: ${announcementTitle}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
                                 alt="PSU Logo" width="60" height="60"
                                 style="display:block;border-radius:4px;background:#fff;padding:4px;">
                          </td>
                          <td style="vertical-align:middle;padding-left:14px;">
                            <p style="margin:0;font-size:15px;font-weight:700;color:#ffffff;">Pampanga State University</p>
                            <p style="margin:3px 0 0;font-size:12px;color:rgba(255,255,255,0.85);">Mexico Campus</p>
                          </td>
                          <td style="vertical-align:middle;text-align:right;">
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
                        📢 New Announcement · ${courseTitle}${bannerNote}
                      </p>
                    </td>
                  </tr>

                  <!-- CONTENT -->
                  <tr>
                    <td style="padding:28px 24px 24px;">
                      <p style="margin:0 0 2px;font-size:13px;color:#6b7280;">Hi, ${recipientName}!</p>
                      <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#1a1a1a;">${announcementTitle}</p>
                      <p style="margin:0 0 20px;font-size:12px;color:#999;">Posted by ${postedBy} &mdash; <span style="color:#7b1113;font-weight:600;">${roleLabel}</span></p>

                      <div style="font-size:14px;color:#374151;line-height:1.7;border-left:4px solid #7b1113;padding-left:16px;">
                        ${announcementBodyHtml}
                      </div>

                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
                        <tr>
                          <td>
                            <a href="${loginUrl}"
                               style="display:inline-block;background:#7b1113;color:#ffffff;padding:12px 24px;border-radius:4px;font-size:14px;font-weight:600;text-decoration:none;">
                              View in AYUS →
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- FOOTER -->
                  <tr>
                    <td style="background:#7b1113;padding:24px 20px;text-align:center;">
                      <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.5px;">
                        Pampanga State University - Mexico Campus
                      </p>
                      <p style="margin:0 0 4px;font-size:12px;color:#ffffff;">San Juan, Mexico, Pampanga</p>
                      <p style="margin:0 0 14px;font-size:12px;">
                        <a href="mailto:dhvsu@psu.edu.ph" style="color:#ffffff;text-decoration:none;">dhvsu@psu.edu.ph</a>
                      </p>
                      <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.8);">
                        This is an automated message. Please do not reply to this email.
                      </p>
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