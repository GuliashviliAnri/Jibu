export const dynamic = "force-dynamic";

type SubscriptionRow = {
  ends_at: string;
  status: string;
  source?: string;
};

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

async function betaAccess(
  url: string,
  key: string,
  authorization: string,
) {
  const response = await fetch(`${url}/rest/v1/rpc/has_beta_full_access`, {
    method: "POST",
    headers: {
      apikey: key,
      authorization,
      "Content-Type": "application/json",
    },
    body: "{}",
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) return false;
  return (await response.json().catch(() => false)) === true;
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

    if (await betaAccess(settings.url, settings.key, authorization))
      return Response.json(
        {
          active: true,
          expiresAt: null,
          source: "beta",
        },
        { headers: responseHeaders },
      );

    const query = new URLSearchParams({
      select: "ends_at,status,source",
      user_id: `eq.${user.id}`,
      status: "eq.active",
      ends_at: `gt.${new Date().toISOString()}`,
      order: "ends_at.desc",
      limit: "1",
    });
    const response = await fetch(
      `${settings.url}/rest/v1/broker_subscriptions?${query}`,
      {
        headers: { apikey: settings.key, authorization },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok)
      return Response.json(
        { error: "VIP Broker სტატუსი ვერ ჩაიტვირთა." },
        { status: 503, headers: responseHeaders },
      );

    const rows = (await response.json()) as SubscriptionRow[];
    const subscription = rows[0];
    return Response.json(
      {
        active: Boolean(subscription),
        expiresAt: subscription?.ends_at || null,
        source: subscription?.source || null,
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

    if (await betaAccess(settings.url, settings.key, authorization))
      return Response.json(
        {
          active: true,
          expiresAt: null,
          source: "beta",
        },
        { headers: responseHeaders },
      );

    const body = await request.json().catch(() => ({}));
    const action = body?.action === "purchase" ? "purchase" : "trial";
    const rpc =
      action === "purchase"
        ? "purchase_vip_broker"
        : "claim_vip_broker_trial";
    const response = await fetch(`${settings.url}/rest/v1/rpc/${rpc}`, {
      method: "POST",
      headers: {
        apikey: settings.key,
        authorization,
        "Content-Type": "application/json",
      },
      body: "{}",
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = String(result?.message || result?.details || "");
      const message = detail.includes("insufficient_balance")
        ? "ბალანსზე საკმარისი თანხა არ არის — საჭიროა 19.99 ₾."
        : detail.includes("trial_already_claimed")
          ? "საცდელი პერიოდი უკვე გამოყენებულია."
          : detail.includes("Could not find the function")
            ? "ჯერ გაუშვი VIP Broker-ის ახალი SQL migration Supabase-ში."
            : "VIP Broker ვერ გააქტიურდა. სცადე თავიდან.";
      return Response.json(
        { error: message },
        { status: 400, headers: responseHeaders },
      );
    }

    return Response.json(
      {
        active: Boolean(result?.active),
        expiresAt: result?.expires_at || null,
        balanceTetri: result?.balance_tetri,
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
