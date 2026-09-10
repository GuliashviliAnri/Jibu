"use client";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "../page";
import { SESSION_KEY, authChanged, navigateApp, useAuth } from "../auth-client";

type Wallet={balance_tetri:number;currency:string};
type Transaction={id:string;amount_tetri:number;transaction_type:string;status:string;description:string|null;created_at:string};
const labels:Record<string,string>={top_up:"ბალანსის შევსება",listing_fee:"განცხადების განთავსება",vip:"VIP განცხადება",turbo:"Turbo განცხადება",refresh:"განცხადების განახლება",subscription:"წევრობა",refund:"თანხის დაბრუნება",adjustment:"ბალანსის კორექტირება"};
const money=(tetri=0)=>String((tetri/100).toLocaleString("ka-GE",{minimumFractionDigits:2,maximumFractionDigits:2}))+" ₾";

export default function ProfileDashboard({supabaseUrl,publishableKey}:{supabaseUrl:string;publishableKey:string}){
 const{user}=useAuth();const[wallet,setWallet]=useState<Wallet>({balance_tetri:0,currency:"GEL"});const[transactions,setTransactions]=useState<Transaction[]>([]);const[loading,setLoading]=useState(true);
 const[editing,setEditing]=useState(false);const[fullName,setFullName]=useState("");const[phone,setPhone]=useState("");const[saving,setSaving]=useState(false);const[editError,setEditError]=useState("");
 useEffect(()=>{setFullName(user?.user_metadata?.full_name||"");setPhone(user?.user_metadata?.phone||"")},[user?.id,user?.user_metadata?.full_name,user?.user_metadata?.phone]);
 useEffect(()=>{if(!user||!supabaseUrl||!publishableKey){setLoading(false);return}let cancelled=false;
  const load=async()=>{try{const saved=JSON.parse(localStorage.getItem(SESSION_KEY)||"null");if(!saved?.access_token)return;const headers={apikey:publishableKey,Authorization:"Bearer "+saved.access_token};
   const[w,t]=await Promise.all([
    fetch(supabaseUrl+"/rest/v1/wallets?select=balance_tetri,currency&user_id=eq."+user.id+"&limit=1",{headers,cache:"no-store"}),
    fetch(supabaseUrl+"/rest/v1/wallet_transactions?select=id,amount_tetri,transaction_type,status,description,created_at&user_id=eq."+user.id+"&order=created_at.desc&limit=20",{headers,cache:"no-store"})
   ]);
   if(w.ok){const rows=await w.json();if(!cancelled&&rows[0])setWallet(rows[0])}if(t.ok){const rows=await t.json();if(!cancelled&&Array.isArray(rows))setTransactions(rows)}
  }catch{}finally{if(!cancelled)setLoading(false)}};void load();return()=>{cancelled=true}},[user?.id,supabaseUrl,publishableKey]);
 const saveProfile=async()=>{if(!fullName.trim()){setEditError("სახელი და გვარი შეავსე.");return}setSaving(true);setEditError("");try{const saved=JSON.parse(localStorage.getItem(SESSION_KEY)||"null");if(!saved?.access_token||!supabaseUrl||!publishableKey)throw new Error("სესია ვერ მოიძებნა");const response=await fetch(supabaseUrl+"/auth/v1/user",{method:"PUT",headers:{apikey:publishableKey,Authorization:"Bearer "+saved.access_token,"Content-Type":"application/json"},body:JSON.stringify({data:{full_name:fullName.trim(),phone:phone.trim()}})});if(!response.ok)throw new Error("პროფილი ვერ შეინახა");const updated=await response.json();localStorage.setItem(SESSION_KEY,JSON.stringify({...saved,user:updated}));authChanged();setEditing(false)}catch(error){setEditError(error instanceof Error?error.message:"პროფილი ვერ შეინახა")}finally{setSaving(false)}};
 const name=user?.user_metadata?.full_name||user?.email?.split("@")[0]||"JIBU მომხმარებელი";const initials=useMemo(()=>name.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase(),[name]);
 return <main className="profile-dashboard">
  <header className="profile-dashboard-head"><div><span>ჩემი სივრცე</span><h1>გამარჯობა, {name.split(" ")[0]}</h1><p>მართე შენი ანგარიში, წევრობა და გადახდები ერთ სივრცეში.</p></div><a href="/real-estate/add">განცხადების დამატება</a></header>
  <section className="profile-overview">
   <article className="profile-identity-card"><div className="profile-large-avatar">{initials||"JI"}</div><div><small>JIBU ანგარიში</small><h2>{name}</h2><p>{user?.email}</p><span><i/> ანგარიში აქტიურია</span></div><div className="profile-account-actions"><button type="button" onClick={()=>setEditing(true)}>პროფილის რედაქტირება</button><button className="profile-logout" type="button" onClick={()=>{localStorage.removeItem(SESSION_KEY);authChanged();navigateApp("/account",true)}}>გასვლა</button></div></article>
   <article className="profile-wallet-card"><div className="profile-card-icon"><Icon name="wallet" size={23}/></div><small>JIBU საფულე</small><strong>{money(wallet.balance_tetri)}</strong><p>ხელმისაწვდომი ბალანსი</p><button type="button">ბალანსის შევსება</button></article>
   <article className="profile-black-card"><div className="black-orbit" aria-hidden/><span><Icon name="crown" size={17}/> JIBU BLACK</span><h2>გამორჩეული წევრობა</h2><p>სპეციალური შეთავაზებები, პრივილეგიები და მეტი შესაძლებლობა.</p><div><b>ჯერ არ არის აქტიური</b><button type="button">გაიგე მეტი</button></div></article>
  </section>
  <section className="profile-main-grid">
   <article className="profile-transactions"><header><div><span>ფინანსები</span><h2>ბოლო ტრანზაქციები</h2></div>{transactions.length>0&&<button type="button">ყველას ნახვა</button>}</header>
    {loading?<div className="transactions-pending" aria-hidden/>:transactions.length?<div className="transaction-list">{transactions.map(item=><div key={item.id}><span className={item.amount_tetri>=0?"income":"expense"}>{item.amount_tetri>=0?"+":"−"}</span><div><b>{item.description||labels[item.transaction_type]||"ტრანზაქცია"}</b><small>{new Date(item.created_at).toLocaleDateString("ka-GE",{day:"numeric",month:"long",year:"numeric"})}</small></div><strong className={item.amount_tetri>=0?"income":""}>{item.amount_tetri>=0?"+":"−"}{money(Math.abs(item.amount_tetri))}</strong></div>)}</div>:<div className="transactions-empty"><span><Icon name="wallet" size={24}/></span><h3>ტრანზაქციები ჯერ არ გაქვს</h3><p>ბალანსის შევსება და ყველა გადახდა აქ გამოჩნდება.</p></div>}
   </article>
   <aside className="profile-quick-panel"><span>სწრაფი მოქმედებები</span><h2>შენი JIBU</h2>
    <a href="/real-estate/cabinet"><Icon name="building" size={20}/><div><b>ჩემი განცხადებები</b><small>მართვა და ანალიტიკა</small></div><Icon name="arrow" size={17}/></a>
    <a href="#"><Icon name="heart" size={20}/><div><b>რჩეულები</b><small>შენახული განცხადებები</small></div><Icon name="arrow" size={17}/></a>
    <a href="#"><Icon name="bell" size={20}/><div><b>შეტყობინებები</b><small>სიახლეები და განახლებები</small></div><Icon name="arrow" size={17}/></a>
    <a href="#"><Icon name="settings" size={20}/><div><b>პარამეტრები</b><small>ანგარიში და უსაფრთხოება</small></div><Icon name="arrow" size={17}/></a>
   </aside>
  </section>
 {editing&&<div className="profile-edit-backdrop" onMouseDown={()=>!saving&&setEditing(false)}><section className="profile-edit-dialog" onMouseDown={event=>event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="profile-edit-title"><header><div><span>JIBU ანგარიში</span><h2 id="profile-edit-title">პროფილის რედაქტირება</h2></div><button type="button" disabled={saving} onClick={()=>setEditing(false)} aria-label="დახურვა">×</button></header><div className="profile-edit-fields"><label><span>სახელი და გვარი</span><input value={fullName} onChange={event=>setFullName(event.target.value)} placeholder="შენი სახელი და გვარი"/></label><label><span>ტელეფონის ნომერი</span><input value={phone} onChange={event=>setPhone(event.target.value)} inputMode="tel" placeholder="+995 5XX XX XX XX"/></label><label className="profile-email-field"><span>ელფოსტა</span><input value={user?.email||""} readOnly/><small>ელფოსტის შეცვლა უსაფრთხოების პარამეტრებიდან იქნება შესაძლებელი.</small></label>{editError&&<p className="profile-edit-error">{editError}</p>}</div><footer><button type="button" disabled={saving} onClick={()=>setEditing(false)}>გაუქმება</button><button className="profile-save" type="button" disabled={saving} onClick={saveProfile}>{saving?"ინახება…":"ცვლილებების შენახვა"}</button></footer></section></div>}
 </main>
}
