import { prisma } from "@/lib/prisma";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** PALITAN ang laman nito ng existing mong email sender (yung gamit sa sign-email ng guidance log). */
export async function sendMail(opts: { to: string; subject: string; html: string }) {
  console.log("[MAIL]", opts.to, opts.subject); // placeholder
}

const fmt = (d: Date) =>
  d.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });

const base = () => process.env.NEXTAUTH_URL ?? "http://localhost:3000";

type R = {
  id: string; courseId: string; name: string; email: string | null; activityType: string;
  startAt: Date; endAt: Date; participantCount: number;
  status?: string; facilityType?: string | null; facilityNo?: string | null; facilityOther?: string | null;
  disapprovalReason?: string | null;
  requestToken?: string | null;
  csmToken?: string | null;
};

export async function notifyStaffNewRequest(r: R) {
  const staff = await prisma.courseEnrollment.findMany({
    where: { courseId: r.courseId, OR: [{ courseRole: { contains: "Head" } }, { courseRole: { contains: "Staff" } }] },
    select: { user: { select: { email: true } } },
  });
  const emails = [...new Set(staff.map(s => s.user.email).filter(Boolean))];
  await Promise.all(emails.map(to => sendMail({
    to,
    subject: `New facility reservation request: ${r.name}`,
    html: `<p><b>${esc(r.name)}</b> submitted a Library Facilities reservation request.</p>
           <p>${esc(r.activityType)}<br>${fmt(r.startAt)} – ${fmt(r.endAt)}<br>${r.participantCount} participants</p>
           <p>Open the course's Facility reservations tab to review the request letter and approve or disapprove.</p>`,
  })));
}

export async function sendReceivedEmail(r: R) {
  if (!r.email) return;
  await sendMail({
    to: r.email,
    subject: "We received your library facility reservation request",
    html: `<p>Hi ${esc(r.name)},</p>
           <p>Your request for <b>${esc(r.activityType)}</b> on ${fmt(r.startAt)} – ${fmt(r.endAt)} has been received.
           You will get another email once it is approved or disapproved.</p>
           <p style="color:#6b7280;font-size:12px">Reservations are first come, first served.</p>`,
  });
}

export async function sendDecisionEmail(r: R) {
  if (!r.email) return;
  const approved = r.status === "APPROVED";
  const facility =
    r.facilityType === "DISCUSSION" ? `Discussion Room ${r.facilityNo ?? ""}`
    : r.facilityType === "OTHER" ? (r.facilityOther ?? "Other facility")
    : "Audio-Visual Room";
  await sendMail({
    to: r.email,
    subject: approved ? "Your library facility reservation is approved" : "Your library facility reservation was disapproved",
    html: approved
      ? `<p>Hi ${esc(r.name)},</p><p>Your reservation is <b>approved</b>.</p>
         <p>${esc(facility)}<br>${fmt(r.startAt)} – ${fmt(r.endAt)}</p>
         ${r.requestToken ? `<p><a href="${base()}/reserve/slip/${r.requestToken}"><b>Open your reservation slip</b></a><br>
         Show the QR code on the slip to the librarian when you arrive. You can also cancel from that page.</p>` : ""}
         <p><b>Your approved Library Facilities Reservation Form is ready.</b> You may claim it at the library.</p>
         <p>Please arrive on time on the day of your reservation. It may be cancelled after a 15-minute grace period.</p>`
      : `<p>Hi ${esc(r.name)},</p><p>Your reservation was <b>disapproved</b>.</p>
         <p>Reason: ${esc(r.disapprovalReason)}</p>`,
  });
}
export async function sendCsmEmail(r: R) {
  if (!r.email || !r.csmToken) return;
  await sendMail({
    to: r.email,
    subject: "Please rate your library facility experience",
    html: `<p>Hi ${esc(r.name)},</p>
           <p>Thank you for using the library facilities for <b>${esc(r.activityType)}</b>.
           Please take a minute to answer our Client Satisfaction Measurement form.</p>
           <p><a href="${base()}/csm/${r.csmToken}"><b>Answer the CSM form</b></a></p>`,
  });
}