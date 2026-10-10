import { NextRequest, NextResponse } from "next/server";
import * as students from "@/server/osa/students";
import * as violations from "@/server/osa/violations";
import * as violationTypes from "@/server/osa/violation-types";
import * as lostFound from "@/server/osa/lost-found";

type Ctx = { params: Promise<{ id: string; path: string[] }> };
type Handler = (req: NextRequest, courseId: string, rest: string[]) => Promise<Response>;

const modules: Record<string, Record<string, Handler>> = {
  students,
  violations,
  "violation-types": violationTypes,
  "lost-found": lostFound,
};

async function dispatch(req: NextRequest, ctx: Ctx, method: string) {
  const { id, path } = await ctx.params;
  const [resource, ...rest] = path;
  const handler = modules[resource]?.[method];
  if (!handler) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return handler(req, id, rest);
}

export const GET = (req: NextRequest, ctx: Ctx) => dispatch(req, ctx, "GET");
export const POST = (req: NextRequest, ctx: Ctx) => dispatch(req, ctx, "POST");
export const PATCH = (req: NextRequest, ctx: Ctx) => dispatch(req, ctx, "PATCH");
export const DELETE = (req: NextRequest, ctx: Ctx) => dispatch(req, ctx, "DELETE");