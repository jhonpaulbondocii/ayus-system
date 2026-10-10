import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const name = req.nextUrl.searchParams.get("name") ?? "file.pdf";
  const submitter = req.nextUrl.searchParams.get("submitter") ?? "";

  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  const res = await fetch(url);
  if (!res.ok) return NextResponse.json({ error: "Failed to fetch file" }, { status: 502 });

  const buffer = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") ?? "application/octet-stream";

  // Build filename: "basename - Submitter Name.ext"
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  const finalName = submitter.trim()
    ? `${base} - ${submitter.trim()}${ext}`
    : name;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${finalName}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}