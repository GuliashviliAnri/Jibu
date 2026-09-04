"use client";
import Image from "next/image";
import {useState} from "react";
import {Icon} from "../../../page";
import {money,type MarketProduct} from "../../data";

export default function ProductDetail({product}:{product:MarketProduct}){
  const [added,setAdded]=useState(false);
  const add=()=>{let cart:Record<string,number>={};try{cart=JSON.parse(localStorage.getItem("jibu-market-cart")||"{}")}catch{}cart[product.id]=(cart[product.id]||0)+1;localStorage.setItem("jibu-market-cart",JSON.stringify(cart));setAdded(true)};
  return <main className="market-detail">
    <a className="market-back" href="/marketplace">← მარკეტპლეისი</a>
    <section>
      <div className={`market-detail-image crop-${product.crop}`}><Image unoptimized src="/assets/concept/marketplace-lifestyle.webp" alt={product.name} fill priority sizes="(max-width:760px) 100vw,52vw"/></div>
      <div className="market-detail-copy"><span>{product.category} · {product.seller}</span><h1>{product.name}</h1><p className="market-detail-place"><Icon name="location" size={17}/>{product.location}</p><div className="market-detail-price"><strong>{money(product.price)}</strong>{product.oldPrice&&<del>{money(product.oldPrice)}</del>}</div><p className="market-detail-description">შერჩეული ნივთი ყოველდღიური გამოყენებისთვის. დეტალური მდგომარეობა, მიწოდების პირობები და გამყიდველის ინფორმაცია შეკვეთის გაფორმებისას გამოჩნდება.</p><button onClick={add}>{added?"დამატებულია ✓":"კალათაში დამატება"}</button><div className="market-detail-notes"><span>უსაფრთხო შეკვეთა</span><span>სანდო გამყიდველი</span></div></div>
    </section>
  </main>;
}
