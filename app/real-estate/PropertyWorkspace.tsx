"use client";

import Image from "next/image";
import { useBrokerAccess } from "../auth-client";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {useRouter} from "next/navigation";
import { Icon } from "../page";
import type { PropertyListing } from "./property-data";
import { useListingRail } from "./use-listing-rail";

const locations:Record<string,string[]>={
  "თბილისი":["თბილისი"],
  "აჭარა":["ბათუმი","ქობულეთი","ხელვაჩაური","ქედა","შუახევი","ხულო"],
  "აფხაზეთი":["სოხუმი","გაგრა","გალი","გუდაუთა","ოჩამჩირე","ტყვარჩელი","ახალი ათონი"],
  "გურია":["ოზურგეთი","ლანჩხუთი","ჩოხატაური","ურეკი"],
  "იმერეთი":["ქუთაისი","ბაღდათი","ვანი","ზესტაფონი","თერჯოლა","სამტრედია","საჩხერე","ტყიბული","წყალტუბო","ჭიათურა","ხარაგაული","ხონი"],
  "კახეთი":["თელავი","ახმეტა","გურჯაანი","დედოფლისწყარო","ლაგოდეხი","საგარეჯო","სიღნაღი","ყვარელი","წნორი"],
  "მცხეთა-მთიანეთი":["მცხეთა","დუშეთი","თიანეთი","ყაზბეგი","გუდაური","ჟინვალი"],
  "რაჭა-ლეჩხუმი და ქვემო სვანეთი":["ამბროლაური","ონი","ცაგერი","ლენტეხი"],
  "სამეგრელო-ზემო სვანეთი":["ზუგდიდი","ფოთი","აბაშა","სენაკი","მარტვილი","მესტია","წალენჯიხა","ჩხოროწყუ","ხობი"],
  "სამცხე-ჯავახეთი":["ახალციხე","ახალქალაქი","ბორჯომი","ადიგენი","ასპინძა","ნინოწმინდა","ბაკურიანი"],
  "ქვემო ქართლი":["რუსთავი","ბოლნისი","გარდაბანი","დმანისი","თეთრიწყარო","მარნეული","წალკა","მანგლისი"],
  "შიდა ქართლი":["გორი","კასპი","ქარელი","ხაშური","სურამი","ცხინვალი"],
};
const districts:Record<string,string[]>={
  "თბილისი":["აბანოთუბანი","ავლაბარი","ვაკე","ვარკეთილი","ვერა","გლდანი","დიდი დიღომი","დიღომი","დიდუბე","ელისაბედის უბანი","ისანი","კრწანისი","კუკია","ლილო","ლოტკინი","მთაწმინდა","მუხიანი","ნაძალადევი","ნუცუბიძე","ორთაჭალა","პლატო","საბურთალო","სამგორი","სანზონა","სოლოლაკი","ჩუღურეთი","ცხნეთი","ვაშლიჯვარი","ვაზისუბანი","ზღვისუბანი","ლისი","ტაბახმელა","კოჯორი"],
  "ბათუმი":["ძველი ბათუმი","ახალი ბულვარი","ბაგრატიონი","აეროპორტის უბანი","ანგისა","ბონი-გოროდოკი","კახაბერი","მახინჯაური","მწვანე კონცხი","თამარი"],
  "ქუთაისი":["ქალაქის ცენტრი","ბალახვანი","საფიჩხია","ავანგარდი","ნიკეა","ჭომა","მუხნარი"],
};
const USD_RATE=2.6125;
function regionFor(location:string){const city=location.split(",")[0].trim();return Object.entries(locations).find(([,cities])=>cities.includes(city))?.[0]||""}
function displayPrice(price:string,currency:"GEL"|"USD"){
 if(currency==="GEL")return price;
 const amount=Number(price.replace(/[^0-9.]/g,""));
 if(!amount)return price;
 return `$${Math.round(amount/USD_RATE).toLocaleString("en-US")}${price.includes("თვე")?" / თვე":""}`;
}
function displayAreaPrice(price:number,currency:"GEL"|"USD"){
 const amount=currency==="USD"?Math.round(price/USD_RATE):price;
 return `${amount.toLocaleString(currency==="USD"?"en-US":"ka-GE")} ${currency==="USD"?"$":"₾"} / მ²`;
}

