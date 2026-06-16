import { NextResponse } from "next/server";

/** ER-team alert update/resolve proxy (e.g. set status to "resolved"). */
export const dynamic = "force-dynamic";

const BACKEND = process.env.BACKEND_INTERNAL_URL ?? "http://backend:8000";
const ADMIN_KEY = process.env.ADMIN_API_KEY ?? "clearaid_admin_dev_key";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const body = await request.json();
  try {
    const res = await fetch(`${BACKEND}/api/alerts/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Admin-Key": ADMIN_KEY },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ detail: "Backend unreachable" }, { status: 502 });
  }
}
