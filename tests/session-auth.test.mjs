import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../app/api/session/route.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { GET } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

test("session endpoint fails closed and returns only verified identity", async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const request = () => new Request("http://localhost/api/session", { headers: { Authorization: "Bearer test-token" } });
  try {
    let calls = 0;
    globalThis.fetch = async () => { calls++; throw new Error("Unexpected network request"); };
    assert.equal((await GET(new Request("http://localhost/api/session"))).status, 401);
    assert.equal(calls, 0);
    delete process.env.SUPABASE_URL;
    assert.equal((await GET(request())).status, 503);
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_PUBLISHABLE_KEY = "test-key";
    globalThis.fetch = async () => Response.json({ error: "expired or forged" }, { status: 401 });
    assert.equal((await GET(request())).status, 401);
    globalThis.fetch = async (url, options) => {
      assert.equal(url, "https://example.supabase.co/auth/v1/user");
      assert.equal(options.headers.authorization, "Bearer test-token");
      return Response.json({ id: "verified-user", email: "test@example.com", secret: "not exposed" });
    };
    const response = await GET(request());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { user: { id: "verified-user", email: "test@example.com" } });
    globalThis.fetch = async () => { throw new Error("offline"); };
    assert.equal((await GET(request())).status, 503);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY; else process.env.SUPABASE_PUBLISHABLE_KEY = originalKey;
  }
});
