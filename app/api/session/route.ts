export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer \S+$/.test(authorization)) return Response.json({ user: null }, { status: 401, headers });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return Response.json({ user: null, error: "Auth unavailable" }, { status: 503, headers });
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/user`, {
      headers: { authorization, apikey: key }, cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return Response.json({ user: null }, { status: response.status === 401 || response.status === 403 ? 401 : 503, headers });
    const user = await response.json();
    if (!user.id) return Response.json({ user: null }, { status: 401, headers });
    return Response.json({ user: { id: user.id, email: user.email, user_metadata: user.user_metadata } }, { headers });
  } catch {
    return Response.json({ user: null, error: "Auth unavailable" }, { status: 503, headers });
  }
}
