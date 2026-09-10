"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  currentAccessToken,
  loginPath,
  navigateApp,
  requireUser,
  useAuth,
  useBrokerAccess,
} from "../auth-client";

type Deal = "იყიდება" | "ქირავდება";
type Row = {
  id: string;
  title: string;
  deal: Deal;
  area: string;
  phone: string;
  location: string;
  price: string;
  share: string;
  floor: string;
  note: string;
};
type EditableKey = Exclude<keyof Row, "id">;
type DatabaseRow = {
  id: string;
  title?: string | null;
  deal_type?: "sale" | "rent" | null;
  area?: number | string | null;
  phone?: string | null;
  location?: string | null;
  price?: number | string | null;
  broker_share?: string | null;
  floor?: string | null;
  note?: string | null;
};

function ExcelLogo() {
  return (
    <span className="excel-logo" aria-hidden>
      <b>X</b>
      <i>
        <span />
        <span />
        <span />
      </i>
    </span>
  );
}

function DownloadIcon() {
  return (
    <svg
      aria-hidden
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M12 3v12m-4-4 4 4 4-4M4 20h16" />
    </svg>
  );
}

function fromDatabase(row: DatabaseRow): Row {
  return {
    id: row.id,
    title: row.title || "",
    deal: row.deal_type === "rent" ? "ქირავდება" : "იყიდება",
    area: row.area == null ? "" : String(row.area),
    phone: row.phone || "",
    location: row.location || "",
    price: row.price == null ? "" : String(row.price),
    share: row.broker_share || "",
    floor: row.floor || "",
    note: row.note || "",
  };
}

