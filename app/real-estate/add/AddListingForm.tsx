"use client";
import { useEffect, useState } from "react";
import {useAuth,requireUser,currentAccessToken} from "../../auth-client";
import { propertyListings } from "../property-data";
import { promotionPackages, promotionQuote } from "../promotion-pricing";
import ListingLocationPicker from "./ListingLocationPicker";
import {georgiaCities,cityPoint} from "./georgia-cities";
type Photo = { id: string; url: string; name: string; file?: File };
type Data = {
  deal: string;
  type: string;
  title: string;
  location: string;
  city: string;
  street: string;
  longitude: number;
  latitude: number;
  area: string;
  floor: string;
  rooms: string;
  price: string;
  description: string;
};
const blank: Data = {
  deal: "იყიდება",
  type: "ბინა",
  title: "",
  location: "",
  city: "თბილისი",
  street: "",
  longitude: 44.793,
  latitude: 41.715,
  area: "",
  floor: "",
  rooms: "",
  price: "",
  description: "",
};
export default function AddListingForm({supabaseUrl,publishableKey}:{supabaseUrl:string;publishableKey:string}) {
  const {user}=useAuth();
  const [role, setRole] = useState<"owner" | "broker">("owner"),
    [vip, setVip] = useState(false),
    [turbo, setTurbo] = useState(false),
    [days, setDays] = useState(1),
    [currency, setCurrency] = useState<"GEL" | "USD">("GEL"),
    [photos, setPhotos] = useState<Photo[]>([]),
    [form, setForm] = useState(blank),
    [editSlug, setEditSlug] = useState(""),
    [done, setDone] = useState(false),
    [saving,setSaving]=useState(false),
    [error,setError]=useState("");
  const editing = !!editSlug;
  useEffect(() => {
    const slug = new URLSearchParams(location.search).get("edit") || "",
      base = propertyListings.find((x) => x.slug === slug);
    if (!base) return;
    const saved =
        JSON.parse(localStorage.getItem("jibu:edited-listings") || "{}")[
          slug
        ] || {},
      x = { ...base, ...saved };
    setEditSlug(slug);
    setRole(x.owner ? "owner" : "broker");
    setForm({
      deal: x.deal,
      type: x.beds === "ოფისი" ? "კომერციული ფართი" : "ბინა",
      title: x.title,
      location: x.location,
      city: x.city||String(x.location).split(",")[0].trim()||"თბილისი",
      street: x.street||String(x.location).split(",").slice(1).join(",").trim(),
      longitude: x.longitude,
      latitude: x.latitude,
      area: x.area,
      floor: x.floor,
      rooms: String(x.beds).replace(/\D/g, ""),
      price: String(x.price).replace(/[^\d.]/g, ""),
      description: x.description,
    });
    setPhotos(
      (x.photos?.length ? x.photos : [`/assets/concept/${x.image}.webp`]).map(
        (url: string, i: number) => ({
          id: `saved-${i}`,
          url,
          name: `${x.title} ${i + 1}`,
        }),
      ),
    );
  }, []);
  const field = (k: keyof Data, v: string) =>
    setForm((x) => ({ ...x, [k]: v }));
  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    const loaded = await Promise.all(
      Array.from(files).map(
        (file) =>
          new Promise<Photo>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                id: crypto.randomUUID(),
                url: String(reader.result),
                name: file.name,
                file,
              });
            reader.onerror = reject;
            reader.readAsDataURL(file);
          }),
      ),
    );
    setPhotos((x) => [...x, ...loaded]);
  };
  const reorder = (a: string, b: string) =>
    setPhotos((x) => {
      const from = x.findIndex((p) => p.id === a),
        to = x.findIndex((p) => p.id === b);
      if (from < 0 || to < 0 || from === to) return x;
      const n = [...x],
        [p] = n.splice(from, 1);
      n.splice(to, 0, p);
      return n;
    });
  const total = editing ? 0 : 0.1 + (turbo ? promotionQuote("turbo", days).price : vip ? promotionQuote("vip", days).price : 0);
  const submit = async () => {
    if(saving)return;
    setError("");
    const verified = await requireUser();
    if (!verified || verified.id !== user?.id) return;
    if(!form.title.trim()||!form.price||!form.area||!form.street.trim()){setError("შეავსე სათაური, ქუჩა, ფართობი და ფასი.");return}
    setSaving(true);
    try{
    if (editing) {
      const all = JSON.parse(
        localStorage.getItem("jibu:edited-listings") || "{}",
      );
      all[editSlug] = {
        ...form,
        beds: `${form.rooms} ოთახი`,
        owner: role === "owner",
        price: `${Number(form.price).toLocaleString("en-US")} ₾`,
        photos: photos.map((p) => p.url),
      };
      localStorage.setItem("jibu:edited-listings", JSON.stringify(all));
    } else {
      if(!supabaseUrl||!publishableKey)throw new Error("Supabase გარემოს ცვლადები არ არის გამართული.");
      const token=currentAccessToken();
      if(!token)throw new Error("სესია დასრულდა — თავიდან შედი ანგარიშში.");
      const [floor,totalFloors]=form.floor.split("/").map(value=>Number(value)||null);
      const slug=`jibu-${Date.now()}-${crypto.randomUUID().slice(0,6)}`;
      const headers={apikey:publishableKey,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"return=representation"};
      const created=await fetch(`${supabaseUrl}/rest/v1/properties?select=id,slug`,{method:"POST",headers,body:JSON.stringify({user_id:verified.id,slug,publisher_kind:role,deal_type:form.deal==="ქირავდება"?"rent":"sale",property_type:form.type,title:form.title.trim(),description:form.description.trim(),city:form.city,street:form.street.trim(),location_label:form.location||`${form.city}, ${form.street}`,latitude:form.latitude,longitude:form.longitude,price:Number(form.price),currency,area:Number(form.area),rooms:Number(form.rooms)||null,bedrooms:Number(form.rooms)||null,floor,total_floors:totalFloors,contact_name:verified.user_metadata?.full_name||verified.email||"JIBU მომხმარებელი",contact_phone:verified.user_metadata?.phone||"არ არის მითითებული",status:"draft"})});
      if(!created.ok)throw new Error((await created.text())||"განცხადება ვერ შეინახა.");
      const property=(await created.json())[0];
      const photoRows=[];
      for(let index=0;index<photos.length;index++){
        const photo=photos[index];
        if(!photo.file)continue;
        const safeName=photo.file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g,"-");
        const path=`${verified.id}/${property.id}/${index}-${safeName}`;
        const uploaded=await fetch(`${supabaseUrl}/storage/v1/object/property-images/${path}`,{method:"POST",headers:{apikey:publishableKey,Authorization:`Bearer ${token}`,"Content-Type":photo.file.type||"application/octet-stream","x-upsert":"false"},body:photo.file});
        if(!uploaded.ok)throw new Error(`ფოტო ვერ აიტვირთა: ${photo.name}`);
        photoRows.push({property_id:property.id,owner_id:verified.id,storage_path:path,public_url:`${supabaseUrl}/storage/v1/object/public/property-images/${path}`,sort_order:index,file_size:photo.file.size,mime_type:photo.file.type});
      }
      if(photoRows.length){const savedPhotos=await fetch(`${supabaseUrl}/rest/v1/property_photos`,{method:"POST",headers:{...headers,Prefer:"return=minimal"},body:JSON.stringify(photoRows)});if(!savedPhotos.ok)throw new Error("ფოტოების ჩანაწერები ვერ შეინახა.")}
      const expires=new Date(Date.now()+30*86400000).toISOString();
      const activated=await fetch(`${supabaseUrl}/rest/v1/properties?id=eq.${property.id}`,{method:"PATCH",headers:{...headers,Prefer:"return=minimal"},body:JSON.stringify({status:"active",published_at:new Date().toISOString(),expires_at:expires})});
      if(!activated.ok)throw new Error("განცხადების გამოქვეყნება ვერ დასრულდა.");
    }
    setDone(true);
    }catch(reason){setError(reason instanceof Error?reason.message:"შენახვისას დაფიქსირდა შეცდომა.")}finally{setSaving(false)}
  };
  return (
    <main className={`listing-form-page `}>
      <nav className="detail-breadcrumb">
        <a href="/real-estate">უძრავი ქონება</a>
        <span>/</span>
        <b>{editing ? "განცხადების რედაქტირება" : "განცხადების დადება"}</b>
      </nav>
      <div className="form-heading">
        <div>
          <span>{editing ? "უფასო რედაქტირება" : "ახალი განცხადება"}</span>
          <h1>{editing ? "განაახლე განცხადება" : "განათავსე უძრავი ქონება"}</h1>
          <p>
            {editing
              ? "შეცვალე ინფორმაცია ან ფოტოები — რედაქტირება უფასოა."
              : "შეავსე ზუსტი ინფორმაცია — განცხადება JIBU-ზე 30 დღის განმავლობაში გამოჩნდება."}
          </p>
        </div>
        <aside>
          <small>დღევანდელი გადასახადი</small>
          <strong>{total.toFixed(2)} ₾</strong>
          <span>
            {editing
              ? "რედაქტირება უფასოა"
              : turbo
                ? `Turbo ${days} დღე`
                : vip
                  ? `VIP ${days} დღე`
                  : "30 დღე"}
          </span>
        </aside>
      </div>
      {done ? (
        <section className={`form-success ${editing ? "edit-success" : "publish-success"}`}>
          <div className="success-mark" aria-hidden="true"><span>✓</span></div>
          <div className="success-copy">
            <small>{editing ? "რედაქტირება დასრულებულია" : "განცხადება მიღებულია"}</small>
            <h2>{editing ? "ცვლილებები წარმატებით შეინახა" : "განცხადება მზადაა გამოსაქვეყნებლად"}</h2>
            <p>{editing ? "განახლებული ინფორმაცია და ფოტოები შენს განცხადებაში უკვე შენახულია." : "განცხადება და ფოტოები შენახულია და 30 დღით გამოქვეყნდა."}</p>
          </div>
          <div className="success-summary">
            <div><small>სტატუსი</small><b>{editing ? "განახლებულია" : "მზადაა"}</b></div>
            <div><small>ვადა</small><b>30 დღე</b></div>
            <div><small>ღირებულება</small><b>{editing ? "უფასო" : `${total.toFixed(2)} ₾`}</b></div>
          </div>
          <div className="success-actions">
            <a className="success-primary" href="/real-estate/cabinet">ჩემი განცხადებები</a>
            <a className="success-secondary" href="/real-estate">უძრავი ქონების გვერდი</a>
          </div>
        </section>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <section className="form-card">
            <h2>ვინ აქვეყნებს?</h2>
            <div className="role-choice">
              <button
                type="button"
                className={role === "owner" ? "active" : ""}
                onClick={() => setRole("owner")}
              >
                <b>მესაკუთრე</b>
                <span>ვაქვეყნებ საკუთარ ქონებას</span>
              </button>
              <button
                type="button"
                className={role === "broker" ? "active" : ""}
                onClick={() => setRole("broker")}
              >
                <b>ბროკერი</b>
                <span>ვაქვეყნებ კლიენტის ქონებას</span>
              </button>
            </div>
          </section>
          <section className="form-card">
            <h2>ქონების ინფორმაცია</h2>
            <div className="form-grid">
              <label>
                გარიგება
                <select
                  value={form.deal}
                  onChange={(e) => field("deal", e.target.value)}
                >
                  <option>იყიდება</option>
                  <option>ქირავდება</option>
                </select>
              </label>
              <label>
                ქონების ტიპი
                <select
                  value={form.type}
                  onChange={(e) => field("type", e.target.value)}
                >
                  <option>ბინა</option>
                  <option>სახლი</option>
                  <option>კომერციული ფართი</option>
                </select>
              </label>
              <label className="wide">
                სათაური
                <input
                  required
                  value={form.title}
                  onChange={(e) => field("title", e.target.value)}
                  placeholder="მაგ.: 3-ოთახიანი ბინა ვაკეში"
                />
              </label>
              <label className="wide city-select-field">
                ქალაქი
                <select value={form.city} onChange={e=>{const city=e.target.value,point=cityPoint(city);setForm(x=>({...x,city,street:"",location:city,longitude:point[1],latitude:point[2]}))}}>
                  {georgiaCities.map(city=><option key={city[0]} value={city[0]}>{city[0]}</option>)}
                </select>
              </label>
              <div className="wide">
                <ListingLocationPicker
                  city={form.city}
                  street={form.street}
                  longitude={form.longitude}
                  latitude={form.latitude}
                  onStreetChange={street=>setForm(x=>({...x,street,location:`${x.city}, ${street}`}))}
                  onChange={(longitude, latitude) =>
                    setForm((x) => ({ ...x, longitude, latitude }))
                  }
                />
              </div>
              <label>
                ფართობი, მ²
                <input
                  type="number"
                  value={form.area}
                  onChange={(e) => field("area", e.target.value)}
                  placeholder="მაგ.: 75"
                />
              </label>
              <label>
                სართული
                <input
                  value={form.floor}
                  onChange={(e) => field("floor", e.target.value)}
                  placeholder="მაგ.: 3/9"
                />
              </label>
              <label>
                ოთახები
                <input
                  type="number"
                  value={form.rooms}
                  onChange={(e) => field("rooms", e.target.value)}
                  placeholder="მაგ.: 3"
                />
              </label>
              <label className="price-field">
                <span className="field-title">ფასი</span>
                <div className="price-entry">
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => field("price", e.target.value)}
                    placeholder="მაგ.: 120000"
                  />
                  <div className="currency-toggle">
                    <button
                      type="button"
                      className={currency === "GEL" ? "active" : ""}
                      onClick={() => setCurrency("GEL")}
                    >
                      ₾
                    </button>
                    <button
                      type="button"
                      className={currency === "USD" ? "active" : ""}
                      onClick={() => setCurrency("USD")}
                    >
                      $
                    </button>
                  </div>
                </div>
              </label>
              <label className="wide">
                აღწერა
                <textarea
                  value={form.description}
                  onChange={(e) => field("description", e.target.value)}
                  placeholder="რემონტი, ავეჯი და სხვა მნიშვნელოვანი დეტალები…"
                />
              </label>
            </div>
          </section>
          <section className="form-card">
            <h2>ფოტოები</h2>
            <label className="photo-upload">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => addPhotos(e.target.files)}
              />
              <b>
                {photos.length
                  ? `${photos.length} ფოტო არჩეულია`
                  : "ფოტოების ატვირთვა"}
              </b>
              <span>
                JPG, PNG, WebP · ორიგინალი ხარისხი ინახება · პირველი ფოტო იქნება
                მთავარი
              </span>
            </label>
            {photos.length > 0 && (
              <>
                <p className="photo-sort-help">
                  მოკიდე ფოტოს და გადაათრიე სასურველ ადგილზე · პირველი ფოტო
                  მთავარია
                </p>
                <div className="uploaded-photo-grid">
                  {photos.map((p, i) => (
                    <article
                      key={p.id}
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/plain", p.id)
                      }
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        reorder(e.dataTransfer.getData("text/plain"), p.id);
                      }}
                    >
                      <img src={p.url} alt={p.name} />
                      <span>{i ? i + 1 : "მთავარი"}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setPhotos((x) => x.filter((y) => y.id !== p.id))
                        }
                      >
                        ×
                      </button>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
          <section className="form-card contact-card">
            <h2>საკონტაქტო ინფორმაცია</h2>
            <div className="profile-prefill">
              <span>{(user?.user_metadata?.full_name || "JU").slice(0,2)}</span>
              <div>
                <small>განმცხადებელი</small>
                <b>{user?.user_metadata?.full_name || "JIBU მომხმარებელი"}</b>
                {user?.user_metadata?.phone ? <a href={`tel:${user.user_metadata.phone}`}>{user.user_metadata.phone}</a> : <small>ნომერი პროფილში არ არის მითითებული</small>}
              </div>
            </div>
            <p className="contact-note">მონაცემები შენი პროფილიდან ივსება და განცხადებაზე გამოჩნდება.</p>
          </section>
          {!editing && <><Promo
            kind="VIP"
            active={vip}
            setActive={(v) => {
              setVip(v);
              if (v) setTurbo(false);
            }}
            days={days}
            setDays={setDays}
            price={2}
          />
          <Promo
            kind="Turbo"
            active={turbo}
            setActive={(v) => {
              setTurbo(v);
              if (v) setVip(false);
            }}
            days={days}
            setDays={setDays}
            price={4}
          /></>}
          <footer className="form-checkout">
            <div>
              <span>დღევანდელი გადასახადი</span>
              <strong>{total.toFixed(2)} ₾</strong>
            </div>
            {error&&<p className="form-submit-error" role="alert">{error}</p>}
            <button type="submit" disabled={saving}>
              {saving?"ინახება…":editing ? "ცვლილებების შენახვა" : "განცხადების გამოქვეყნება"}
            </button>
          </footer>
        </form>
      )}
    </main>
  );
}
function Promo({
  kind,
  active,
  setActive,
  days,
  setDays,
  price,
}: {
  kind: "VIP" | "Turbo";
  active: boolean;
  setActive: (v: boolean) => void;
  days: number;
  setDays: (v: number) => void;
  price: number;
}) {
  return (
    <section
      className={`vip-option compact-form-promo ${kind === "Turbo" ? "turbo-option" : ""} ${active ? "active" : ""}`}
    >
      <div>
        <span>{kind === "Turbo" ? "T" : "VIP"}</span>
        <div>
          <b>
            {kind === "Turbo"
              ? "Turbo — მაქსიმალური ხილვადობა"
              : "გამოაჩინე განცხადება სხვებზე მაღლა"}
          </b>
          <small>1 დღე — {price} ₾</small>
        </div>
      </div>
      <label>
        <input
          type="checkbox"
          aria-label={`${kind} გააქტიურება`}
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        <i />
      </label>
      {active && (
        <details className="promo-period">
          <summary>{days} დღე <span>{promotionQuote(kind === "Turbo" ? "turbo" : "vip", days).price} ₾ <i aria-hidden="true">⌄</i></span></summary>
          <div className="promo-period-options">
            {promotionPackages.map(p => <button type="button" key={p.days} aria-pressed={days === p.days} onClick={e => { setDays(p.days); e.currentTarget.closest("details")?.removeAttribute("open"); }}>
              <span>{p.days} დღე{p.days === 15 && <small>რეკომენდებული</small>}</span>
              <span className="promo-choice-price"><b>{p[kind === "Turbo" ? "turbo" : "vip"]} ₾</b>{promotionQuote(kind === "Turbo" ? "turbo" : "vip", p.days).saving > 0 && <small>ზოგავ {promotionQuote(kind === "Turbo" ? "turbo" : "vip", p.days).saving} ₾</small>}</span>
            </button>)}
          </div>
        </details>
      )}
    </section>
  );
}
