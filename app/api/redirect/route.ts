import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { getSql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 12 * 60 * 60 * 1000;
const COOKIE_NAME = "visitor_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2; // 2 years

function sign(value: string) {
  const secret = process.env.COOKIE_SECRET;
  if (!secret) throw new Error("COOKIE_SECRET is missing.");
  return createHmac("sha256", secret).update(value).digest("hex");
}

function validSignedCookie(raw: string | undefined): string | null {
  if (!raw) return null;
  const splitAt = raw.lastIndexOf(".");
  if (splitAt < 1) return null;

  const id = raw.slice(0, splitAt);
  const supplied = raw.slice(splitAt + 1);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f]{64}$/i.test(supplied)) return null;

  const expected = sign(id);
  const a = Buffer.from(supplied, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b) ? id : null;
}

export async function GET(request: NextRequest) {
  const link1 = process.env.LINK_1;
  const link2 = process.env.LINK_2;

  if (!link1 || !link2) {
    return NextResponse.json(
      { error: "Set LINK_1 and LINK_2 in Vercel Environment Variables." },
      { status: 500 }
    );
  }

  let visitorId = validSignedCookie(request.cookies.get(COOKIE_NAME)?.value);
  const isNewVisitor = !visitorId;
  if (!visitorId) visitorId = randomUUID();

  // Atomic UPSERT: first request or expired 12-hour window → Link 1.
  // Any further request inside the same window → Link 2.
  const sql = getSql();
  const rows = await sql`
    INSERT INTO visitor_visits (visitor_id, window_started_at, visit_count, updated_at)
    VALUES (${visitorId}, NOW(), 1, NOW())
    ON CONFLICT (visitor_id) DO UPDATE
    SET
      window_started_at = CASE
        WHEN visitor_visits.window_started_at <= NOW() - INTERVAL '12 hours'
        THEN NOW()
        ELSE visitor_visits.window_started_at
      END,
      visit_count = CASE
        WHEN visitor_visits.window_started_at <= NOW() - INTERVAL '12 hours'
        THEN 1
        ELSE visitor_visits.visit_count + 1
      END,
      updated_at = NOW()
    RETURNING visit_count
  `;

  const visitCount = Number(rows[0]?.visit_count ?? 1);
  const destination = visitCount === 1 ? link1 : link2;

  const response = NextResponse.redirect(destination, 302);
  if (isNewVisitor) {
    response.cookies.set(COOKIE_NAME, `${visitorId}.${sign(visitorId)}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE
    });
  }

  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return response;
}