function numberValue(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function toDatabase(row: Partial<Row>, sortOrder?: number) {
  const payload: Record<string, unknown> = {};
  if ("title" in row) payload.title = row.title || "";
  if ("deal" in row)
    payload.deal_type = row.deal === "ქირავდება" ? "rent" : "sale";
  if ("location" in row) payload.location = row.location || "";
  if ("area" in row) payload.area = numberValue(row.area);
  if ("floor" in row) payload.floor = row.floor || null;
  if ("price" in row) payload.price = numberValue(row.price);
  if ("phone" in row) payload.phone = row.phone || null;
  if ("share" in row) payload.broker_share = row.share || null;
  if ("note" in row) payload.note = row.note || null;
  if (sortOrder !== undefined) payload.sort_order = sortOrder;
  return payload;
}

export default function BrokerSheet({
  supabaseUrl,
  publishableKey,
}: {
  supabaseUrl: string;
  publishableKey: string;
}) {
  const { user } = useAuth();
  const subscribed = useBrokerAccess();
  const subRef = useRef(false);
  const updateTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [open, setOpen] = useState(false);
  const [gate, setGate] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [currency, setCurrency] = useState<"GEL" | "USD">("GEL");

  const requestHeaders = useCallback(
    (json = false) => ({
      apikey: publishableKey,
      Authorization: `Bearer ${currentAccessToken()}`,
      ...(json ? { "Content-Type": "application/json" } : {}),
    }),
    [publishableKey],
  );

  const insertRows = useCallback(
    async (items: Partial<Row>[]) => {
      if (!user || !supabaseUrl || !publishableKey || !items.length) return [];
      const body = items.map((row) => ({
        user_id: user.id,
        ...toDatabase(row),
        currency: "GEL",
      }));
      const response = await fetch(
        `${supabaseUrl}/rest/v1/broker_sheet_rows`,
        {
          method: "POST",
          headers: {
            ...requestHeaders(true),
            Prefer: "return=representation",
          },
          body: JSON.stringify(body),
          cache: "no-store",
        },
      );
      const result = await response.json().catch(() => []);
      if (!response.ok)
        throw new Error(
          result?.message || "ქონების ცხრილში შენახვა ვერ შესრულდა.",
        );
      return (result as DatabaseRow[]).map(fromDatabase);
    },
    [publishableKey, requestHeaders, supabaseUrl, user],
  );

  useEffect(() => {
    subRef.current = subscribed;
  }, [subscribed]);

  useEffect(() => {
    if (!user || !subscribed || !supabaseUrl || !publishableKey) return;
    let disposed = false;
    const load = async () => {
      setLoadingRows(true);
      try {
        const query = new URLSearchParams({
          select:
            "id,title,deal_type,area,phone,location,price,broker_share,floor,note",
          user_id: `eq.${user.id}`,
          order: "sort_order.asc,created_at.asc",
        });
        const response = await fetch(
          `${supabaseUrl}/rest/v1/broker_sheet_rows?${query}`,
          { headers: requestHeaders(), cache: "no-store" },
        );
        const result = await response.json().catch(() => []);
        if (!response.ok)
          throw new Error(result?.message || "ცხრილი ვერ ჩაიტვირთა.");
        let cloudRows = (result as DatabaseRow[]).map(fromDatabase);

        // Move rows created by older JIBU builds from this browser to Supabase.
        // Never delete the local copy before the cloud upload succeeds.
        const legacyKey = `jibu-broker-sheet:${user.id}`;
        const legacyValue = localStorage.getItem(legacyKey);
        if (legacyValue) {
          try {
            const legacy = JSON.parse(legacyValue);
            if (Array.isArray(legacy) && legacy.length) {
              const migrated = await insertRows(legacy);
              cloudRows = [...cloudRows, ...migrated];
            }
            localStorage.removeItem(legacyKey);
          } catch {
            throw new Error(
              "ძველი Excel მონაცემები ჯერ ვერ გადავიდა ბაზაში — ლოკალური ასლი შენარჩუნებულია.",
            );
          }
        }
        if (!disposed) setRows(cloudRows);
      } catch (error) {
        if (!disposed)
          setSyncError(
            error instanceof Error
              ? error.message
              : "ცხრილი ვერ ჩაიტვირთა.",
          );
      } finally {
        if (!disposed) setLoadingRows(false);
      }
    };
    void load();
    return () => {
      disposed = true;
    };
  }, [
    user,
    subscribed,
    supabaseUrl,
    publishableKey,
    insertRows,
    requestHeaders,
  ]);

  useEffect(() => {
    const timers = updateTimers.current;
    return () => Object.values(timers).forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const onAdd = async (event: Event) => {
      const verified = await requireUser();
      if (!verified || verified.id !== user?.id) return;
      if (!subRef.current) {
        setGate(true);
        return;
      }
      const property = (event as CustomEvent).detail || {};
      try {
        setSyncError("");
        const added = await insertRows([
          {
            title: property.title || "",
            deal:
              property.deal === "ქირავდება" ? "ქირავდება" : "იყიდება",
            area: String(property.area || ""),
            phone: property.phone || "",
            location: property.location || "",
            price: String(property.price || ""),
            share: "",
            floor: property.floor || "",
            note: "",
          },
        ]);
        setRows((current) => [...current, ...added]);
        setOpen(true);
      } catch (error) {
        setSyncError(
          error instanceof Error ? error.message : "შენახვა ვერ შესრულდა.",
        );
        setOpen(true);
      }
    };
    window.addEventListener("jibu:add-property", onAdd);
    return () => window.removeEventListener("jibu:add-property", onAdd);
  }, [user, supabaseUrl, publishableKey, insertRows]);

  const patchRow = async (id: string, key: EditableKey, value: string) => {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/broker_sheet_rows?id=eq.${encodeURIComponent(id)}&user_id=eq.${user?.id || ""}`,
      {
        method: "PATCH",
        headers: requestHeaders(true),
        body: JSON.stringify(toDatabase({ [key]: value } as Partial<Row>)),
        cache: "no-store",
      },
    );
    if (!response.ok) throw new Error("ცვლილება ვერ დასინქრონდა.");
  };

  const update = (id: string, key: EditableKey, value: string) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    );
    const timerKey = `${id}:${key}`;
    if (updateTimers.current[timerKey])
      clearTimeout(updateTimers.current[timerKey]);
    updateTimers.current[timerKey] = setTimeout(() => {
      void patchRow(id, key, value)
        .then(() => setSyncError(""))
        .catch((error) => setSyncError(error.message));
      delete updateTimers.current[timerKey];
    }, 450);
  };

  const addRow = async () => {
    try {
      const added = await insertRows([
        {
          title: "",
          deal: "იყიდება",
          area: "",
          phone: "",
          location: "",
          price: "",
          share: "",
          floor: "",
          note: "",
        },
      ]);
      setRows((current) => [...current, ...added]);
      setSyncError("");
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : "ხაზი ვერ დაემატა.",
      );
    }
  };

  const removeRow = async (row: Row) => {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/broker_sheet_rows?id=eq.${encodeURIComponent(row.id)}&user_id=eq.${user?.id || ""}`,
      { method: "DELETE", headers: requestHeaders(), cache: "no-store" },
    );
    if (!response.ok) {
      setSyncError("ჩანაწერის წაშლა ვერ შესრულდა.");
      return;
    }
    setRows((current) => current.filter((item) => item.id !== row.id));
    setSyncError("");
  };

  const convertedPrice = (value: string) => {
    const amount = Number(value.replace(/[^\d.]/g, ""));
    if (!amount) return value;
    return currency === "USD"
      ? `$${Math.round(amount / 2.6125).toLocaleString("en-US")}`
      : `${Math.round(amount).toLocaleString("en-US")} ₾`;
  };

  const download = () => {
    const head = [
      "გარიგება",
      "ობიექტი",
      "მდებარეობა",
      "კვადრატულობა",
      "სართული",
      `ფასი (${currency})`,
      "საკონტაქტო ნომერი",
      "ბროკერის წილი",
      "შენიშვნა",
    ];
    const csv =
      "\uFEFF" +
      [
        head,
        ...rows.map((row) => [
          row.deal,
          row.title,
          row.location,
          row.area,
          row.floor,
          convertedPrice(row.price),
          row.phone,
          row.share,
          row.note,
        ]),
      ]
        .map((values) =>
          values
            .map((value) => `"${String(value).replaceAll('"', '""')}"`)
            .join(","),
        )
        .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    link.download = `JIBU-properties-${currency}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const launch = async () => {
    if (!user) {
      navigateApp(loginPath("/real-estate"));
      return;
    }
    if (!(await requireUser())) return;
    if (subscribed) setOpen(true);
    else setGate(true);
  };

  if (!user || !subscribed) return null;

  return (
    <>
      <button
        className="excel-fab"
        onClick={launch}
        aria-label="VIP Broker ცხრილის გახსნა"
      >
        <ExcelLogo />
        <span>
          <small>VIP BROKER</small>ქონების ცხრილი
        </span>
      </button>
      {gate && (
        <div
          className="broker-gate-backdrop"
          onMouseDown={() => setGate(false)}
        >
          <section className="broker-gate" onMouseDown={(e) => e.stopPropagation()}>
            <button className="gate-close" onClick={() => setGate(false)}>
              ×
            </button>
            <span className="gate-crown">VIP</span>
            <small>JIBU PROFESSIONAL</small>
            <h2>VIP Broker გამოწერა</h2>
            <p>
              ქონების ცხრილი და პროფესიონალური ბროკერის ინსტრუმენტები
              ხელმისაწვდომია მხოლოდ აქტიური გამოწერით.
            </p>
            <a href="/real-estate/vip-broker">უპირატესობების ნახვა და შეძენა</a>
          </section>
        </div>
      )}
      {open && (
        <section
          className="excel-panel"
          aria-label="უძრავი ქონების ჩაშენებული ცხრილი"
        >
          <header>
            <div>
              <ExcelLogo />
              <span>
                <span className="excel-vip">JIBU PRIVATE TOOLS</span>
                <strong>VIP Broker Excel</strong>
                <small>{rows.length} ჩანაწერი · პირადი ქონების ბაზა</small>
              </span>
            </div>
            <div>
              <div className="excel-currency" aria-label="ფასის ვალუტა">
                <button
                  className={currency === "GEL" ? "active" : ""}
                  onClick={() => setCurrency("GEL")}
                >
                  ₾
                </button>
                <button
                  className={currency === "USD" ? "active" : ""}
                  onClick={() => setCurrency("USD")}
                >
                  $
                </button>
              </div>
              <button disabled={loadingRows} onClick={() => void addRow()}>
                ＋ ახალი ჩანაწერი
              </button>
              <button className="download-sheet" onClick={download}>
                <DownloadIcon /> ჩამოტვირთვა
              </button>
              <button
                className="excel-icon-button close"
                onClick={() => setOpen(false)}
                aria-label="დახურვა"
              >
                ×
              </button>
            </div>
          </header>
          <div className="sheet-formula-bar">
            <span>JIBU</span>
            <b>fx</b>
            <small>
              {syncError ||
                (loadingRows
                  ? "ცხრილი იტვირთება…"
                  : "ყველა ცვლილება ინახება ანგარიშზე · 1 USD = 2.6125 GEL")}
            </small>
          </div>
          <div className="excel-scroll">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>გარიგება</th>
                  <th>ობიექტი</th>
                  <th>მდებარეობა</th>
                  <th>კვადრატულობა</th>
                  <th>სართული</th>
                  <th>ფასი ({currency})</th>
                  <th>საკონტაქტო ნომერი</th>
                  <th>ბროკერის წილი</th>
                  <th>შენიშვნა</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td>{index + 1}</td>
                    <td>
                      <select
                        className={row.deal === "ქირავდება" ? "rent" : "sale"}
                        value={row.deal}
                        onChange={(event) =>
                          update(row.id, "deal", event.target.value as Deal)
                        }
                      >
                        <option>იყიდება</option>
                        <option>ქირავდება</option>
                      </select>
                    </td>
                    {(
                      [
                        "title",
                        "location",
                        "area",
                        "floor",
                        "price",
                        "phone",
                        "share",
                        "note",
                      ] as EditableKey[]
                    ).map((key) => (
                      <td key={key}>
                        <input
                          value={
                            key === "price"
                              ? convertedPrice(String(row[key]))
                              : String(row[key])
                          }
                          readOnly={key === "price" && currency === "USD"}
                          placeholder={
                            key === "floor"
                              ? "მაგ: 3/9"
                              : key === "share"
                                ? "შეავსეთ"
                                : key === "note"
                                  ? "აგენტის შენიშვნა"
                                  : ""
                          }
                          onChange={(event) =>
                            update(row.id, key, event.target.value)
                          }
                        />
                      </td>
                    ))}
                    <td>
                      <button
                        onClick={() => void removeRow(row)}
                        aria-label="ხაზის წაშლა"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
