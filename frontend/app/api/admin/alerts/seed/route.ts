import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND = process.env.BACKEND_INTERNAL_URL ?? "http://backend:8000";
const ADMIN_KEY = process.env.ADMIN_API_KEY ?? "clearaid_admin_dev_key";

/** Load the bundled demo alert set into the database. */
export async function POST() {
  try {
    const res = await fetch(`${BACKEND}/api/alerts/seed`, {
      method: "POST",
      headers: { "X-Admin-Key": ADMIN_KEY },
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}
