"use client";
import {useState} from "react";
const USD_RATE=2.6125;
export default function CurrencyPrice({price}:{price:string}){
 const[usd,setUsd]=useState(false);const amount=Number(price.replace(/[^0-9.]/g,""));
 const value=usd&&amount?`$${Math.round(amount/USD_RATE).toLocaleString("en-US")}${price.includes("თვე")?" / თვე":""}`:price;
 return <div className="detail-price-row"><strong>{value}</strong><div className="currency-toggle"><button className={!usd?"active":""} onClick={()=>setUsd(false)}>₾</button><button className={usd?"active":""} onClick={()=>setUsd(true)}>$</button></div></div>
}
