"use client";
import Image from "next/image";
import {useEffect,useMemo,useState} from "react";
import {Icon} from "../page";
import {categories,marketProducts,money,type MarketProduct} from "./data";

type Cart=Record<string,number>;
const KEY="jibu-market-cart";

function MarketImage({product,priority=false}:{product:MarketProduct;priority?:boolean}){
  return <Image unoptimized src="/assets/concept/marketplace-lifestyle.webp" alt={product.name} fill priority={priority} sizes="(max-width:640px) 48vw,(max-width:1100px) 30vw,22vw" className={`market-crop crop-${product.crop}`}/>;
}

export default function MarketplaceWorkspace(){
  const [query,setQuery]=useState("");
  const [category,setCategory]=useState("ყველაფერი");
  const [sort,setSort]=useState("recommended");
  const [cart,setCart]=useState<Cart>({});
  const [open,setOpen]=useState(false);
  const [ready,setReady]=useState(false);
  useEffect(()=>{try{setCart(JSON.parse(localStorage.getItem(KEY)||"{}"))}catch{}setReady(true)},[]);
  useEffect(()=>{if(ready)localStorage.setItem(KEY,JSON.stringify(cart))},[cart,ready]);
  const shown=useMemo(()=>{
    let items=marketProducts.filter(p=>(category==="ყველაფერი"||p.category===category)&&(`${p.name} ${p.seller}`.toLowerCase().includes(query.toLowerCase())));
    if(sort==="low")items=[...items].sort((a,b)=>a.price-b.price);
    if(sort==="high")items=[...items].sort((a,b)=>b.price-a.price);
    return items;
  },[query,category,sort]);
  const count=Object.values(cart).reduce((a,b)=>a+b,0);
  const total=marketProducts.reduce((sum,p)=>sum+(cart[p.id]||0)*p.price,0);
  const add=(id:string)=>{setCart(c=>({...c,[id]:(c[id]||0)+1}));setOpen(true)};
  const quantity=(id:string,value:number)=>setCart(c=>{const next={...c};if(value<=0)delete next[id];else next[id]=value;return next});

  return <main className="marketplace-main">
    <section className="market-intro">
      <div><span className="market-eyebrow">JIBU MARKETPLACE</span><h1>იპოვე ის, რაც შენს<br/>დღეს უკეთესს გახდის.</h1><p>შერჩეული ნივთები სანდო გამყიდველებისგან — ერთ მარტივ კალათაში.</p></div>
      <div className="market-hero-image"><Image unoptimized src="/assets/concept/marketplace-lifestyle.webp" alt="JIBU Marketplace-ის შერჩეული ნივთები" fill priority sizes="(max-width:760px) 100vw,48vw"/></div>
    </section>
    <section className="market-toolbar" aria-label="პროდუქტების ძიება და ფილტრები">
      <label className="market-search"><Icon name="search" size={20}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="მოძებნე პროდუქტი ან ბრენდი"/></label>
      <button className="market-cart-button" onClick={()=>setOpen(true)}><Icon name="bag" size={20}/><span>კალათა</span>{count>0&&<b>{count}</b>}</button>
    </section>
    <div className="market-filter-row">
      <div className="market-categories">{categories.map(c=><button className={c===category?"active":""} onClick={()=>setCategory(c)} key={c}>{c}</button>)}</div>
      <label className="market-sort">დალაგება<select value={sort} onChange={e=>setSort(e.target.value)}><option value="recommended">რეკომენდებული</option><option value="low">ფასი: დაბლიდან</option><option value="high">ფასი: მაღლიდან</option></select></label>
    </div>
    <div className="market-results"><div><h2>პროდუქტები</h2><span>{shown.length} ნივთი</span></div></div>
    {shown.length?<section className="market-grid">{shown.map((p,i)=><article className="market-product" key={p.id}>
      <a href={`/marketplace/product/${p.id}`} className="market-product-link"><div className="market-product-image"><MarketImage product={p} priority={i<3}/>{p.oldPrice&&<span>შეთავაზება</span>}</div><div className="market-product-copy"><small>{p.category} · {p.seller}</small><h3>{p.name}</h3><p>{p.location}</p><div><strong>{money(p.price)}</strong>{p.oldPrice&&<del>{money(p.oldPrice)}</del>}</div></div></a>
      <button className="market-add" onClick={()=>add(p.id)} aria-label={`${p.name} — კალათაში დამატება`}><span>კალათაში</span><b>+</b></button>
    </article>)}</section>:<div className="market-empty"><Icon name="search" size={28}/><h2>პროდუქტი ვერ მოიძებნა</h2><p>შეცვალე საძიებო სიტყვა ან აირჩიე სხვა კატეგორია.</p></div>}
    {open&&<><button className="market-backdrop" onClick={()=>setOpen(false)} aria-label="კალათის დახურვა"/><aside className="cart-drawer" aria-label="კალათა">
      <header><div><span>შენი კალათა</span><strong>{count} ნივთი</strong></div><button onClick={()=>setOpen(false)} aria-label="დახურვა">×</button></header>
      <div className="cart-list">{count===0?<div className="cart-empty"><span><Icon name="bag" size={28}/></span><h2>კალათა ცარიელია</h2><p>დაამატე სასურველი ნივთები და ისინი აქ გამოჩნდება.</p></div>:marketProducts.filter(p=>cart[p.id]).map(p=><div className="cart-item" key={p.id}><div className="cart-thumb"><MarketImage product={p}/></div><div className="cart-item-copy"><strong>{p.name}</strong><span>{money(p.price)}</span><div><button onClick={()=>quantity(p.id,cart[p.id]-1)}>−</button><b>{cart[p.id]}</b><button onClick={()=>quantity(p.id,cart[p.id]+1)}>+</button><button className="cart-remove" onClick={()=>quantity(p.id,0)}>წაშლა</button></div></div></div>)}</div>
      {count>0&&<footer><div><span>ჯამი</span><strong>{money(total)}</strong></div><button>შეკვეთის გაგრძელება</button><small>მიწოდების ღირებულება გამოითვლება შემდეგ ეტაპზე</small></footer>}
    </aside></>}
  </main>;
}
