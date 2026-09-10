export const dynamic = "force-dynamic";

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

function bearer(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  return /^Bearer \S+$/.test(authorization) ? authorization : null;
}

async function authenticatedUser(
  url: string,
  key: string,
  authorization: string,
) {
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, authorization },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) return null;
  const user = await response.json();
  return typeof user?.id === "string" ? user : null;
}

const responseHeaders = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const settings = config();
  const authorization = bearer(request);
  if (!authorization)
    return Response.json(
      { active: false, expiresAt: null },
      { status: 401, headers: responseHeaders },
    );
  if (!settings)
    return Response.json(
      { error: "VIP Broker სერვისი არ არის გამართული." },
      { status: 503, headers: responseHeaders },
    );

  try {
    const user = await authenticatedUser(
      settings.url,
      settings.key,
      authorization,
    );
    if (!user)
      return Response.json(
        { active: false, expiresAt: null },
        { status: 401, headers: responseHeaders },
      );

    // Closed beta: a verified JIBU account is the only access requirement.
    return Response.json(
      {
        active: true,
        expiresAt: null,
        source: "beta",
      },
      { headers: responseHeaders },
    );
  } catch {
    return Response.json(
      { error: "VIP Broker სტატუსი დროებით მიუწვდომელია." },
      { status: 503, headers: responseHeaders },
    );
  }
}

export async function POST(request: Request) {
  const settings = config();
  const authorization = bearer(request);
  if (!authorization)
    return Response.json(
      { error: "ჯერ გაიარე ავტორიზაცია." },
      { status: 401, headers: responseHeaders },
    );
  if (!settings)
    return Response.json(
      { error: "VIP Broker სერვისი არ არის გამართული." },
      { status: 503, headers: responseHeaders },
    );

  try {
    const user = await authenticatedUser(
      settings.url,
      settings.key,
      authorization,
    );
    if (!user)
      return Response.json(
        { error: "სესია ამოიწურა. თავიდან შედი ანგარიშზე." },
        { status: 401, headers: responseHeaders },
      );

    return Response.json(
      {
        active: true,
        expiresAt: null,
        source: "beta",
      },
      { headers: responseHeaders },
    );
  } catch {
    return Response.json(
      { error: "VIP Broker სერვისი დროებით მიუწვდომელია." },
      { status: 503, headers: responseHeaders },
    );
  }
}
