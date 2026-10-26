import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Only files from our own Cloudinary account may be proxied.
function isAllowedRemote(raw: string): boolean {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloud) return false;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  return u.protocol === "https:" && u.hostname === "res.cloudinary.com" && u.pathname.startsWith(`/${cloud}/`);
}

// Legacy submissions are stored as same-origin paths (e.g. /uploads/submissions/x.pdf).
// The resolved URL is compared by origin because the URL parser strips tabs and
// newlines, so a raw-string check alone can be bypassed ("/\t/evil.com").
function localTarget(raw: string, req: NextRequest): URL | null {
  if (!raw.startsWith("/")) return null;
  const target = new URL(raw, req.nextUrl.origin);
  return target.origin === req.nextUrl.origin ? target : null;
}

// Types the browser may render inline from our origin. Anything else (HTML,
// SVG, etc.) is sandboxed so uploaded content cannot run script as the app.
const INLINE_SAFE = /^(application\/pdf|image\/(png|jpe?g|gif|webp|avif|bmp))\b/i;

// Quotes and non-Latin-1 characters break the header, so send an ASCII
// fallback plus the RFC 5987 UTF-8 form.
function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]|["\\]/g, "_");
  const encoded = encodeURIComponent(filename).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `inline; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl.searchParams.get("url");
  const name = req.nextUrl.searchParams.get("name") ?? "file.pdf";
  const submitter = req.nextUrl.searchParams.get("submitter") ?? "";

  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  if (url.startsWith("/")) {
    const target = localTarget(url, req);
    if (!target) return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
    return NextResponse.redirect(target);
  }
  if (!isAllowedRemote(url)) return NextResponse.json({ error: "URL not allowed" }, { status: 400 });

  const res = await fetch(url);
  if (!res.ok || !res.body) return NextResponse.json({ error: "Failed to fetch file" }, { status: 502 });

  const contentType = res.headers.get("content-type") ?? "application/octet-stream";

  // Build filename: "basename - Submitter Name.ext"
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  const finalName = submitter.trim()
    ? `${base} - ${submitter.trim()}${ext}`
    : name;

  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Content-Disposition": contentDisposition(finalName),
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  };
  if (!INLINE_SAFE.test(contentType)) headers["Content-Security-Policy"] = "sandbox";

  // Stream instead of buffering the whole file in function memory.
  return new NextResponse(res.body, { headers });
}
