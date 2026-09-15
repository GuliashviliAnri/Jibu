import { notFound } from "next/navigation";
import { Header, Icon, Sidebar } from "../../../page";
import AddToBrokerSheet from "./AddToBrokerSheet";
import PropertyGallery from "./PropertyGallery";
import CurrencyPrice from "./CurrencyPrice";
import PropertyLocationMap from "./PropertyLocationMap";

export function generateStaticParams() {
  return [];
}

async function remoteProperty(slug:string){
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return null;
  try{
    const response=await fetch(`${url}/rest/v1/property_catalog?slug=eq.${encodeURIComponent(slug)}&status=eq.active&select=*`,{headers:{apikey:key},cache:"no-store"});
    if(!response.ok)return null;
    const row=(await response.json())[0];if(!row)return null;
    const photoResponse=await fetch(`${url}/rest/v1/property_photos?property_id=eq.${row.id}&select=public_url&order=sort_order`,{headers:{apikey:key},cache:"no-store"});
    const photos=photoResponse.ok?(await photoResponse.json()).map((photo:{public_url:string})=>photo.public_url).filter(Boolean):[];
    return {slug:row.slug,photos,coverUrl:row.cover_url,tag:row.is_turbo?"TURBO":row.is_vip?"VIP":"ახალი",promotion:row.is_turbo?"turbo":row.is_vip?"vip":"standard",owner:row.publisher_kind==="owner",title:row.title,deal:row.deal_type==="rent"?"ქირავდება":"იყიდება",location:row.location_label,longitude:Number(row.longitude),latitude:Number(row.latitude),price:`${Number(row.price).toLocaleString("en-US")} ${row.currency==="USD"?"$":"₾"}`,area:String(row.area),beds:row.rooms?`${row.rooms} ოთახი`:row.property_type,phone:row.contact_phone,share:row.broker_share||"",floor:[row.floor,row.total_floors].filter((x:unknown)=>x!==null).join("/")||"—",bedrooms:String(row.bedrooms||0),views:Number(row.view_count)||0,description:row.description,contactName:row.contact_name};
  }catch{return null}
}

export default async function PropertyDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p:any = await remoteProperty(slug);
  if (!p) notFound();
  const mainPhoto = p.coverUrl||"/assets/property-placeholder.svg";
  return (
    <div className="app-shell real-estate-shell">
      <Sidebar active="real-estate" />
      <div className="page">
        <Header />
        <main className="property-detail">
          <nav className="detail-breadcrumb">
            <a href="/real-estate">უძრავი ქონება</a>
            <span>/</span>
            <b>{p.title}</b>
          </nav>
          <PropertyGallery title={p.title} main={mainPhoto} items={p.photos} />
          <section className="detail-content">
            <div>
              <div className="detail-status-line">
                <span className="detail-pill">{p.tag}</span>
                <span className="detail-views">
                  <b>◉</b>
                  {p.views.toLocaleString()} ნახვა
                </span>
              </div>
              <h1>{p.title}</h1>
              <p className="detail-location">
                <Icon name="location" size={17} />
                {p.location}
              </p>
              <div className="detail-facts">
                <span>
                  <b>{p.area} მ²</b> ფართობი
                </span>
                <span>
                  <b>{p.floor}</b> სართული
                </span>
                <span>
                  <b>{p.beds}</b> სივრცე
                </span>
                <span>
                  <b>{p.bedrooms}</b> საძინებელი
                </span>
              </div>
              <h2>ქონების შესახებ</h2>
              <p className="detail-description">{p.description}</p>
              <h2>მდებარეობა რუკაზე</h2>
              <PropertyLocationMap longitude={p.longitude} latitude={p.latitude} location={p.location}/>
            </div>
            <aside>
              <small>{p.deal}</small>
              <CurrencyPrice price={p.price} />
              <div className="listing-agent">
                <span>ან</span>
                <div>
                  <b>{p.contactName||"JIBU მომხმარებელი"}</b>
                  <small>განცხადების ავტორი</small>
                </div>
              </div>
              <a href={`tel:${p.phone.replaceAll(" ", "")}`}>{p.phone}</a>
              <AddToBrokerSheet property={p} />
              <p>განცხადება შემოწმებულია JIBU-ს მიერ</p>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}
