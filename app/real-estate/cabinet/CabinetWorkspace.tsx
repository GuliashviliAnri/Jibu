"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { propertyListings } from "../property-data";
import { promotionPackages, promotionQuote, extendPromotion } from "../promotion-pricing";
import type { PromotionKind } from "../promotion-pricing";
import { currentAccessToken, useAuth, useBrokerAccess } from "../../auth-client";

type ManagedListing = (typeof propertyListings)[number] & { daysLeft: number; vipDays: number; vipActive: number; turboDays: number; turboActive: number; remoteId?:string; imageUrl?:string };

const initialItems: ManagedListing[] = [];
const vipOptions = promotionPackages.map(p => p.days);

const timeTone = (days: number) => days > 20 ? "safe" : days > 10 ? "warning" : "danger";

export default function CabinetWorkspace({supabaseUrl,publishableKey}:{supabaseUrl:string;publishableKey:string}) {
  const {user}=useAuth();
  const brokerAccess = useBrokerAccess();
  const [items, setItems] = useState(initialItems);
  const [notice, setNotice] = useState("");
  const total = items.reduce((sum, property) => sum + property.views, 0);
  useEffect(()=>{
    let cancelled=false;
    const load=async()=>{
      try{
        const token=currentAccessToken();
        if(supabaseUrl&&publishableKey&&token&&user){
          const response=await fetch(`${supabaseUrl}/rest/v1/property_catalog?user_id=eq.${user.id}&select=*&order=created_at.desc`,{headers:{apikey:publishableKey,Authorization:`Bearer ${token}`},cache:"no-store"});
          if(response.ok){
            const rows=await response.json();
            if(!cancelled)setItems(rows.map((row:any)=>({
              remoteId:row.id,slug:row.slug,image:"property-1",imageUrl:row.cover_url||undefined,
              photos:row.cover_url?[row.cover_url]:[],tag:row.is_turbo?"TURBO":row.is_vip?"VIP":"ახალი",
              promotion:row.is_turbo?"turbo":row.is_vip?"vip":"standard",owner:row.publisher_kind==="owner",
              title:row.title,deal:row.deal_type==="rent"?"ქირავდება":"იყიდება",location:row.location_label,
              longitude:Number(row.longitude),latitude:Number(row.latitude),price:`${Number(row.price).toLocaleString("en-US")} ${row.currency==="USD"?"$":"₾"}`,
              area:String(row.area),beds:row.rooms?`${row.rooms} ოთახი`:row.property_type,phone:row.contact_phone,
              share:row.broker_share||"",floor:[row.floor,row.total_floors].filter((x:any)=>x!==null).join("/")||"—",
              bedrooms:String(row.bedrooms||0),views:Number(row.view_count)||0,description:row.description,
              daysLeft:Math.max(0,Math.ceil((new Date(row.expires_at).getTime()-Date.now())/86400000)),
              vipDays:1,vipActive:row.is_vip?1:0,turboDays:1,turboActive:row.is_turbo?1:0,
            } as ManagedListing)));
            return;
          }
        }
        const edits=JSON.parse(localStorage.getItem("jibu:edited-listings")||"{}");
        const saved=JSON.parse(localStorage.getItem("jibu:user-listings")||"[]");
        if(Array.isArray(saved)&&!cancelled)setItems(saved.map((item:any)=>({...item,...(edits[item.slug]||{}),image:item.image||"property-1",photos:item.photos||[],phone:item.phone||"",share:item.share||"",daysLeft:item.daysLeft??30,vipDays:item.vipDays??1,vipActive:item.vipActive??(item.promotion==="vip"?1:0),turboDays:item.turboDays??1,turboActive:item.turboActive??(item.promotion==="turbo"?1:0)})));
      }catch{}
    };
    void load();
    return()=>{cancelled=true};
  },[supabaseUrl,publishableKey,user?.id]);
  const remove=async(item:ManagedListing)=>{if(item.remoteId){const token=currentAccessToken();const response=await fetch(`${supabaseUrl}/rest/v1/properties?id=eq.${item.remoteId}`,{method:"DELETE",headers:{apikey:publishableKey,Authorization:`Bearer ${token}`}});if(!response.ok){setNotice("განცხადება ვერ წაიშალა — სცადე თავიდან.");return}}setItems(current=>current.filter(property=>property.slug!==item.slug))};
  const update = (slug: string, values: Partial<ManagedListing>) => setItems(current => current.map(item => item.slug === slug ? { ...item, ...values } : item));
  const renew = (slug: string) => {
    const item = items.find(p => p.slug === slug);
    update(slug, { daysLeft: Math.max(30, item?.vipActive || 0, item?.turboActive || 0) });
    setNotice("განცხადება განახლდა — 30-დღიანი ათვლა თავიდან დაიწყო. ჩამოგეჭრათ 0.25 ₾.");
  };
  const activateVip = (item: ManagedListing) => {
    const next = extendPromotion(item.daysLeft, item.vipActive, item.vipDays);
    update(item.slug, { vipActive: next.activeDays, daysLeft: next.daysLeft });
    setNotice(`VIP პერიოდს დაემატა ${item.vipDays} დღე — ღირებულება ${promotionQuote("vip", item.vipDays).price} ₾. განცხადება აქტიური დარჩება შეძენილი პერიოდის ბოლომდე.`);
  };
  const activateTurbo = (item: ManagedListing) => {
    const next = extendPromotion(item.daysLeft, item.turboActive, item.turboDays);
    update(item.slug, { turboActive: next.activeDays, daysLeft: next.daysLeft });
    setNotice(`Turbo პერიოდს დაემატა ${item.turboDays} დღე — ღირებულება ${promotionQuote("turbo", item.turboDays).price} ₾. განცხადება აქტიური დარჩება შეძენილი პერიოდის ბოლომდე.`);
  };

  return <main className={`cabinet-page ${!items.length?"is-empty":""}`}>
    <nav className="detail-breadcrumb"><a href="/real-estate">უძრავი ქონება</a><span>/</span><b>ჩემი განცხადებები</b></nav>
    <header><div><span>პირადი კაბინეტი</span><h1>ჩემი უძრავი ქონება</h1><p>მართე განცხადებები, დარჩენილი დრო და VIP სტატუსი ერთ სივრცეში.</p></div><a href="/real-estate/add">＋ ახალი განცხადება</a></header>
    {notice && <div className="cabinet-notice"><span>✓</span><p>{notice}</p><button onClick={()=>setNotice("")}>×</button></div>}
    {brokerAccess?<section className="analytics-overview"><div className="analytics-copy"><span>VIP BROKER ანალიტიკა</span><strong>{total.toLocaleString()}</strong><small>ჯამური ნახვა</small><div className="trend neutral">შენი განცხადებების რეალური შედეგები</div></div><div className="broker-metric-list"><div><span>აქტიური</span><b>{items.length}</b></div><div><span>VIP / Turbo</span><b>{items.filter(x=>x.vipActive>0||x.turboActive>0).length}</b></div><div><span>საშუალო ნახვა</span><b>{items.length?Math.round(total/items.length):0}</b></div></div></section>:<section className="analytics-locked"><div><span>VIP</span></div><section><small>VIP BROKER</small><h2>გაფართოებული ანალიტიკა</h2><p>განცხადებების ნახვები და პორტფელის შედეგები ხელმისაწვდომია VIP Broker წევრებისთვის.</p></section><a href="/real-estate/vip-broker">VIP Broker-ის ნახვა</a></section>}
    <section className="cabinet-stats"><div><span>აქტიური განცხადება</span><b>{items.length}</b></div><div><span>VIP სტატუსი</span><b>{items.filter(item=>item.vipActive>0).length}</b></div><div><span>ჯამური ნახვები</span><b>{total.toLocaleString()}</b></div><div><span>უახლოესი ვადა</span><b>{items.length?Math.min(...items.map(item=>item.daysLeft)):0} დღე</b></div></section>
    <div className="cabinet-section-head"><div><span>ჩემი პორტფელი</span><h2>განცხადებების მართვა</h2></div></div>
    <section className="cabinet-list">{items.map(item => {
      const tone = timeTone(item.daysLeft);
      return <article key={item.slug} className={`managed-listing ${tone}`}>
        <div className="cabinet-photo"><Image unoptimized src={item.imageUrl||`/assets/concept/${item.image}.webp`} alt={item.title} fill/></div>
        <div className="cabinet-property-copy"><div className="cabinet-badges"><span className="active">აქტიური</span>{item.turboActive>0&&<span className="turbo">Turbo · {item.turboActive} დღე</span>}{item.vipActive>0&&<span className="vip">VIP · {item.vipActive} დღე</span>}</div><h2>{item.title}</h2><p>{item.location} · {item.area} მ² · {item.floor} სართული</p><strong>{item.price}</strong><div className="listing-lifetime"><div><span>განცხადების დარჩენილი დრო</span><b>{item.daysLeft} დღე</b></div><i><em style={{width:`${Math.min(100,(item.daysLeft/30)*100)}%`}}/></i><small>{tone==="safe"?"საკმარისი დროა დარჩენილი":tone==="warning"?"ვადის ნახევარზე ნაკლები დარჩა":"ვადა მალე იწურება"}</small></div></div>
        <aside className="listing-management compact-management">
          <b className="managed-views">{item.views.toLocaleString()} ნახვა</b>
          <CompactPromotion kind="turbo" days={item.turboDays} onChange={days=>update(item.slug,{turboDays:days})} onActivate={()=>activateTurbo(item)}/>
          <CompactPromotion kind="vip" days={item.vipDays} onChange={days=>update(item.slug,{vipDays:days})} onActivate={()=>activateVip(item)}/>
          <div className="compact-listing-actions">
            <button className="compact-renew" onClick={()=>renew(item.slug)} title="განცხადების ვადის განახლება 30 დღით">↻ განახლება · 0.25 ₾</button>
            <a href={`/real-estate/property/${item.slug}`}>ნახვა</a>
            <a href={`/real-estate/add?edit=${item.slug}`}>რედაქტირება</a>
            <button className="delete" onClick={()=>void remove(item)}>წაშლა</button>
          </div>
        </aside>
      </article>})}</section>
    {!items.length&&<div className="cabinet-empty cabinet-start"><span>＋</span><h2>ჯერ განცხადება არ გაქვს</h2><p>დაამატე პირველი უძრავი ქონება და აქ გამოჩნდება მისი მართვა, ვადა და რეალური სტატისტიკა.</p><a href="/real-estate/add">პირველი განცხადების დამატება</a></div>}
  </main>;
}

function CompactPromotion({kind,days,onChange,onActivate}:{kind:PromotionKind;days:number;onChange:(days:number)=>void;onActivate:()=>void}) {
  const quote=promotionQuote(kind,days);
  const label=kind==="turbo"?"Turbo":"VIP";
  return <div className={`cabinet-promotion cabinet-promotion-${kind}`}>
    <span className="compact-promo-name">{label}</span>
    <select aria-label={`${label} დღეები`} value={days} onChange={e=>onChange(Number(e.target.value))}>
      {vipOptions.map(d=><option key={d} value={d}>{d} დღე</option>)}
    </select>
    <div className="compact-promo-price" aria-live="polite"><strong>{quote.price} ₾</strong>{quote.saving>0&&<del>{quote.regular} ₾</del>}</div>
    <button onClick={onActivate} aria-label={`${label} ჩართვა ${days} დღით`}>ჩართვა</button>
    {quote.saving>0&&<div className="compact-promo-saving"><span>ზოგავ {quote.saving} ₾</span>{quote.badge&&<span>{quote.badge}</span>}</div>}
  </div>;
}