type Listing=PropertyListing;
export default function PropertyWorkspace({supabaseUrl,publishableKey}:{supabaseUrl:string;publishableKey:string}) {
  const router=useRouter();
  const brokerAccess = useBrokerAccess();
  const [allListings,setAllListings]=useState<Listing[]>([]);
  const [query, setQuery] = useState("");
  const [selectedLocations,setSelectedLocations]=useState<string[]>([]),[locationOpen,setLocationOpen]=useState(false),[minPrice,setMinPrice]=useState(""),[maxPrice,setMaxPrice]=useState(""),[minArea,setMinArea]=useState(""),[maxArea,setMaxArea]=useState(""),[currency,setCurrency]=useState<"GEL"|"USD">("GEL");
  const [ownerOnly, setOwnerOnly] = useState(false);
  const deferredQuery = useDeferredValue(query);
  useEffect(()=>{
    if(!supabaseUrl||!publishableKey)return;
    const controller=new AbortController();
    fetch(`${supabaseUrl}/rest/v1/property_catalog?select=slug,title,publisher_kind,deal_type,property_type,location_label,longitude,latitude,price,currency,area,rooms,bedrooms,floor,total_floors,contact_phone,broker_share,description,view_count,is_vip,is_turbo,cover_url&status=eq.active&order=published_at.desc`,{headers:{apikey:publishableKey},signal:controller.signal})
      .then(response=>response.ok?response.json():Promise.reject())
      .then((rows:any[])=>{const remote=rows.map(row=>({slug:row.slug,coverUrl:row.cover_url||undefined,tag:row.is_turbo?"TURBO":row.is_vip?"VIP":"ახალი",promotion:row.is_turbo?"turbo":row.is_vip?"vip":"standard",owner:row.publisher_kind==="owner",title:row.title,deal:row.deal_type==="rent"?"ქირავდება":"იყიდება",location:row.location_label,longitude:Number(row.longitude),latitude:Number(row.latitude),price:`${Number(row.price).toLocaleString("en-US")} ${row.currency==="USD"?"$":"₾"}`,area:String(row.area),beds:row.rooms?`${row.rooms} ოთახი`:row.property_type,phone:row.contact_phone,share:row.broker_share||"",floor:[row.floor,row.total_floors].filter((x:any)=>x!==null).join("/")||"—",bedrooms:String(row.bedrooms||0),views:Number(row.view_count)||0,description:row.description,photos:row.cover_url?[row.cover_url]:[],remote:true} as Listing));setAllListings(remote)}).catch(()=>{});
    return()=>controller.abort();
  },[supabaseUrl,publishableKey]);
  const shown = useMemo(
    () =>
      allListings.filter((x) => {
        const searchable=(x.title+x.location).toLowerCase();
        const price=Number(x.price.replace(/[^0-9.]/g,""));
        const area=Number(x.area);
        return searchable.includes(deferredQuery.toLowerCase())&&(!selectedLocations.length||selectedLocations.some(location=>x.location.includes(location)))&&(!minPrice||price>=Number(minPrice))&&(!maxPrice||price<=Number(maxPrice))&&(!minArea||area>=Number(minArea))&&(!maxArea||area<=Number(maxArea))&&(!ownerOnly||x.owner);
      }),
    [allListings,deferredQuery,selectedLocations,minPrice,maxPrice,minArea,maxArea,ownerOnly],
  );
  const turboRail = useListingRail(useMemo(() => shown.filter(p => p.promotion === "turbo"), [shown]));
  const vipRail = useListingRail(useMemo(() => shown.filter(p => p.promotion === "vip"), [shown]));
  const marketRows=useMemo(()=>{
    const grouped=new Map<string,{total:number;count:number}>();
    for(const item of allListings){
      if(item.deal!=="იყიდება")continue;
      const area=Number(item.area);
      const rawPrice=Number(item.price.replace(/[^0-9.]/g,""));
      if(!Number.isFinite(area)||area<=0||!Number.isFinite(rawPrice)||rawPrice<=0)continue;
      const district=Object.values(districts).flat().find(name=>item.location.includes(name));
      if(!district)continue;
      const priceInGel=item.price.includes("$")?rawPrice*USD_RATE:rawPrice;
      const current=grouped.get(district)||{total:0,count:0};
      grouped.set(district,{total:current.total+priceInGel/area,count:current.count+1});
    }
    return [...grouped.entries()].map(([district,value])=>({district,price:Math.round(value.total/value.count),count:value.count})).sort((a,b)=>b.count-a.count).slice(0,4);
  },[allListings]);
  const addListing = (p: Listing) =>
    brokerAccess && window.dispatchEvent(new CustomEvent("jibu:add-property", { detail: p }));
  return (
    <main className="re-main">
      <section className="re-intro">
        <div>
          <span>JIBU REAL ESTATE</span>
          <h1>
            იპოვე სივრცე,
            <br />
            <em>რომელიც შენ გგავს.</em>
          </h1>
          <p>
            შერჩეული უძრავი ქონება, სანდო განცხადებები და თანამედროვე ძიების
            გამოცდილება ერთ სივრცეში.
          </p>
        </div>
        <div className="re-stats">
          <div>
            <strong>{allListings.length.toLocaleString("ka-GE")}</strong>
            <span>აქტიური განცხადება</span>
          </div>
        </div>
      </section>
      <section className="re-search-panel">
        <label className="re-query">
          <Icon name="search" size={19} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ქალაქი, უბანი ან პროექტი"
          />
        </label>
        <div className="location-filter-wrap"><button className={`location-filter-trigger ${locationOpen?"open":""}`} onClick={()=>setLocationOpen(value=>!value)}><span>{selectedLocations.length?`${selectedLocations.length} მდებარეობა არჩეულია`:"მდებარეობა"}</span><i>⌄</i></button>{locationOpen&&<div className="location-filter-popover"><header><div><b>აირჩიე მდებარეობა</b><small>შეგიძლია რამდენიმე უბანი მონიშნო</small></div><button onClick={()=>setLocationOpen(false)}>×</button></header><div className="location-groups">{Object.entries(districts).map(([city,areas])=><section key={city}><label className="city-check"><input type="checkbox" checked={selectedLocations.includes(city)} onChange={()=>setSelectedLocations(current=>current.includes(city)?current.filter(item=>item!==city):[...current,city])}/><span>{city}</span></label><div>{areas.map(area=><label key={area}><input type="checkbox" checked={selectedLocations.includes(area)} onChange={()=>setSelectedLocations(current=>current.includes(area)?current.filter(item=>item!==area):[...current,area])}/><span>{area}</span></label>)}</div></section>)}</div><footer><button onClick={()=>setSelectedLocations([])}>გასუფთავება</button><button className="apply-locations" onClick={()=>setLocationOpen(false)}>არჩევის დადასტურება · {selectedLocations.length}</button></footer></div>}</div>
        <label className="filter-range"><span>ფასი, ₾</span><div><input inputMode="numeric" placeholder="დან" value={minPrice} onChange={e=>setMinPrice(e.target.value.replace(/\D/g,""))}/><i>—</i><input inputMode="numeric" placeholder="მდე" value={maxPrice} onChange={e=>setMaxPrice(e.target.value.replace(/\D/g,""))}/></div></label>
        <label className="filter-range"><span>ფართობი, მ²</span><div><input inputMode="numeric" placeholder="დან" value={minArea} onChange={e=>setMinArea(e.target.value.replace(/\D/g,""))}/><i>—</i><input inputMode="numeric" placeholder="მდე" value={maxArea} onChange={e=>setMaxArea(e.target.value.replace(/\D/g,""))}/></div></label>
        <div className="currency-toggle" aria-label="ვალუტა"><button className={currency==="GEL"?"active":""} onClick={()=>setCurrency("GEL")}>₾</button><button className={currency==="USD"?"active":""} onClick={()=>setCurrency("USD")}>$</button></div>
        <button className={`owner-filter ${ownerOnly?"active":""}`} aria-label="მხოლოდ მესაკუთრისგან" aria-pressed={ownerOnly} onClick={()=>setOwnerOnly(value=>!value)}><span aria-hidden="true">◆</span> მესაკუთრისგან</button>
      </section>
      <div className="filter-summary"><span>{shown.length} განცხადება მოიძებნა</span><small>1 USD = {USD_RATE} ₾ · ეროვნული ბანკის ოფიციალური კურსი</small>{(query||selectedLocations.length||minPrice||maxPrice||minArea||maxArea||ownerOnly)&&<button onClick={()=>{setQuery("");setSelectedLocations([]);setMinPrice("");setMaxPrice("");setMinArea("");setMaxArea("");setOwnerOnly(false)}}>ფილტრების გასუფთავება</button>}</div>
      <section className="re-types">
        {[
          ["building", "ბინები"],
          ["home", "სახლები"],
          ["briefcase", "კომერციული"],
          ["crown", "ახალი პროექტები"],
        ].map(([i, t]) => (
          <button key={t}>
            <span>
              <Icon name={i as "building"} size={22} />
            </span>
            <b>{t}</b>
            <small>დათვალიერება</small>
          </button>
        ))}
      </section>
      <div className="re-title">
        <div>
          <h2>{turboRail.items.length?"Turbo განცხადებები":"განცხადებები"}</h2>
        </div>
        <div className="re-page-actions">
          <a className="vip-link" href="/real-estate/vip-broker">
            VIP Broker · უფასო ბეტა
          </a>
          <a href="/real-estate/cabinet">ჩემი განცხადებები</a>
          <a className="primary" href="/real-estate/add">
            განცხადების დადება
          </a>
        </div>
      </div>
      {turboRail.items.length>0&&<div className="promotion-carousel"><button className="rail-arrow rail-prev" aria-label="წინა Turbo განცხადებები" onClick={()=>turboRail.move(-1)}>‹</button><section className="re-grid promotion-rail" ref={turboRail.ref}>
        {turboRail.items.map((p) => (
          <article
            className={`re-card clickable ${p.owner ? "owner-listing" : ""}`}
            tabIndex={0}
            role="link"
            onClick={() => router.push(`/real-estate/property/${p.slug}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                router.push(`/real-estate/property/${p.slug}`);
            }}
            key={p.slug}
          >
            <div className="re-photo">
              <Image
                unoptimized
                src={p.coverUrl||"/assets/property-placeholder.svg"}
                alt={p.title}
                fill
                sizes="(max-width:760px) 100vw,33vw"
              />
              <span>{p.tag}</span>
              {p.owner && <b className="owner-badge">მესაკუთრე</b>}
              <button
                onClick={(e) => e.stopPropagation()}
                aria-label="რჩეულებში"
              >
                <Icon name="heart" size={18} />
              </button>
            </div>
            <div className="re-card-body">
              <small>
                <Icon name="location" size={13} />
                {p.location}
              </small>
              <h3>{p.title}</h3>
              <div className="re-facts">
                <span>{p.beds}</span>
                <span>{p.area} მ²</span>
                <span>სართული {p.floor}</span>
              </div>
              <div className="card-views">{p.views.toLocaleString()} ნახვა</div>
              <footer>
                <strong>{displayPrice(p.price,currency)}</strong>
                <button
                  className="add-to-excel"
                  aria-disabled={!brokerAccess}
                  title={!brokerAccess ? "საჭიროა აქტიური VIP Broker" : "ცხრილში დამატება"}
                  onClick={(e) => {
                    e.stopPropagation();
                    addListing(p);
                  }}
                >
                  ცხრილში დამატება
                </button>
              </footer>
            </div>
          </article>
        ))}
      </section><button className="rail-arrow rail-next" aria-label="შემდეგი Turbo განცხადებები" onClick={()=>turboRail.move(1)}>›</button></div>}
      {marketRows.length>0&&<section className="neighborhood-market">
        <header><div><span>მხოლოდ გასაყიდი ბინები</span><h2>უბნების მიმდინარე საშუალო ფასი</h2><p>რეალური განცხადებებიდან დათვლილი ფასი ერთ კვადრატულ მეტრზე.</p></div></header>
        <div className="neighborhood-market-grid">{marketRows.map(row=><article key={row.district}><div><span>{row.district}</span><b>{row.count} განცხადება</b></div><strong>{displayAreaPrice(row.price,currency)}</strong><small>მიმდინარე განცხადებების საშუალო ფასი</small></article>)}</div>
        <footer><span>რეალური მონაცემები</span><small>მაჩვენებელი ავტომატურად განახლდება ახალი განცხადებების დამატებისას.</small></footer>
      </section>}
      {vipRail.items.length>0&&<><div className="re-title promotion-title vip-section-title"><div><h2>VIP განცხადებები</h2></div></div>
      <div className="promotion-carousel"><button className="rail-arrow rail-prev" aria-label="წინა VIP განცხადებები" onClick={()=>vipRail.move(-1)}>‹</button><section className="re-grid vip-listing-grid promotion-rail" ref={vipRail.ref}>
        {vipRail.items.map((p) => (
          <article className={`re-card clickable vip-listing ${p.owner ? "owner-listing" : ""}`} tabIndex={0} role="link" onClick={() => router.push(`/real-estate/property/${p.slug}`)} onKeyDown={(e) => {if (e.key === "Enter") router.push(`/real-estate/property/${p.slug}`);}} key={p.title}>
            <div className="re-photo"><Image unoptimized src={p.coverUrl||"/assets/property-placeholder.svg"} alt={p.title} fill sizes="(max-width:760px) 100vw,33vw"/><span>{p.tag}</span>{p.owner && <b className="owner-badge">მესაკუთრე</b>}<button onClick={(e) => e.stopPropagation()} aria-label="რჩეულებში"><Icon name="heart" size={18}/></button></div>
<div className="re-card-body"><small><Icon name="location" size={13}/>{p.location}</small><h3>{p.title}</h3><div className="re-facts"><span>{p.beds}</span><span>{p.area} მ²</span><span>სართული {p.floor}</span></div><div className="card-views">{p.views.toLocaleString()} ნახვა</div><footer><strong>{displayPrice(p.price,currency)}</strong><button className="add-to-excel" aria-disabled={!brokerAccess} title={!brokerAccess ? "საჭიროა აქტიური VIP Broker" : "ცხრილში დამატება"} onClick={(e)=>{e.stopPropagation();addListing(p)}}>ცხრილში დამატება</button></footer></div>
          </article>
        ))}
      </section><button className="rail-arrow rail-next" aria-label="შემდეგი VIP განცხადებები" onClick={()=>vipRail.move(1)}>›</button></div></>}
      {shown.some(p=>p.promotion==="standard")&&<><div className="re-title promotion-title"><div><h2>ახალი განცხადებები</h2></div></div><section className="re-grid vip-listing-grid">{shown.filter(p=>p.promotion==="standard").map(p=><article className={`re-card clickable ${p.owner?"owner-listing":""}`} tabIndex={0} role="link" onClick={()=>router.push(`/real-estate/property/${p.slug}`)} onKeyDown={e=>{if(e.key==="Enter")router.push(`/real-estate/property/${p.slug}`)}} key={p.slug}><div className="re-photo"><Image unoptimized src={p.coverUrl||"/assets/property-placeholder.svg"} alt={p.title} fill sizes="(max-width:760px) 100vw,33vw"/><span>{p.tag}</span>{p.owner&&<b className="owner-badge">მესაკუთრე</b>}</div><div className="re-card-body"><small><Icon name="location" size={13}/>{p.location}</small><h3>{p.title}</h3><div className="re-facts"><span>{p.beds}</span><span>{p.area} მ²</span><span>სართული {p.floor}</span></div><div className="card-views">{p.views.toLocaleString()} ნახვა</div><footer><strong>{displayPrice(p.price,currency)}</strong></footer></div></article>)}</section></>}
      {shown.length===0&&<section className="re-empty-listings"><span><Icon name="building" size={26}/></span><h2>{allListings.length?"ამ ფილტრით განცხადება ვერ მოიძებნა":"განცხადებები ჯერ არ დამატებულა"}</h2><p>{allListings.length?"შეცვალე ან გაასუფთავე ფილტრები და თავიდან სცადე.":"დაამატეთ პირველი რეალური ქონება — გამოქვეყნებისთანავე ის კატალოგსა და რუკაზე გამოჩნდება."}</p>{!allListings.length&&<a href="/real-estate/add">პირველი განცხადების დამატება</a>}</section>}
    </main>
  );
}
